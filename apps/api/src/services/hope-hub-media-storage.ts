import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { assetPublicUrl, readPublicAssetObject, writePublicAssetObject } from './asset-storage.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return '.mp3';
    case 'audio/mp4':
    case 'audio/aac':
      return '.m4a';
    case 'audio/wav':
      return '.wav';
    case 'audio/webm':
      return '.webm';
    case 'video/mp4':
      return '.mp4';
    case 'video/webm':
      return '.webm';
    case 'video/quicktime':
      return '.mov';
    default:
      return '';
  }
}

function safeExtension(fileName?: string | null) {
  const ext = path.extname(fileName || '').toLowerCase();
  return /^[a-z0-9.]{2,10}$/.test(ext) ? ext : '';
}

export function hopeHubMediaFilePath(storageKey: string) {
  return `/hope-hub/media/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

export async function saveHopeHubMedia(input: {
  mimeType: string;
  fileName?: string | null;
  dataBase64: string;
}) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error('UNSUPPORTED_MIME');
  }

  const buffer = Buffer.from(input.dataBase64, 'base64');
  if (!buffer.length) throw new Error('EMPTY_FILE');
  if (buffer.length > MAX_BYTES) throw new Error('FILE_TOO_LARGE');

  const ext = extensionForMime(input.mimeType) || safeExtension(input.fileName) || '.bin';
  const storageKey = `hope-hub-media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
  await writePublicAssetObject({ storageKey, body: buffer, contentType: input.mimeType });

  return {
    storageKey,
    fileUrl: assetPublicUrl(storageKey) ?? hopeHubMediaFilePath(storageKey),
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    mimeType: input.mimeType
  };
}

export async function readHopeHubMediaFile(storageKey: string) {
  return readPublicAssetObject(storageKey);
}

export function hopeHubMediaMimeType(storageKey: string) {
  const ext = path.extname(storageKey).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a' || ext === '.aac') return 'audio/mp4';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
}
