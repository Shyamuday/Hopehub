import { createVerify } from 'node:crypto';
import { EmailSuppressionReason } from '@prisma/client';
import { suppressMarketingEmail } from './email-marketing.js';

type SnsMessage = {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
};

type SesFeedback = {
  notificationType?: string;
  eventType?: string;
  bounce?: {
    bounceType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string }>;
  };
  complaint?: { complainedRecipients?: Array<{ emailAddress?: string }> };
};

const certificateCache = new Map<string, { value: string; expiresAt: number }>();

function snsUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/i.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function allowedTopic(topicArn: string | undefined) {
  if (!topicArn) return false;
  const allowed = new Set(
    (process.env.EMAIL_MARKETING_SES_SNS_TOPIC_ARNS || '')
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return allowed.has(topicArn);
}

export function snsSignatureContent(message: SnsMessage) {
  const fields =
    message.Type === 'Notification'
      ? [
          'Message',
          'MessageId',
          ...(message.Subject ? ['Subject'] : []),
          'Timestamp',
          'TopicArn',
          'Type'
        ]
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
  return fields.map((field) => `${field}\n${message[field as keyof SnsMessage] || ''}\n`).join('');
}

async function signingCertificate(urlValue: string) {
  const cached = certificateCache.get(urlValue);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const url = snsUrl(urlValue);
  if (!url || !url.pathname.endsWith('.pem')) throw new Error('INVALID_SNS_CERTIFICATE_URL');
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('SNS_CERTIFICATE_UNAVAILABLE');
  const value = await response.text();
  if (!value.includes('BEGIN CERTIFICATE') || value.length > 20_000) {
    throw new Error('INVALID_SNS_CERTIFICATE');
  }
  certificateCache.set(urlValue, { value, expiresAt: Date.now() + 6 * 60 * 60_000 });
  return value;
}

export async function verifySnsMessage(message: SnsMessage) {
  if (!allowedTopic(message.TopicArn)) return false;
  if (!['1', '2'].includes(message.SignatureVersion || '') || !message.Signature) return false;
  const certificate = await signingCertificate(message.SigningCertURL || '');
  const verifier = createVerify(message.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1');
  verifier.update(snsSignatureContent(message), 'utf8');
  verifier.end();
  return verifier.verify(certificate, message.Signature, 'base64');
}

export function sesFeedbackSuppressions(feedback: SesFeedback) {
  const type = feedback.notificationType || feedback.eventType;
  if (type === 'Bounce' && feedback.bounce?.bounceType === 'Permanent') {
    return (feedback.bounce.bouncedRecipients || [])
      .map((recipient) => recipient.emailAddress?.trim())
      .filter((email): email is string => Boolean(email))
      .map((email) => ({ email, reason: EmailSuppressionReason.HARD_BOUNCE }));
  }
  if (type === 'Complaint') {
    return (feedback.complaint?.complainedRecipients || [])
      .map((recipient) => recipient.emailAddress?.trim())
      .filter((email): email is string => Boolean(email))
      .map((email) => ({ email, reason: EmailSuppressionReason.COMPLAINT }));
  }
  return [];
}

export async function processSesSnsMessage(message: SnsMessage) {
  if (!(await verifySnsMessage(message))) throw new Error('INVALID_SNS_SIGNATURE');
  if (message.Type === 'SubscriptionConfirmation') {
    const url = snsUrl(message.SubscribeURL);
    if (!url) throw new Error('INVALID_SNS_SUBSCRIBE_URL');
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('SNS_SUBSCRIPTION_CONFIRMATION_FAILED');
    return { confirmed: true, suppressed: 0 };
  }
  if (message.Type !== 'Notification' || !message.Message) {
    return { confirmed: false, suppressed: 0 };
  }
  const feedback = JSON.parse(message.Message) as SesFeedback;
  const suppressions = sesFeedbackSuppressions(feedback);
  for (const suppression of suppressions) {
    await suppressMarketingEmail({
      ...suppression,
      source: `aws_ses_sns:${message.MessageId || 'unknown'}`
    });
  }
  return { confirmed: false, suppressed: suppressions.length };
}
