import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..');

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: apiRoot, env: process.env });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for migration/schema verification.');
}

// The release gate applies every migration to a clean database first. Comparing
// that datasource with the Prisma schema avoids deprecated shadow-database CLI
// flags and detects both missing migration SQL and schema drift.
run('npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code');
