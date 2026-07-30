import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { deleteAssetObject, readAssetObject, writeAssetObject } from './asset-storage.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'clinical-media');
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
]);

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
    case 'application/pdf':
      return '.pdf';
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

  const ext = extensionForMime(input.mimeType) || path.extname(input.fileName || '') || '.bin';
  const storageKey = `clinical-media/${input.patientId}/${randomUUID()}${ext}`;
  await writeAssetObject({ storageKey, body: buffer, contentType: input.mimeType });

  return {
    storageKey,
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex')
  };
}

export async function readClinicalMediaFile(storageKey: string) {
  return readAssetObject(
    storageKey,
    storageKey.startsWith('clinical-media/') ? undefined : UPLOAD_ROOT
  );
}

export async function deleteClinicalMediaFile(storageKey: string) {
  await deleteAssetObject(
    storageKey,
    storageKey.startsWith('clinical-media/') ? undefined : UPLOAD_ROOT
  );
}
