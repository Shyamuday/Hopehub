import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ASSET_BUCKET = process.env.ASSET_BUCKET || process.env.S3_ASSET_BUCKET || '';
const ASSET_BUCKET_REGION =
  process.env.ASSET_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1';

let s3Client: S3Client | null = null;

export function assetStorageMode() {
  return ASSET_BUCKET ? 's3' : 'local';
}

function client() {
  s3Client ??= new S3Client({ region: ASSET_BUCKET_REGION });
  return s3Client;
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
  const storageKey = normalizeStorageKey(input.storageKey);

  if (ASSET_BUCKET) {
    await client().send(
      new PutObjectCommand({
        Bucket: ASSET_BUCKET,
        Key: storageKey,
        Body: input.body,
        ContentType: input.contentType,
        ServerSideEncryption: 'AES256'
      })
    );
    return;
  }

  const { absolutePath } = localPathFor(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.body);
}

export async function readAssetObject(storageKey: string, legacyLocalRoot?: string) {
  const normalized = normalizeStorageKey(storageKey);

  if (ASSET_BUCKET) {
    try {
      const object = await client().send(
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

export async function deleteAssetObject(storageKey: string, legacyLocalRoot?: string) {
  const normalized = normalizeStorageKey(storageKey);

  if (ASSET_BUCKET) {
    await client()
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
