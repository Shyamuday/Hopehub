import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  assetObjectUrl,
  deleteAssetObject,
  readAssetObject,
  writeAssetObject
} from './asset-storage.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

export async function savePatientDailyPlanImage(input: {
  userId: string;
  planId: string;
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
  const storageKey = `patient-daily-plans/${input.userId}/${input.planId}/${randomUUID()}${ext}`;
  await writeAssetObject({ storageKey, body: buffer, contentType: input.mimeType });

  return {
    storageKey,
    imageUrl: assetObjectUrl(storageKey),
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    mimeType: input.mimeType
  };
}

export function readPatientDailyPlanImage(storageKey: string) {
  return readAssetObject(storageKey);
}

export function deletePatientDailyPlanImage(storageKey: string) {
  return deleteAssetObject(storageKey);
}

export function patientDailyPlanImagePath(imageId: string) {
  return `/patient/daily-plan-images/${imageId}`;
}
