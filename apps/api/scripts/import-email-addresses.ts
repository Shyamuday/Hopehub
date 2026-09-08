import 'dotenv/config';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { prisma } from '../src/db.js';
import { importMarketingContacts } from '../src/services/email-marketing.js';

const getArgument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main() {
  const file = getArgument('--file');
  const s3Bucket = getArgument('--s3-bucket');
  const s3Key = getArgument('--s3-key');
  const sourceLabel = getArgument('--source') || 'Historical email exports';
  const consentBasis =
    getArgument('--basis') ||
    'Administrator-directed import from historical customer/order exports; promotional consent not independently verified.';

  if (!file && !(s3Bucket && s3Key)) {
    throw new Error('Pass --file or both --s3-bucket and --s3-key.');
  }

  const s3 = s3Bucket && s3Key ? new S3Client({}) : null;
  const sourceText = file
    ? await readFile(file, 'utf8')
    : await (async () => {
        const response = await s3!.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
        if (!response.Body) throw new Error('The S3 import object is empty.');
        return response.Body.transformToString('utf-8');
      })();

  const emails = [
    ...new Set(
      sourceText
        .split(/\r?\n/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  ];

  const totals = { found: 0, imported: 0, updated: 0, converted: 0, suppressed: 0 };
  for (let offset = 0; offset < emails.length; offset += 5000) {
    const result = await importMarketingContacts({
      rawContacts: emails.slice(offset, offset + 5000).join('\n'),
      sourceLabel,
      consentBasis
    });
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += result[key];
    console.log(`Imported batch ${Math.floor(offset / 5000) + 1}: ${result.found} contacts.`);
  }

  const stored = await prisma.emailMarketingContact.count({ where: { sourceLabel } });
  console.log(JSON.stringify({ ...totals, stored }));

  if (s3 && s3Bucket && s3Key) {
    await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
    console.log('Deleted the private S3 transfer object after successful import.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
