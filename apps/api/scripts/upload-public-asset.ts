import 'dotenv/config';
import { basename, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { writePublicAssetObject } from '../src/services/asset-storage.js';

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = option('--file');
const key = option('--key');
const contentType = option('--content-type') || 'application/octet-stream';

if (!file || !key) {
  throw new Error(
    'Usage: upload-public-asset.ts --file <path> --key <s3-key> [--content-type <mime>]'
  );
}

async function main() {
  const absolutePath = resolve(file!);
  const body = await readFile(absolutePath);
  await writePublicAssetObject({
    storageKey: key!,
    body,
    contentType,
    metadata: { source: 'healing-hub-public-asset', filename: basename(absolutePath) }
  });
  console.log(JSON.stringify({ key, bytes: body.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
