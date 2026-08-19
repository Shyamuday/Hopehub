import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DEFAULT_JWT_SECRET } from '../src/constants/auth.constants.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.join(scriptDirectory, '..');
const migrationsDirectory = path.join(apiDirectory, 'prisma', 'migrations');

function localMigrationNames() {
  return fs
    .readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_[a-z0-9_]+$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function requireProductionConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) && 'JWT_SECRET',
    !process.env.API_PUBLIC_URL && 'API_PUBLIC_URL'
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Production release is missing required configuration: ${missing.join(', ')}`);
  }
}

async function verifyMigrations() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
      logs: string | null;
    }>(`
      SELECT migration_name, finished_at, rolled_back_at, logs
      FROM "_prisma_migrations"
      ORDER BY started_at ASC
    `);

    const failed = result.rows.filter(
      (migration) => !migration.finished_at && !migration.rolled_back_at
    );
    if (failed.length) {
      throw new Error(
        `Database has failed Prisma migrations: ${failed.map((migration) => migration.migration_name).join(', ')}`
      );
    }

    const applied = new Set(
      result.rows
        .filter((migration) => migration.finished_at && !migration.rolled_back_at)
        .map((migration) => migration.migration_name)
    );
    const pending = localMigrationNames().filter((migration) => !applied.has(migration));
    if (pending.length) {
      throw new Error(
        `Database schema is behind this release. Apply migrations before restarting: ${pending.join(', ')}`
      );
    }
  } finally {
    await client.end();
  }
}

try {
  requireProductionConfiguration();
  await verifyMigrations();
  console.log(
    'Release readiness verified: configuration and Prisma migration history are current.'
  );
} catch (error) {
  console.error(
    `Release readiness failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
