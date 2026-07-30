import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

const CONTACT_MAIL_BUCKET = process.env.CONTACT_MAIL_BUCKET || 'hopehub-contact-inbox';
const CONTACT_MAIL_PREFIX = process.env.CONTACT_MAIL_PREFIX || 'contact/';
const CONTACT_MAIL_REGION =
  process.env.CONTACT_MAIL_REGION ||
  process.env.ASSET_BUCKET_REGION ||
  process.env.AWS_REGION ||
  'us-east-1';

const s3 = new S3Client({ region: CONTACT_MAIL_REGION });

export type ContactMailSummary = {
  id: string;
  key: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string | null;
  size: number;
  receivedAt: string | null;
  preview: string;
};

export type ContactMailDetail = ContactMailSummary & {
  text: string;
  html: string;
  rawHeaders: Record<string, string>;
};

function idForKey(key: string) {
  return Buffer.from(key).toString('base64url');
}

export function keyForContactMailId(id: string) {
  return Buffer.from(id, 'base64url').toString('utf8');
}

function unfoldHeaders(rawHeaders: string) {
  return rawHeaders.replace(/\r?\n[ \t]+/g, ' ');
}

function parseHeaders(raw: string) {
  const headers: Record<string, string> = {};
  for (const line of unfoldHeaders(raw).split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }
  return headers;
}

function decodeMimeWords(value: string) {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_match, charset, encoding, text) => {
    try {
      const normalizedCharset = String(charset).toLowerCase();
      if (normalizedCharset !== 'utf-8' && normalizedCharset !== 'us-ascii') return text;
      if (String(encoding).toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString('utf8');
      }
      return Buffer.from(
        String(text)
          .replace(/_/g, ' ')
          .replace(/=([0-9a-fA-F]{2})/g, (_hexMatch: string, hex: string) =>
            String.fromCharCode(parseInt(hex, 16))
          ),
        'binary'
      ).toString('utf8');
    } catch {
      return text;
    }
  });
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9a-fA-F]{2})/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitHeaderBody(raw: string) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const index = normalized.indexOf('\n\n');
  if (index < 0) return { headersRaw: normalized, bodyRaw: '' };
  return {
    headersRaw: normalized.slice(0, index),
    bodyRaw: normalized.slice(index + 2)
  };
}

function boundaryFromContentType(contentType: string) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  return match?.[1] || match?.[2] || '';
}

function decodeBody(body: string, transferEncoding: string) {
  const encoding = transferEncoding.toLowerCase();
  if (encoding.includes('base64')) {
    try {
      return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
    } catch {
      return body;
    }
  }
  if (encoding.includes('quoted-printable')) return decodeQuotedPrintable(body);
  return body.trim();
}

function extractBody(
  headers: Record<string, string>,
  bodyRaw: string
): { text: string; html: string } {
  const contentType = headers['content-type'] || '';
  const boundary = boundaryFromContentType(contentType);
  if (!boundary) {
    const decoded = decodeBody(bodyRaw, headers['content-transfer-encoding'] || '');
    return contentType.toLowerCase().includes('html')
      ? { text: stripHtml(decoded), html: decoded }
      : { text: decoded, html: '' };
  }

  let text = '';
  let html = '';
  for (const part of bodyRaw.split(`--${boundary}`)) {
    if (!part.trim() || part.trim() === '--') continue;
    const { headersRaw, bodyRaw: partBodyRaw } = splitHeaderBody(part.trim());
    const partHeaders = parseHeaders(headersRaw);
    const partType = (partHeaders['content-type'] || '').toLowerCase();
    const decoded = decodeBody(partBodyRaw, partHeaders['content-transfer-encoding'] || '');
    if (!text && partType.includes('text/plain')) text = decoded.trim();
    if (!html && partType.includes('text/html')) html = decoded.trim();
  }

  return { text: text || stripHtml(html), html };
}

function emailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().replace(/^mailto:/i, '');
}

function previewFrom(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

async function readObjectBody(key: string) {
  const object = await s3.send(new GetObjectCommand({ Bucket: CONTACT_MAIL_BUCKET, Key: key }));
  const bytes = await object.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []).toString('utf8');
}

export async function listContactMail(limit = 50): Promise<ContactMailSummary[]> {
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: CONTACT_MAIL_BUCKET,
      Prefix: CONTACT_MAIL_PREFIX,
      MaxKeys: Math.min(100, Math.max(1, limit))
    })
  );

  const objects = (result.Contents || [])
    .filter((item) => item.Key && !item.Key.endsWith('AMAZON_SES_SETUP_NOTIFICATION'))
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
    .slice(0, limit);

  const messages = await Promise.all(
    objects.map(async (item) => {
      const key = item.Key!;
      const detail = await getContactMail(key);
      return {
        ...detail,
        text: undefined,
        html: undefined,
        rawHeaders: undefined
      } as unknown as ContactMailSummary;
    })
  );

  return messages;
}

export async function getContactMail(key: string): Promise<ContactMailDetail> {
  if (!key.startsWith(CONTACT_MAIL_PREFIX)) {
    throw new Error('INVALID_MAIL_KEY');
  }
  const raw = await readObjectBody(key);
  const { headersRaw, bodyRaw } = splitHeaderBody(raw);
  const headers = parseHeaders(headersRaw);
  const subject = decodeMimeWords(headers.subject || '(no subject)');
  const from = decodeMimeWords(headers.from || '');
  const to = decodeMimeWords(headers.to || '');
  const date = headers.date ? new Date(headers.date).toISOString() : null;
  const { text, html } = extractBody(headers, bodyRaw);

  return {
    id: idForKey(key),
    key,
    from,
    fromEmail: emailAddress(from),
    to,
    subject,
    date,
    size: Buffer.byteLength(raw),
    receivedAt: date,
    preview: previewFrom(text || stripHtml(html)),
    text,
    html,
    rawHeaders: headers
  };
}
