import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'clinical-media');
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

export async function saveClinicalMediaFile(input: {
  patientId: string;
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

  const dir = path.join(UPLOAD_ROOT, input.patientId);
  await mkdir(dir, { recursive: true });

  const ext = extensionForMime(input.mimeType) || path.extname(input.fileName || '') || '.bin';
  const storageKey = `${input.patientId}/${randomUUID()}${ext}`;
  const absolutePath = path.join(UPLOAD_ROOT, storageKey);
  await writeFile(absolutePath, buffer);

  return {
    storageKey,
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex')
  };
}

export async function readClinicalMediaFile(storageKey: string) {
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(UPLOAD_ROOT, normalized);
  if (!absolutePath.startsWith(UPLOAD_ROOT)) {
    throw new Error('INVALID_STORAGE_KEY');
  }
  return readFile(absolutePath);
}

export async function deleteClinicalMediaFile(storageKey: string) {
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(UPLOAD_ROOT, normalized);
  if (!absolutePath.startsWith(UPLOAD_ROOT)) {
    throw new Error('INVALID_STORAGE_KEY');
  }
  await unlink(absolutePath).catch(() => undefined);
}
