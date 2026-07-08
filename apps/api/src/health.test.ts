import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_JWT_SECRET } from './constants/auth.constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../prisma/migrations');

test('migration history includes squashed baseline and six incremental migrations', () => {
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory());

  assert.ok(folders.includes('00000000000000_baseline'));
  assert.equal(
    folders.filter((name) => name.startsWith('20260708')).length,
    6,
    `expected 6 incremental migrations, got: ${folders.join(', ')}`
  );
  assert.ok(fs.existsSync(path.join(migrationsDir, 'migration_lock.toml')));
});

test('auth constants define a dev-only fallback secret', () => {
  assert.equal(typeof DEFAULT_JWT_SECRET, 'string');
  assert.ok(DEFAULT_JWT_SECRET.length >= 8);
});
