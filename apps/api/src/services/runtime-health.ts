import { prisma } from '../db.js';
import { DEFAULT_JWT_SECRET } from '../constants/auth.constants.js';

const DATABASE_HEALTH_TIMEOUT_MS = 2_000;

type HealthCheck = {
  ok: boolean;
  latencyMs?: number;
};

async function databaseHealth(): Promise<HealthCheck> {
  const startedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Database health check timed out.')),
          DATABASE_HEALTH_TIMEOUT_MS
        );
      })
    ]);
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch {
    return { ok: false, latencyMs: Date.now() - startedAt };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function requiredRuntimeConfiguration() {
  const production = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (production && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
    missing.push('JWT_SECRET');
  }
  if (production && !process.env.API_PUBLIC_URL) missing.push('API_PUBLIC_URL');

  const turnConfigured = Boolean(
    process.env.TURN_URLS ||
    process.env.TURN_URL ||
    (process.env.TURN_USERNAME && (process.env.TURN_CREDENTIAL || process.env.TURN_SHARED_SECRET))
  );
  if (production && !turnConfigured)
    warnings.push('TURN is not configured; mobile calls may fail behind carrier NAT.');
  if (production && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    warnings.push('Telegram webhook secret is not configured; Telegram webhooks are rejected.');
  }

  return { missing, warnings, turnConfigured };
}

export async function getRuntimeReadiness() {
  const database = await databaseHealth();
  const configuration = requiredRuntimeConfiguration();
  const ok = database.ok && configuration.missing.length === 0;

  return {
    ok,
    service: 'clinic-api',
    database: database.ok ? 'connected' : 'unreachable',
    dbLatencyMs: database.latencyMs,
    configuration: {
      missing: configuration.missing,
      warnings: configuration.warnings,
      turnConfigured: configuration.turnConfigured
    },
    timestamp: new Date().toISOString()
  };
}
