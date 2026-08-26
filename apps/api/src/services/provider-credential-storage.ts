import crypto from 'node:crypto';
import path from 'node:path';
import { deleteAssetObject, readAssetObject, writeAssetObject } from './asset-storage.js';

export const MAX_PROVIDER_CREDENTIAL_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

export async function saveProviderCredential(input: {
  userId: string;
  mimeType: string;
  fileName: string;
  data: Buffer;
}) {
  const extension = MIME_EXTENSIONS[input.mimeType];
  if (!extension) throw new Error('UNSUPPORTED_MIME');
  if (!input.data.length) throw new Error('EMPTY_FILE');
  if (input.data.length > MAX_PROVIDER_CREDENTIAL_BYTES) throw new Error('FILE_TOO_LARGE');
  const safeName = path.basename(input.fileName || `credential${extension}`).slice(0, 180);
  const storageKey = `provider-credentials/${input.userId}/${crypto.randomUUID()}${extension}`;
  await writeAssetObject({
    storageKey,
    body: input.data,
    contentType: input.mimeType,
    metadata: { ownerId: input.userId, originalName: encodeURIComponent(safeName) }
  });
  return { storageKey, fileName: safeName, mimeType: input.mimeType, byteSize: input.data.length };
}

export const readProviderCredential = readAssetObject;
export const deleteProviderCredential = deleteAssetObject;
