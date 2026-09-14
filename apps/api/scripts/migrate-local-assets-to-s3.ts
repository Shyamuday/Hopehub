import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

type AssetRoot = {
  label: string;
  root: string;
  keyPrefix?: string;
};

const bucket = process.env.ASSET_BUCKET || process.env.S3_ASSET_BUCKET;
const region = process.env.ASSET_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1';
const uploadRoot = path.resolve(process.cwd(), 'uploads');
const telegramAssetRoot = path.resolve(process.cwd(), 'assets', 'telegram');
const publicAssetRoot = path.resolve(process.cwd(), 'assets', 'public');

const roots: AssetRoot[] = [
  { label: 'profile images', root: path.join(uploadRoot, 'profile-images') },
  { label: 'clinical media', root: path.join(uploadRoot, 'clinical-media') },
  {
    label: 'Telegram artwork',
    root: telegramAssetRoot,
    keyPrefix: 'telegram'
  },
  {
    label: 'public website assets',
    root: publicAssetRoot
  }
];

const contentTypeByExt = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.pdf', 'application/pdf']
]);

if (!bucket) {
  console.error('ASSET_BUCKET is required.');
  process.exit(1);
}

const s3 = new S3Client({ region });

async function* walk(root: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function keyFor(assetRoot: AssetRoot, filePath: string) {
  const relativeKey = path.relative(assetRoot.root, filePath).split(path.sep).join('/');
  return [assetRoot.keyPrefix, relativeKey].filter(Boolean).join('/');
}

async function uploadFile(assetRoot: AssetRoot, filePath: string) {
  const body = await readFile(filePath);
  const key = keyFor(assetRoot, filePath);
  const contentType =
    contentTypeByExt.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        source: 'local-upload-migration',
        sha256: createHash('sha256').update(body).digest('hex')
      }
    })
  );

  return { key, bytes: body.length };
}

let totalFiles = 0;
let totalBytes = 0;

for (const assetRoot of roots) {
  const rootStat = await stat(assetRoot.root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    console.log(`Skipping ${assetRoot.label}: ${assetRoot.root} not found.`);
    continue;
  }

  for await (const filePath of walk(assetRoot.root)) {
    const uploaded = await uploadFile(assetRoot, filePath);
    totalFiles += 1;
    totalBytes += uploaded.bytes;
    console.log(`Uploaded ${uploaded.key} (${uploaded.bytes} bytes).`);
  }
}

console.log(`Done. Uploaded ${totalFiles} file(s), ${totalBytes} byte(s), to s3://${bucket}.`);
