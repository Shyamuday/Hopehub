import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ASSET_BUCKET = process.env.ASSET_BUCKET || process.env.S3_ASSET_BUCKET || '';
const ASSET_BUCKET_REGION =
  process.env.ASSET_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1';
const ASSET_BASE_URL = (
  process.env.ASSET_BASE_URL ||
  process.env.S3_ASSET_BASE_URL ||
  process.env.ASSET_OBJECT_BASE_URL ||
  ''
).replace(/\/+$/, '');
const ASSET_SIGNED_URL_TTL_SECONDS = Math.max(
  60,
  Math.min(Number(process.env.ASSET_SIGNED_URL_TTL_SECONDS || 900), 604800)
);
const PUBLIC_ASSET_BUCKET =
  process.env.PUBLIC_ASSET_BUCKET || process.env.S3_PUBLIC_ASSET_BUCKET || '';
const PUBLIC_ASSET_BUCKET_REGION =
  process.env.PUBLIC_ASSET_BUCKET_REGION ||
  process.env.S3_PUBLIC_ASSET_BUCKET_REGION ||
  ASSET_BUCKET_REGION;
const PUBLIC_ASSET_BASE_URL = (
  process.env.PUBLIC_ASSET_BASE_URL ||
  process.env.ASSET_PUBLIC_BASE_URL ||
  process.env.S3_PUBLIC_ASSET_BASE_URL ||
  process.env.S3_ASSET_PUBLIC_BASE_URL ||
  ''
).replace(/\/+$/, '');

const s3Clients = new Map<string, S3Client>();

export function assetStorageMode() {
  return ASSET_BUCKET ? 's3' : 'local';
}

export function publicAssetStorageMode() {
  return PUBLIC_ASSET_BUCKET ? 's3-public' : assetStorageMode();
}

function encodeStorageKeyForUrl(storageKey: string) {
  return normalizeStorageKey(storageKey).split('/').map(encodeURIComponent).join('/');
}

export function assetPublicUrl(storageKey: string | null | undefined) {
  if (!storageKey) return null;
  const encodedKey = encodeStorageKeyForUrl(storageKey);

  if (PUBLIC_ASSET_BASE_URL) {
    return `${PUBLIC_ASSET_BASE_URL}/${encodedKey}`;
  }

  if (!PUBLIC_ASSET_BUCKET) {
    return null;
  }

  return `https://${PUBLIC_ASSET_BUCKET}.s3.${PUBLIC_ASSET_BUCKET_REGION}.amazonaws.com/${encodedKey}`;
}

export function assetObjectUrl(storageKey: string | null | undefined) {
  if (!storageKey) return null;
  const encodedKey = encodeStorageKeyForUrl(storageKey);

  if (ASSET_BASE_URL) {
    return `${ASSET_BASE_URL}/${encodedKey}`;
  }

  if (!ASSET_BUCKET) {
    return null;
  }

  return `https://${ASSET_BUCKET}.s3.${ASSET_BUCKET_REGION}.amazonaws.com/${encodedKey}`;
}

export async function assetAccessUrl(
  storageKey: string | null | undefined,
  fallbackUrl: string | null
) {
  if (!storageKey) return fallbackUrl;

  if (ASSET_BASE_URL) {
    return assetObjectUrl(storageKey) ?? fallbackUrl;
  }

  if (!ASSET_BUCKET) {
    return fallbackUrl;
  }

  const normalized = normalizeStorageKey(storageKey);
  return getSignedUrl(
    client(ASSET_BUCKET_REGION),
    new GetObjectCommand({
      Bucket: ASSET_BUCKET,
      Key: normalized
    }),
    { expiresIn: ASSET_SIGNED_URL_TTL_SECONDS }
  );
}

function client(region: string) {
  const existing = s3Clients.get(region);
  if (existing) return existing;
  const next = new S3Client({ region });
  s3Clients.set(region, next);
  return next;
}

function normalizeStorageKey(storageKey: string) {
  const normalized = path.posix
    .normalize(storageKey.replace(/\\/g, '/'))
    .replace(/^(\.\.(\/|$))+/, '')
    .replace(/^\/+/, '');

  if (!normalized || normalized === '.') {
    throw new Error('INVALID_STORAGE_KEY');
  }
  return normalized;
}

function localPathFor(storageKey: string, localRoot = LOCAL_UPLOAD_ROOT) {
  const normalized = normalizeStorageKey(storageKey);
  const absolutePath = path.resolve(localRoot, normalized);
  if (!absolutePath.startsWith(localRoot)) {
    throw new Error('INVALID_STORAGE_KEY');
  }
  return { normalized, absolutePath };
}

export async function writeAssetObject(input: {
  storageKey: string;
  body: Buffer;
  contentType: string;
}) {
  if (ASSET_BUCKET) {
    await writeS3Object(ASSET_BUCKET, ASSET_BUCKET_REGION, input);
    return;
  }

  await writeLocalObject(input);
}

export async function writePublicAssetObject(input: {
  storageKey: string;
  body: Buffer;
  contentType: string;
}) {
  if (PUBLIC_ASSET_BUCKET) {
    await writeS3Object(PUBLIC_ASSET_BUCKET, PUBLIC_ASSET_BUCKET_REGION, input);
    return;
  }

  return writeAssetObject(input);
}

async function writeS3Object(
  bucket: string,
  region: string,
  input: { storageKey: string; body: Buffer; contentType: string }
) {
  const storageKey = normalizeStorageKey(input.storageKey);
  await client(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: input.body,
      ContentType: input.contentType,
      ServerSideEncryption: 'AES256'
    })
  );
}

async function writeLocalObject(input: { storageKey: string; body: Buffer }) {
  const { absolutePath } = localPathFor(input.storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.body);
}

export async function readAssetObject(storageKey: string, legacyLocalRoot?: string) {
  const normalized = normalizeStorageKey(storageKey);

  if (ASSET_BUCKET) {
    try {
      const object = await client(ASSET_BUCKET_REGION).send(
        new GetObjectCommand({
          Bucket: ASSET_BUCKET,
          Key: normalized
        })
      );

      const bytes = await object.Body?.transformToByteArray();
      return Buffer.from(bytes ?? []);
    } catch (error) {
      if (!legacyLocalRoot) throw error;
      const { absolutePath } = localPathFor(normalized, legacyLocalRoot);
      return readFile(absolutePath);
    }
  }

  try {
    const { absolutePath } = localPathFor(normalized);
    return await readFile(absolutePath);
  } catch (error) {
    if (!legacyLocalRoot) throw error;
    const { absolutePath } = localPathFor(normalized, legacyLocalRoot);
    return readFile(absolutePath);
  }
}

export async function readPublicAssetObject(storageKey: string, legacyLocalRoot?: string) {
  const normalized = normalizeStorageKey(storageKey);

  if (PUBLIC_ASSET_BUCKET) {
    try {
      const object = await client(PUBLIC_ASSET_BUCKET_REGION).send(
        new GetObjectCommand({
          Bucket: PUBLIC_ASSET_BUCKET,
          Key: normalized
        })
      );

      const bytes = await object.Body?.transformToByteArray();
      return Buffer.from(bytes ?? []);
    } catch (error) {
      if (!legacyLocalRoot) throw error;
      const { absolutePath } = localPathFor(normalized, legacyLocalRoot);
      return readFile(absolutePath);
    }
  }

  return readAssetObject(normalized, legacyLocalRoot);
}

export async function deleteAssetObject(storageKey: string, legacyLocalRoot?: string) {
  const normalized = normalizeStorageKey(storageKey);

  if (ASSET_BUCKET) {
    await client(ASSET_BUCKET_REGION)
      .send(
        new DeleteObjectCommand({
          Bucket: ASSET_BUCKET,
          Key: normalized
        })
      )
      .catch(() => undefined);
    if (legacyLocalRoot) {
      const legacy = localPathFor(normalized, legacyLocalRoot);
      await unlink(legacy.absolutePath).catch(() => undefined);
    }
    return;
  }

  const { absolutePath } = localPathFor(normalized);
  await unlink(absolutePath).catch(() => undefined);
  if (legacyLocalRoot) {
    const legacy = localPathFor(normalized, legacyLocalRoot);
    await unlink(legacy.absolutePath).catch(() => undefined);
  }
}
