import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..');

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: apiRoot });
}

// Apply pending migrations in order. Use this in CI/deploy instead of db push.
run('npx prisma migrate deploy');
run('npx prisma generate');
