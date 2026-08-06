import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = option('--file');
const key = option('--key');
const region =
  process.env.DATABASE_BACKUP_BUCKET_REGION || process.env.ASSET_BUCKET_REGION || 'us-east-1';
const bucket = process.env.DATABASE_BACKUP_BUCKET || process.env.ASSET_BUCKET;

if (!file || !key || !bucket) {
  throw new Error(
    'Usage: upload-db-backup-to-s3.ts --file <path> --key <s3-key>; DATABASE_BACKUP_BUCKET or ASSET_BUCKET is required.'
  );
}

async function main() {
  const path = resolve(file!);
  const details = await stat(path);
  if (!details.isFile() || details.size === 0) throw new Error(`Backup file is invalid: ${path}`);

  await new S3Client({ region }).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(path),
      ContentType: 'application/octet-stream',
      ServerSideEncryption: 'AES256',
      Metadata: {
        source: 'hopehub-postgresql',
        filename: basename(path),
        bytes: String(details.size)
      }
    })
  );
  console.log(JSON.stringify({ bucket, key, bytes: details.size }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
