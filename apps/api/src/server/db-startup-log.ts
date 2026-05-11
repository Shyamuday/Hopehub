/** Startup / periodic jobs: avoid dumping full Prisma stacks when Postgres is simply unreachable. */

function isPrismaUnreachable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (error as { code?: string }).code === 'P1001';
}

export function logStartupDbError(scope: string, error: unknown): void {
  if (isPrismaUnreachable(error)) {
    console.error(
      `[${scope}] Database unreachable (P1001). Set DATABASE_URL in apps/api/.env from Supabase → Project Settings → Database (URI). Verify: npm run db:verify → docs/backend-auth-supabase-env.md`
    );
    return;
  }
  console.error(`[${scope}]`, error);
}
