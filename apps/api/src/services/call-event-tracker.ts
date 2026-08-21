import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { SOCKET_EVENTS } from '../constants/socket.constants.js';
import { callQualitySnapshot } from './call-session-quality.js';

export type CallEventOutcome = 'ACCEPTED' | 'REJECTED' | 'OBSERVED' | 'ERROR';

type RecordCallEventInput = {
  sessionId?: string | null;
  consultationId: string;
  callId?: string | null;
  actorUserId?: string | null;
  targetUserId?: string | null;
  event: string;
  outcome: CallEventOutcome;
  reason?: string | null;
  sequence?: number | null;
  clientTimestamp?: string | null;
  metadata?: unknown;
};

const STRING_METADATA_KEYS = [
  'userAgent',
  'platform',
  'connectionState',
  'iceConnectionState',
  'mode',
  'selectedCandidatePairId',
  'localCandidateType',
  'remoteCandidateType',
  'transportProtocol',
  'networkType',
  'networkEffectiveType',
  'diagnosticReason',
  'errorName',
  'connectivityPreflightSource'
] as const;

const NUMBER_METADATA_KEYS = [
  'attempt',
  'currentRoundTripTime',
  'bytesSent',
  'bytesReceived',
  'averageRttMs',
  'packetLossPercent',
  'maxJitterMs',
  'reconnectCount',
  'connectivityCheckMs',
  'mediaAcquisitionMs'
] as const;

const BOOLEAN_METADATA_KEYS = [
  'iceRestart',
  'usedTurnRelay',
  'privacyRelay',
  'lowDataMode',
  'backgroundBlurEnabled',
  'userReportedIssue',
  'networkSaveData',
  'relayRequiredByNetwork',
  'deliveryRetry',
  'preparedStreamReused'
] as const;

export function safeCallEventMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const source = metadata as Record<string, unknown>;
  const safe: Record<string, unknown> = {};

  for (const key of STRING_METADATA_KEYS) {
    if (typeof source[key] === 'string') safe[key] = source[key].slice(0, 300);
  }
  for (const key of NUMBER_METADATA_KEYS) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key])) safe[key] = source[key];
  }
  for (const key of BOOLEAN_METADATA_KEYS) {
    if (typeof source[key] === 'boolean') safe[key] = source[key];
  }

  const quality = callQualitySnapshot(source).qualitySummary;
  if (quality) safe['qualitySummary'] = quality;
  return safe;
}

export function callEventPhase(event: string): string {
  if (
    event === SOCKET_EVENTS.CALL_RING ||
    event === SOCKET_EVENTS.CALL_RING_ACK ||
    event === SOCKET_EVENTS.CALL_OFFER ||
    event === SOCKET_EVENTS.CALL_ANSWER
  ) {
    return 'SETUP';
  }
  if (event === SOCKET_EVENTS.CALL_ICE || event === SOCKET_EVENTS.CALL_HEARTBEAT) {
    return 'CONNECTIVITY';
  }
  if (event === SOCKET_EVENTS.CALL_END || event === SOCKET_EVENTS.CALL_REJECT) {
    return 'TEARDOWN';
  }
  if (event === SOCKET_EVENTS.CALL_DIAGNOSTIC) return 'DIAGNOSTIC';
  if (event === SOCKET_EVENTS.CALL_SYNC || event === SOCKET_EVENTS.CALL_STATE) return 'RECOVERY';
  return 'SYSTEM';
}

export function shouldPersistCallEvent(event: string, outcome: CallEventOutcome): boolean {
  // Successful ICE candidates and 20-second heartbeats are intentionally summarized on the
  // session. Persisting every packet would create a noisy, high-volume diagnostic table.
  if (
    outcome === 'ACCEPTED' &&
    (event === SOCKET_EVENTS.CALL_ICE || event === SOCKET_EVENTS.CALL_HEARTBEAT)
  ) {
    return false;
  }
  return true;
}

function safeClientTimestamp(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  const maximumClockDifferenceMs = 24 * 60 * 60 * 1000;
  if (Math.abs(Date.now() - parsed.getTime()) > maximumClockDifferenceMs) return undefined;
  return parsed;
}

export async function recordCallTimelineEvent(input: RecordCallEventInput): Promise<void> {
  if (!shouldPersistCallEvent(input.event, input.outcome)) return;

  let sessionId = input.sessionId || null;
  if (!sessionId && input.callId) {
    const matchingSession = await prisma.consultationCallSession.findFirst({
      where: {
        consultationId: input.consultationId,
        metadata: { path: ['callId'], equals: input.callId }
      },
      select: { id: true },
      orderBy: { startedAt: 'desc' }
    });
    sessionId = matchingSession?.id || null;
  }

  await prisma.consultationCallEvent.create({
    data: {
      sessionId,
      consultationId: input.consultationId.slice(0, 100),
      callId: input.callId?.slice(0, 100) || null,
      actorUserId: input.actorUserId?.slice(0, 100) || null,
      targetUserId: input.targetUserId?.slice(0, 100) || null,
      event: input.event.slice(0, 100),
      phase: callEventPhase(input.event),
      outcome: input.outcome,
      reason: input.reason?.slice(0, 100) || null,
      sequence:
        typeof input.sequence === 'number' && Number.isSafeInteger(input.sequence)
          ? input.sequence
          : null,
      clientOccurredAt: safeClientTimestamp(input.clientTimestamp),
      metadata: safeCallEventMetadata(input.metadata) as Prisma.InputJsonValue
    }
  });
}
