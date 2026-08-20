import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(scriptDirectory, '..', 'prisma', 'migrations');
const TRANSACTION_REQUIRED_FROM = '20260820130000';

const unsafe = fs
  .readdirSync(migrationsDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      /^\d{14}_[a-z0-9_]+$/i.test(entry.name) &&
      entry.name >= TRANSACTION_REQUIRED_FROM
  )
  .filter((entry) => {
    const sql = fs
      .readFileSync(path.join(migrationsDirectory, entry.name, 'migration.sql'), 'utf8')
      .trim();
    return !/^BEGIN\s*;/i.test(sql) || !/COMMIT\s*;\s*$/i.test(sql);
  })
  .map((entry) => entry.name);

if (unsafe.length) {
  throw new Error(
    `PostgreSQL migrations must be explicitly transactional: ${unsafe.join(', ')}. Add BEGIN; and COMMIT;.`
  );
}

console.log('Migration transaction policy verified.');
