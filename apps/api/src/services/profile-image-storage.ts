import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  assetPublicUrl,
  assetObjectUrl,
  deletePublicAssetObject,
  deleteAssetObject,
  readPublicAssetObject,
  readAssetObject,
  writePublicAssetObject
} from './asset-storage.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'profile-images');
const MAX_BYTES = 2 * 1024 * 1024;
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

export async function saveUserProfileImage(input: {
  userId: string;
  mimeType: string;
  fileName?: string | null;
  data: Buffer;
  uploadedById?: string;
}) {
  return saveProfileImage('users', input.userId, input);
}

export async function saveStoreStaffProfileImage(input: {
  staffId: string;
  mimeType: string;
  fileName?: string | null;
  data: Buffer;
  uploadedById?: string;
}) {
  return saveProfileImage('store-staff', input.staffId, input);
}

async function saveProfileImage(
  scope: 'users' | 'store-staff',
  ownerId: string,
  input: { mimeType: string; fileName?: string | null; data: Buffer; uploadedById?: string }
) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error('UNSUPPORTED_MIME');
  }

  const buffer = input.data;
  if (!buffer.length) throw new Error('EMPTY_FILE');
  if (buffer.length > MAX_BYTES) throw new Error('FILE_TOO_LARGE');

  const ext = extensionForMime(input.mimeType) || path.extname(input.fileName || '') || '.bin';
  const storageKey = `profile-images/${scope}/${ownerId}/${randomUUID()}${ext}`;
  // Profile photos used on public provider listings belong in the public asset bucket.
  // The helper still falls back to the configured asset bucket for older environments.
  await writePublicAssetObject({
    storageKey,
    body: buffer,
    contentType: input.mimeType,
    metadata: {
      context: 'profile-image',
      scope,
      ownerId,
      uploadedById: input.uploadedById || ownerId,
      originalFileName: input.fileName || ''
    }
  });

  return {
    storageKey,
    imageUrl: assetPublicUrl(storageKey) ?? assetObjectUrl(storageKey),
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    mimeType: input.mimeType
  };
}

export async function readProfileImageFile(storageKey: string) {
  const legacyRoot = storageKey.startsWith('profile-images/') ? undefined : UPLOAD_ROOT;
  try {
    return await readPublicAssetObject(storageKey, legacyRoot);
  } catch {
    return readAssetObject(storageKey, legacyRoot);
  }
}

export async function deleteProfileImageFile(storageKey: string) {
  const legacyRoot = storageKey.startsWith('profile-images/') ? undefined : UPLOAD_ROOT;
  await Promise.all([
    deletePublicAssetObject(storageKey, legacyRoot),
    deleteAssetObject(storageKey, legacyRoot)
  ]);
}

export function profileImageMimeType(storageKey: string) {
  const ext = path.extname(storageKey).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}
