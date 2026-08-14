import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { cleanupInactivePushDevices } from './push-devices.js';

const ACTIVE_CALL_STATUSES = ['RINGING', 'CONNECTING', 'CONNECTED', 'RECONNECTING'];
const SETUP_STALE_MS = 2 * 60 * 1000;
const CONNECTED_STALE_MS = 6 * 60 * 60 * 1000;

function positiveDays(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const callMaintenanceIntervalMs = Math.max(
  60_000,
  Number(process.env.CALL_MAINTENANCE_INTERVAL_MS || 5 * 60 * 1000)
);

export async function runCallSessionMaintenance() {
  const now = new Date();
  const setupCutoff = new Date(now.getTime() - SETUP_STALE_MS);
  const connectedCutoff = new Date(now.getTime() - CONNECTED_STALE_MS);
  const stale = await prisma.consultationCallSession.findMany({
    where: {
      endedAt: null,
      status: { in: ACTIVE_CALL_STATUSES },
      OR: [
        {
          status: { in: ['RINGING', 'CONNECTING', 'RECONNECTING'] },
          updatedAt: { lt: setupCutoff }
        },
        { status: 'CONNECTED', updatedAt: { lt: connectedCutoff } }
      ]
    },
    select: { id: true, startedAt: true, answeredAt: true, metadata: true }
  });

  for (const session of stale) {
    const startedFrom = session.answeredAt ?? session.startedAt;
    await prisma.consultationCallSession.update({
      where: { id: session.id },
      data: {
        activeKey: null,
        status: session.answeredAt ? 'ENDED' : 'FAILED',
        endedAt: now,
        durationSeconds: Math.max(0, Math.round((now.getTime() - startedFrom.getTime()) / 1_000)),
        endReason: session.answeredAt ? 'stale_connected_cleanup' : 'stale_setup_cleanup',
        lastSignalEvent: 'call:scheduled-cleanup',
        metadata: {
          ...((session.metadata as Record<string, unknown> | null) || {}),
          staleCleanupAt: now.toISOString()
        }
      }
    });
  }

  const metadataDays = positiveDays(process.env.CALL_METADATA_RETENTION_DAYS, 30);
  const qualityDays = positiveDays(process.env.CALL_QUALITY_RETENTION_DAYS, 180);
  const pushDays = positiveDays(process.env.PUSH_DEVICE_RETENTION_DAYS, 90);
  const [metadata, quality, pushDevices] = await Promise.all([
    prisma.consultationCallSession.updateMany({
      where: {
        endedAt: { lt: new Date(now.getTime() - metadataDays * 86_400_000) },
        NOT: { metadata: { equals: Prisma.DbNull } }
      },
      data: { metadata: Prisma.DbNull }
    }),
    prisma.consultationCallSession.updateMany({
      where: {
        endedAt: { lt: new Date(now.getTime() - qualityDays * 86_400_000) },
        NOT: { qualitySummary: { equals: Prisma.DbNull } }
      },
      data: { qualitySummary: Prisma.DbNull }
    }),
    cleanupInactivePushDevices(pushDays)
  ]);

  if (stale.length || metadata.count || quality.count || pushDevices.count) {
    console.info('[call-maintenance] Cleanup complete', {
      staleCalls: stale.length,
      metadataCleared: metadata.count,
      qualityCleared: quality.count,
      pushDevicesDeleted: pushDevices.count
    });
  }
}
