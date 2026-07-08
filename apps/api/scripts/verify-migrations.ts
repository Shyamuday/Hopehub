import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..');

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: apiRoot, env: process.env });
}

const shadowUrl = process.env.SHADOW_DATABASE_URL;
if (!shadowUrl) {
  console.log('SHADOW_DATABASE_URL not set — skipping migrate diff verification.');
  process.exit(0);
}

// Exit code 2 means schema and migrations are out of sync.
run(
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url "${shadowUrl}" --exit-code`
);
