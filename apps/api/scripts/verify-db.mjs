/**
 * Quick check that DATABASE_URL is set and Postgres accepts a connection.
 * Run: npm run db:verify --prefix apps/api
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL is missing. Copy the URI from Supabase → Project Settings → Database.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  connectionTimeoutMillis: 12_000
});

try {
  await client.connect();
  const { rows } = await client.query('select current_database() as db, version() as version');
  console.log('Database OK:', rows[0]?.db ?? '(connected)');
  console.log('Server:', String(rows[0]?.version ?? '').split('\n')[0]);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Connection failed:', msg);
  console.error('');
  console.error('Next steps:');
  console.error('  1. Supabase Dashboard → resume project if it is paused.');
  console.error('  2. Settings → Database → copy "Connection string" (URI) into apps/api/.env as DATABASE_URL.');
  console.error('  3. If direct db.<ref>.supabase.co:5432 fails (firewall/DNS), use the Session pooler URI (port 6543).');
  console.error('     Use sslmode=verify-full and pgbouncer=true when the dashboard URI includes pooling (see docs/backend-auth-supabase-env.md).');
  console.error('  4. URL-encode special characters in the DB password.');
  process.exit(1);
} finally {
 await client.end().catch(() => {});
}
