import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { prisma } from '../src/db.js';
import { importMarketingContacts } from '../src/services/email-marketing.js';

const getArgument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main() {
  const file = getArgument('--file');
  const sourceLabel = getArgument('--source') || 'Historical email exports';
  const consentBasis =
    getArgument('--basis') ||
    'Administrator-directed import from historical customer/order exports; promotional consent not independently verified.';

  if (!file) throw new Error('Pass the normalized email file with --file.');

  const emails = [
    ...new Set(
      (await readFile(file, 'utf8'))
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
