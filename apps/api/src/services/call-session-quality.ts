import type { Prisma } from '@prisma/client';

export type CallQualitySnapshot = {
  qualitySummary?: Prisma.InputJsonObject;
  reconnectCount?: number;
  usedTurnRelay?: boolean;
  averageRttMs?: number;
  packetLossPercent?: number;
  maxJitterMs?: number;
};

function finiteNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

export function callQualitySnapshot(metadata: unknown): CallQualitySnapshot {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const raw =
    root['qualitySummary'] &&
    typeof root['qualitySummary'] === 'object' &&
    !Array.isArray(root['qualitySummary'])
      ? (root['qualitySummary'] as Record<string, unknown>)
      : {};

  const quality = ['unknown', 'good', 'unstable', 'poor'].includes(String(raw['quality']))
    ? String(raw['quality'])
    : 'unknown';
  const reconnectCount = finiteNumber(raw['reconnectCount'], 0, 100);
  const averageRttMs = finiteNumber(raw['averageRttMs'], 0, 60_000);
  const packetLossPercent = finiteNumber(raw['packetLossPercent'], 0, 100);
  const maxJitterMs = finiteNumber(raw['maxJitterMs'], 0, 60_000);
  const usedTurnRelay = raw['usedTurnRelay'] === true || root['usedTurnRelay'] === true;
  const hasSummary = Object.keys(raw).length > 0;

  return {
    ...(hasSummary
      ? {
          qualitySummary: {
            quality,
            reconnectCount: Math.round(reconnectCount ?? 0),
            usedTurnRelay,
            ...(averageRttMs === undefined ? {} : { averageRttMs: Math.round(averageRttMs) }),
            ...(packetLossPercent === undefined ? {} : { packetLossPercent }),
            ...(maxJitterMs === undefined ? {} : { maxJitterMs: Math.round(maxJitterMs) })
          }
        }
      : {}),
    ...(reconnectCount === undefined ? {} : { reconnectCount: Math.round(reconnectCount) }),
    ...(hasSummary || root['usedTurnRelay'] === true ? { usedTurnRelay } : {}),
    ...(averageRttMs === undefined ? {} : { averageRttMs: Math.round(averageRttMs) }),
    ...(packetLossPercent === undefined ? {} : { packetLossPercent }),
    ...(maxJitterMs === undefined ? {} : { maxJitterMs: Math.round(maxJitterMs) })
  };
}
