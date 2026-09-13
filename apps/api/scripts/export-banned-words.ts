import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const row = await prisma.siteConfig.findUnique({
    where: { key: 'telegramGroupHelpBannedWords' },
    select: { value: true }
  });

  const raw = row?.value ?? '';
  const words = raw
    .split(/[\n,]+/)
    .map((w: string) => w.trim())
    .filter(Boolean);

  const outPath = resolve('banned-words.txt');

  if (words.length === 0) {
    writeFileSync(outPath, '', 'utf-8');
    console.log('No banned words found. Empty file written to:', outPath);
  } else {
    writeFileSync(outPath, words.join('\n') + '\n', 'utf-8');
    console.log(`Exported ${words.length} word(s)/phrase(s) to:`, outPath);
    console.log('\n--- Preview ---');
    words.forEach((w: string) => console.log(' •', w));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
