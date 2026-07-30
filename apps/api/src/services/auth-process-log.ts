import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

const AUTH_PROCESS_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
const AUTH_PROCESS_LOG_PURGE_INTERVAL_MS = 60 * 60 * 1000;

let lastPurgeAt = 0;

export async function recordAuthProcess(input: {
  processType: string;
  step: string;
  status: 'success' | 'failure' | 'blocked';
  identifier: string;
  reason?: string;
  req?: Request;
  metadata?: Record<string, unknown>;
}) {
  void purgeExpiredAuthProcessLogsThrottled();

  try {
    await prisma.authProcessLog.create({
      data: {
        processType: input.processType,
        step: input.step,
        status: input.status,
        identifier: input.identifier,
        reason: input.reason,
        route: input.req?.originalUrl,
        ipAddress: input.req?.ip,
        userAgent: input.req?.get('user-agent'),
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        purgeAfter: new Date(Date.now() + AUTH_PROCESS_LOG_RETENTION_MS)
      }
    });
  } catch (error) {
    console.warn('[auth-process] Could not record auth process log', error);
  }
}

export async function purgeExpiredAuthProcessLogs() {
  try {
    const result = await prisma.authProcessLog.deleteMany({
      where: { purgeAfter: { lt: new Date() } }
    });
    if (result.count > 0) {
      console.info('[auth-process] Purged expired auth process logs', { count: result.count });
    }
  } catch (error) {
    console.warn('[auth-process] Could not purge expired auth process logs', error);
  }
}

export async function purgeExpiredAuthProcessLogsThrottled() {
  const now = Date.now();
  if (now - lastPurgeAt < AUTH_PROCESS_LOG_PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;
  await purgeExpiredAuthProcessLogs();
}

export function scheduleAuthProcessLogRetention() {
  void purgeExpiredAuthProcessLogs();
  const timer = setInterval(() => {
    void purgeExpiredAuthProcessLogs();
  }, AUTH_PROCESS_LOG_PURGE_INTERVAL_MS);
  timer.unref?.();
}
