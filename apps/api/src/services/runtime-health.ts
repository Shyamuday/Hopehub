import { prisma } from '../db.js';
import { DEFAULT_JWT_SECRET } from '../constants/auth.constants.js';
import { getRtcConfigurationStatus } from '../constants/rtc.constants.js';

const DATABASE_HEALTH_TIMEOUT_MS = 2_000;
let runtimeDraining = false;

export function setRuntimeDraining(value: boolean) {
  runtimeDraining = value;
}

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

  const rtc = getRtcConfigurationStatus();
  if (production && !rtc.turnConfigured)
    warnings.push('TURN is not configured; mobile calls may fail behind carrier NAT.');
  if (production && rtc.turnConfigured && !rtc.transports.udp)
    warnings.push('TURN UDP relay is missing; calls may connect more slowly.');
  if (production && rtc.turnConfigured && !rtc.transports.tcp)
    warnings.push('TURN TCP relay is missing; restrictive networks may fail.');
  if (production && rtc.turnConfigured && !rtc.transports.tls443)
    warnings.push('TURN TLS on port 443 is missing; strict office and carrier networks may fail.');
  if (production && rtc.turnConfigured && rtc.credentialMode !== 'temporary')
    warnings.push(
      'TURN uses static credentials; configure a shared secret for short-lived access.'
    );
  if (production && rtc.turnConfigured && !rtc.redundant)
    warnings.push('Only one TURN host is configured; add an independent relay for failover.');
  if (production && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    warnings.push('Telegram webhook secret is not configured; Telegram webhooks are rejected.');
  }

  return { missing, warnings, rtc };
}

export async function getRuntimeReadiness() {
  const database = await databaseHealth();
  const configuration = requiredRuntimeConfiguration();
  const ok = !runtimeDraining && database.ok && configuration.missing.length === 0;

  return {
    ok,
    service: 'clinic-api',
    draining: runtimeDraining,
    database: database.ok ? 'connected' : 'unreachable',
    dbLatencyMs: database.latencyMs,
    configuration: {
      missing: configuration.missing,
      warnings: configuration.warnings,
      turnConfigured: configuration.rtc.turnConfigured,
      turnTransports: configuration.rtc.transports,
      turnCredentialMode: configuration.rtc.credentialMode,
      turnRelayHostCount: configuration.rtc.relayHostCount,
      turnRedundant: configuration.rtc.redundant
    },
    timestamp: new Date().toISOString()
  };
}
