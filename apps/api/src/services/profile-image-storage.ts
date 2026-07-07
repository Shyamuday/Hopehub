import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

function assertSafeKey(storageKey: string, root: string) {
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(root, normalized);
  if (!absolutePath.startsWith(root)) {
    throw new Error('INVALID_STORAGE_KEY');
  }
  return { normalized, absolutePath };
}

export async function saveUserProfileImage(input: {
  userId: string;
  mimeType: string;
  fileName?: string | null;
  dataBase64: string;
}) {
  return saveProfileImage('users', input.userId, input);
}

export async function saveStoreStaffProfileImage(input: {
  staffId: string;
  mimeType: string;
  fileName?: string | null;
  dataBase64: string;
}) {
  return saveProfileImage('store-staff', input.staffId, input);
}

async function saveProfileImage(
  scope: 'users' | 'store-staff',
  ownerId: string,
  input: { mimeType: string; fileName?: string | null; dataBase64: string }
) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error('UNSUPPORTED_MIME');
  }

  const buffer = Buffer.from(input.dataBase64, 'base64');
  if (!buffer.length) throw new Error('EMPTY_FILE');
  if (buffer.length > MAX_BYTES) throw new Error('FILE_TOO_LARGE');

  const scopeRoot = path.join(UPLOAD_ROOT, scope);
  const dir = path.join(scopeRoot, ownerId);
  await mkdir(dir, { recursive: true });

  const ext = extensionForMime(input.mimeType) || path.extname(input.fileName || '') || '.bin';
  const storageKey = `${scope}/${ownerId}/${randomUUID()}${ext}`;
  const { absolutePath } = assertSafeKey(storageKey, UPLOAD_ROOT);
  await writeFile(absolutePath, buffer);

  return {
    storageKey,
    byteSize: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    mimeType: input.mimeType
  };
}

export async function readProfileImageFile(storageKey: string) {
  const { absolutePath } = assertSafeKey(storageKey, UPLOAD_ROOT);
  return readFile(absolutePath);
}

export async function deleteProfileImageFile(storageKey: string) {
  const { absolutePath } = assertSafeKey(storageKey, UPLOAD_ROOT);
  await unlink(absolutePath).catch(() => undefined);
}

export function profileImageMimeType(storageKey: string) {
  const ext = path.extname(storageKey).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}
