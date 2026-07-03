import 'dotenv/config';
import { existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { importOorepSqlDump } from '../src/services/oorep-importer.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultGz = resolve(scriptDir, '../data/oorep/oorep.sql.gz');
const defaultSql = resolve(scriptDir, '../data/oorep/oorep.sql');

function parseArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function ensureSqlFile(sqlPath: string, gzPath: string) {
  if (existsSync(sqlPath)) return sqlPath;
  if (!existsSync(gzPath)) {
    throw new Error(`Missing OOREP SQL dump. Run: npm run repertory:download:oorep --prefix apps/api`);
  }
  console.log(`[oorep-import] decompressing ${gzPath}`);
  await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(sqlPath));
  return sqlPath;
}

async function main() {
  const sqlArg = parseArg('--sql');
  const gzPath = resolve(parseArg('--gz') || defaultGz);
  const sqlPath = resolve(sqlArg || defaultSql);
  const sources = parseArg('--sources')?.split(',').map((item) => item.trim()).filter(Boolean);

  await ensureSqlFile(sqlPath, gzPath);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await importOorepSqlDump(prisma, { sqlPath, sources });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
