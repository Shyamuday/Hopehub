import type { Server as SocketIoServer, Socket } from 'socket.io';
import { consultationAllowsCallMode } from '../services/quick-talk-modes.js';
import { ConsultationStatus, Role } from '@prisma/client';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { prisma } from '../db.js';
import {
  heartbeatDoctor,
  scheduleDoctorOfflineAfterDisconnect
} from '../services/online-doctor-presence.js';
import { sendIncomingCallPush } from '../services/push-devices.js';
import { callQualitySnapshot } from '../services/call-session-quality.js';
import { recordCallTimelineEvent, safeCallEventMetadata } from '../services/call-event-tracker.js';
import { maybeNotifyCallReliabilityIssue } from '../services/call-reliability-alerts.js';

type CallSignalPayload = {
  callId?: string;
  sequence?: number;
  consultationId: string;
  targetUserId: string;
  mode?: string;
  reason?: string;
  sdp?: unknown;
  candidate?: unknown;
  metadata?: Record<string, unknown>;
  clientTimestamp?: string;
};

const ACTIVE_CALL_STATUSES = ['RINGING', 'CONNECTING', 'CONNECTED', 'RECONNECTING'] as const;
const CALL_SETUP_STALE_MS = 2 * 60 * 1000;
// Connected browsers report every 20 seconds. Two minutes allows temporary network/browser
// throttling while ensuring a crashed tab cannot block the next call for hours.
const CONNECTED_CALL_STALE_MS = 2 * 60 * 1000;
const signalBuckets = new Map<string, { startedAt: number; count: number }>();
const lastSignalSequences = new Map<string, number>();
const CALL_ALLOWED_CONSULTATION_STATUSES: ConsultationStatus[] = [
  ConsultationStatus.ASSIGNED,
  ConsultationStatus.IN_PROGRESS,
  ConsultationStatus.PRESCRIPTION_UPLOADED
];

function safeCallReason(reason: unknown, fallback: string): string {
  if (typeof reason !== 'string') return fallback;
  const trimmed = reason
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 80);
  return trimmed || fallback;
}

function consumeSignalQuota(userId: string, event: string): boolean {
  const isIce = event === SOCKET_EVENTS.CALL_ICE;
  const windowMs = isIce ? 10_000 : 60_000;
  const limit = isIce ? 300 : event === SOCKET_EVENTS.CALL_RING ? 12 : 120;
  const key = `${userId}:${event}`;
  const now = Date.now();
  const bucket = signalBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    signalBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  if (signalBuckets.size > 5_000) {
    for (const [candidateKey, candidate] of signalBuckets) {
      if (now - candidate.startedAt >= 60_000) signalBuckets.delete(candidateKey);
    }
  }
  return bucket.count <= limit;
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

async function validateCallSignalAccess(fromUserId: string, payload: CallSignalPayload) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: payload.consultationId },
    select: {
      id: true,
      status: true,
      patientId: true,
      assignedDoctorId: true,
      intakeAnswers: true
    }
  });

  if (!consultation) return { allowed: false, reason: 'consultation_not_found' };
  if (!CALL_ALLOWED_CONSULTATION_STATUSES.includes(consultation.status)) {
    return { allowed: false, reason: 'consultation_not_active' };
  }
  if (!consultation.assignedDoctorId) {
    return { allowed: false, reason: 'provider_not_assigned' };
  }

  const isPatientCallingProvider =
    fromUserId === consultation.patientId && payload.targetUserId === consultation.assignedDoctorId;
  const isProviderCallingPatient =
    fromUserId === consultation.assignedDoctorId && payload.targetUserId === consultation.patientId;
  if (!isPatientCallingProvider && !isProviderCallingPatient) {
    return { allowed: false, reason: 'call_participant_mismatch' };
  }

  if (!consultationAllowsCallMode(consultation.intakeAnswers, payload.mode)) {
    return { allowed: false, reason: 'call_mode_not_allowed' };
  }

  return { allowed: true, reason: '' };
}

function relayCallSignal(
  io: SocketIoServer,
  fromUserId: string,
  event: string,
  payload: CallSignalPayload,
  sender?: { name: string; profileImageUrl: string | null; role: Role }
) {
  io.to(`${SOCKET_ROOM_PREFIXES.USER}${payload.targetUserId}`).emit(event, {
    ...payload,
    fromUserId,
    ...(sender
      ? {
          fromName: sender.name,
          fromImageUrl: sender.profileImageUrl,
          fromRole: sender.role
        }
      : {})
  });
}

async function markConsultationInProgressFromCall(
  io: SocketIoServer,
  fromUserId: string,
  payload: CallSignalPayload
) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: payload.consultationId },
    select: { id: true, status: true, patientId: true, assignedDoctorId: true }
  });
  if (!consultation || consultation.status !== ConsultationStatus.ASSIGNED) return;
  if (consultation.patientId !== fromUserId && consultation.assignedDoctorId !== fromUserId) return;

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: { status: ConsultationStatus.IN_PROGRESS }
  });
  const updatePayload = { consultationId: consultation.id, status: updated.status };
  io.to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultation.id}`).emit(
    SOCKET_EVENTS.CONSULTATION_UPDATED,
    updatePayload
  );
  io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.patientId}`).emit(
    SOCKET_EVENTS.CONSULTATION_UPDATED,
    updatePayload
  );
  if (consultation.assignedDoctorId) {
    io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.assignedDoctorId}`).emit(
      SOCKET_EVENTS.CONSULTATION_UPDATED,
      updatePayload
    );
  }
}

async function findActiveCallSession(input: {
  consultationId: string;
  userA?: string;
  userB?: string;
}) {
  return prisma.consultationCallSession.findFirst({
    where: {
      consultationId: input.consultationId,
      endedAt: null,
      status: { in: [...ACTIVE_CALL_STATUSES] },
      ...(input.userA && input.userB
        ? {
            OR: [
              { initiatedByUserId: input.userA, targetUserId: input.userB },
              { initiatedByUserId: input.userB, targetUserId: input.userA }
            ]
          }
        : {})
    },
    orderBy: { startedAt: 'desc' }
  });
}

async function expireStaleCallSessions(consultationId: string) {
  const now = new Date();
  const setupCutoff = new Date(now.getTime() - CALL_SETUP_STALE_MS);
  const connectedCutoff = new Date(now.getTime() - CONNECTED_CALL_STALE_MS);

  const staleSessions = await prisma.consultationCallSession.findMany({
    where: {
      consultationId,
      endedAt: null,
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

  for (const session of staleSessions) {
    const startedFrom = session.answeredAt ?? session.startedAt;
    const durationSeconds = Math.max(0, Math.round((now.getTime() - startedFrom.getTime()) / 1000));
    await prisma.consultationCallSession.update({
      where: { id: session.id },
      data: {
        activeKey: null,
        status: session.answeredAt ? 'ENDED' : 'FAILED',
        endedAt: now,
        durationSeconds,
        endReason: session.answeredAt ? 'stale_connected_cleanup' : 'stale_setup_cleanup',
        lastSignalEvent: 'call:stale-cleanup',
        metadata: {
          ...((session.metadata as Record<string, unknown> | null) || {}),
          staleCleanupAt: now.toISOString()
        }
      }
    });
  }
}

async function recordCallSignal(
  fromUserId: string,
  event: string,
  payload: CallSignalPayload
): Promise<{ relay: boolean; reason?: string; sessionId?: string }> {
  if (!payload.callId || payload.callId.length > 100) {
    return { relay: false, reason: 'invalid_call_id' };
  }

  // Socket.IO delivers events in order, but the database access check below is asynchronous.
  // Claim the sequence synchronously so a later ICE candidate cannot overtake the offer and
  // make the valid offer look stale.
  // A diagnostic may be submitted after local cleanup reset the sender's sequence. Diagnostics
  // never mutate call state, so keep them observable without allowing them to block lifecycle
  // signaling.
  if (event !== SOCKET_EVENTS.CALL_DIAGNOSTIC && typeof payload.sequence === 'number') {
    const sequenceKey = `${payload.callId}:${fromUserId}`;
    const previous = lastSignalSequences.get(sequenceKey) ?? 0;
    if (!Number.isSafeInteger(payload.sequence) || payload.sequence <= previous) {
      return { relay: false, reason: 'stale_call_signal' };
    }
    lastSignalSequences.set(sequenceKey, payload.sequence);
  }

  const access = await validateCallSignalAccess(fromUserId, payload);
  if (!access.allowed) return { relay: false, reason: access.reason || 'call_not_allowed' };

  if (event === SOCKET_EVENTS.CALL_DIAGNOSTIC) {
    const sessions = await prisma.consultationCallSession.findMany({
      where: {
        consultationId: payload.consultationId,
        OR: [
          { initiatedByUserId: fromUserId, targetUserId: payload.targetUserId },
          { initiatedByUserId: payload.targetUserId, targetUserId: fromUserId }
        ]
      },
      orderBy: { startedAt: 'desc' },
      take: 5
    });
    const session = sessions.find(
      (item) =>
        String(((item.metadata as Record<string, unknown> | null) || {})['callId'] || '') ===
        payload.callId
    );
    // Pre-call failures (for example denied camera/microphone access) can be reported before a
    // session row exists. Create a closed attempt so it remains visible in Call health.
    if (!session) {
      const diagnosticReason = safeCallReason(
        payload.metadata?.['diagnosticReason'] || payload.reason,
        'client_diagnostic'
      );
      if (
        diagnosticReason === 'media_initialization_failed' ||
        diagnosticReason === 'incoming_media_initialization_failed'
      ) {
        const failedSession = await prisma.consultationCallSession.create({
          data: {
            consultationId: payload.consultationId,
            initiatedByUserId: fromUserId,
            targetUserId: payload.targetUserId,
            mode: payload.mode || 'audio',
            status: 'FAILED',
            endedAt: new Date(),
            durationSeconds: 0,
            endReason: diagnosticReason,
            lastSignalEvent: event,
            metadata: {
              callId: payload.callId,
              diagnosticReportedByUserId: fromUserId,
              ...safeCallEventMetadata(payload.metadata)
            }
          }
        });
        return { relay: true, sessionId: failedSession.id };
      }
      return { relay: true };
    }
    await prisma.consultationCallSession.update({
      where: { id: session.id },
      data: {
        metadata: {
          ...((session.metadata as Record<string, unknown> | null) || {}),
          ...safeCallEventMetadata(payload.metadata),
          diagnosticReportedAt: new Date().toISOString(),
          diagnosticReportedByUserId: fromUserId
        }
      }
    });
    return { relay: true, sessionId: session.id };
  }

  if (event === SOCKET_EVENTS.CALL_RING || event === SOCKET_EVENTS.CALL_OFFER) {
    await expireStaleCallSessions(payload.consultationId);

    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (existing) {
      const existingCallId = String(
        ((existing.metadata as Record<string, unknown> | null) || {})['callId'] || ''
      );
      if (existingCallId && existingCallId !== payload.callId) {
        return { relay: false, reason: 'active_call_exists', sessionId: existing.id };
      }
      const isSameInitiator = existing.initiatedByUserId === fromUserId;
      const isIceRestart =
        event === SOCKET_EVENTS.CALL_OFFER && payload.metadata?.['iceRestart'] === true;
      if (!isSameInitiator && !isIceRestart) {
        return { relay: false, reason: 'active_call_exists', sessionId: existing.id };
      }
      await prisma.consultationCallSession.update({
        where: { id: existing.id },
        data: {
          mode: payload.mode || existing.mode,
          status: isIceRestart
            ? 'RECONNECTING'
            : event === SOCKET_EVENTS.CALL_OFFER
              ? 'CONNECTING'
              : existing.status,
          lastSignalEvent: event,
          ...(isIceRestart ? { reconnectCount: { increment: 1 } } : {}),
          metadata: {
            ...((existing.metadata as Record<string, unknown> | null) || {}),
            ...safeCallEventMetadata(payload.metadata),
            callId: payload.callId,
            lastSignalFromUserId: fromUserId
          }
        }
      });
      return { relay: true, sessionId: existing.id };
    }

    const consultationActive = await findActiveCallSession({
      consultationId: payload.consultationId
    });
    if (consultationActive) {
      return {
        relay: false,
        reason: 'consultation_call_already_active',
        sessionId: consultationActive.id
      };
    }

    try {
      const created = await prisma.consultationCallSession.create({
        data: {
          consultationId: payload.consultationId,
          activeKey: payload.consultationId,
          initiatedByUserId: fromUserId,
          targetUserId: payload.targetUserId,
          mode: payload.mode || 'audio',
          status: event === SOCKET_EVENTS.CALL_OFFER ? 'CONNECTING' : 'RINGING',
          lastSignalEvent: event,
          metadata: {
            startedByUserId: fromUserId,
            targetUserId: payload.targetUserId,
            callId: payload.callId,
            ...safeCallEventMetadata(payload.metadata)
          }
        }
      });
      return { relay: true, sessionId: created.id };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const concurrent = await findActiveCallSession({
        consultationId: payload.consultationId,
        userA: fromUserId,
        userB: payload.targetUserId
      });
      return concurrent?.initiatedByUserId === fromUserId
        ? { relay: true, sessionId: concurrent.id }
        : {
            relay: false,
            reason: 'consultation_call_already_active',
            sessionId: concurrent?.id
          };
    }
  }

  if (event === SOCKET_EVENTS.CALL_ANSWER) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (!existing) return { relay: true };
    const existingCallId = String(
      ((existing.metadata as Record<string, unknown> | null) || {})['callId'] || ''
    );
    if (existingCallId && existingCallId !== payload.callId) {
      return { relay: false, reason: 'stale_call_signal', sessionId: existing.id };
    }
    await prisma.consultationCallSession.update({
      where: { id: existing.id },
      data: {
        status: 'CONNECTED',
        answeredAt: existing.answeredAt ?? new Date(),
        lastSignalEvent: event,
        metadata: {
          ...((existing.metadata as Record<string, unknown> | null) || {}),
          answeredByUserId: fromUserId
        }
      }
    });
    return { relay: true, sessionId: existing.id };
  }

  if (event === SOCKET_EVENTS.CALL_HEARTBEAT) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (!existing) return { relay: false, reason: 'call_not_active' };
    const existingCallId = String(
      ((existing.metadata as Record<string, unknown> | null) || {})['callId'] || ''
    );
    if (existingCallId && existingCallId !== payload.callId) {
      return { relay: false, reason: 'stale_call_signal', sessionId: existing.id };
    }
    await prisma.consultationCallSession.update({
      where: { id: existing.id },
      data: { lastSignalEvent: event }
    });
    return { relay: true, sessionId: existing.id };
  }

  if (event === SOCKET_EVENTS.CALL_END || event === SOCKET_EVENTS.CALL_REJECT) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (!existing) return { relay: true };
    const existingCallId = String(
      ((existing.metadata as Record<string, unknown> | null) || {})['callId'] || ''
    );
    if (existingCallId && existingCallId !== payload.callId) {
      return { relay: false, reason: 'stale_call_signal', sessionId: existing.id };
    }
    const endedAt = new Date();
    const startedFrom = existing.answeredAt ?? existing.startedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedFrom.getTime()) / 1000)
    );
    const quality = callQualitySnapshot(payload.metadata);
    await prisma.consultationCallSession.update({
      where: { id: existing.id },
      data: {
        activeKey: null,
        status:
          event === SOCKET_EVENTS.CALL_REJECT
            ? 'REJECTED'
            : existing.answeredAt
              ? 'ENDED'
              : 'FAILED',
        endedAt,
        durationSeconds,
        endReason: safeCallReason(
          payload.reason,
          event === SOCKET_EVENTS.CALL_REJECT
            ? 'rejected'
            : existing.answeredAt
              ? 'ended'
              : 'not_connected'
        ),
        lastSignalEvent: event,
        ...quality,
        metadata: {
          ...((existing.metadata as Record<string, unknown> | null) || {}),
          endedByUserId: fromUserId,
          ...safeCallEventMetadata(payload.metadata)
        }
      }
    });
    if (event === SOCKET_EVENTS.CALL_END) {
      void maybeNotifyCallReliabilityIssue(payload.reason).catch((error) =>
        console.warn('[call-health] Reliability alert check failed', error)
      );
    }
    lastSignalSequences.delete(`${payload.callId}:${fromUserId}`);
    lastSignalSequences.delete(`${payload.callId}:${payload.targetUserId}`);
    return { relay: true, sessionId: existing.id };
  }

  if (event === SOCKET_EVENTS.CALL_RING_ACK) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    return { relay: true, sessionId: existing?.id };
  }

  return { relay: true };
}

export function registerOnlineDoctorSockets(io: SocketIoServer, socket: Socket, userId?: string) {
  if (!userId) return;

  const trackCallEvent = (
    payload: CallSignalPayload,
    event: string,
    outcome: 'ACCEPTED' | 'REJECTED' | 'OBSERVED' | 'ERROR',
    options: { reason?: string; sessionId?: string } = {}
  ) => {
    void recordCallTimelineEvent({
      sessionId: options.sessionId,
      consultationId: payload.consultationId,
      callId: payload.callId,
      actorUserId: userId,
      targetUserId: payload.targetUserId,
      event,
      outcome,
      reason: options.reason || payload.reason,
      sequence: payload.sequence,
      clientTimestamp: payload.clientTimestamp,
      metadata: payload.metadata
    }).catch((error) => console.error('[call-timeline] Could not record call event', error));
  };

  socket.on(SOCKET_EVENTS.SUBSCRIBE_ONLINE_DOCTORS, () => {
    void socket.join(SOCKET_ROOM_PREFIXES.ONLINE_DOCTORS_WATCHERS);
  });

  socket.on(SOCKET_EVENTS.DOCTOR_HEARTBEAT, async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== Role.DOCTOR) return;
    void socket.join(SOCKET_ROOM_PREFIXES.DOCTORS_LIVE);
    await heartbeatDoctor(userId, io);
  });

  socket.on('disconnect', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== Role.DOCTOR) return;
    scheduleDoctorOfflineAfterDisconnect(userId, io);
  });

  socket.on(SOCKET_EVENTS.CALL_SYNC, (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const payload = raw as CallSignalPayload;
    if (
      typeof payload.consultationId !== 'string' ||
      typeof payload.targetUserId !== 'string' ||
      typeof payload.callId !== 'string'
    ) {
      return;
    }
    void validateCallSignalAccess(userId, payload)
      .then(async (access) => {
        if (!access.allowed) {
          trackCallEvent(payload, SOCKET_EVENTS.CALL_SYNC, 'REJECTED', {
            reason: access.reason
          });
          socket.emit(SOCKET_EVENTS.CALL_STATE, {
            consultationId: payload.consultationId,
            callId: payload.callId,
            active: false,
            reason: access.reason
          });
          return;
        }
        const session = await findActiveCallSession({
          consultationId: payload.consultationId,
          userA: userId,
          userB: payload.targetUserId
        });
        const storedCallId = String(
          ((session?.metadata as Record<string, unknown> | null) || {})['callId'] || ''
        );
        const resolvedCallId = storedCallId || payload.callId;
        socket.emit(SOCKET_EVENTS.CALL_STATE, {
          consultationId: payload.consultationId,
          callId: resolvedCallId,
          active: Boolean(session && (!storedCallId || storedCallId === payload.callId)),
          status: session?.status || null,
          mode: session?.mode || payload.mode || null,
          lastAcceptedSequence: lastSignalSequences.get(`${resolvedCallId}:${userId}`) ?? 0,
          reason: session ? undefined : 'call_not_active'
        });
        trackCallEvent(payload, SOCKET_EVENTS.CALL_SYNC, 'ACCEPTED', {
          sessionId: session?.id
        });
      })
      .catch((error) => {
        trackCallEvent(payload, SOCKET_EVENTS.CALL_SYNC, 'ERROR', {
          reason: 'server_processing_error'
        });
        console.error('[call-sync] Could not restore call state', error);
      });
  });

  const callEvents: Array<{ event: string; relay: string }> = [
    { event: SOCKET_EVENTS.CALL_OFFER, relay: SOCKET_EVENTS.CALL_OFFER },
    { event: SOCKET_EVENTS.CALL_ANSWER, relay: SOCKET_EVENTS.CALL_ANSWER },
    { event: SOCKET_EVENTS.CALL_ICE, relay: SOCKET_EVENTS.CALL_ICE },
    { event: SOCKET_EVENTS.CALL_END, relay: SOCKET_EVENTS.CALL_END },
    { event: SOCKET_EVENTS.CALL_REJECT, relay: SOCKET_EVENTS.CALL_REJECT },
    { event: SOCKET_EVENTS.CALL_RING, relay: SOCKET_EVENTS.CALL_RING },
    { event: SOCKET_EVENTS.CALL_RING_ACK, relay: SOCKET_EVENTS.CALL_RING_ACK },
    { event: SOCKET_EVENTS.CALL_HEARTBEAT, relay: SOCKET_EVENTS.CALL_HEARTBEAT },
    { event: SOCKET_EVENTS.CALL_MEDIA_STATE, relay: SOCKET_EVENTS.CALL_MEDIA_STATE },
    { event: SOCKET_EVENTS.CALL_DIAGNOSTIC, relay: SOCKET_EVENTS.CALL_DIAGNOSTIC }
  ];

  for (const { event, relay } of callEvents) {
    socket.on(event, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const payload = raw as CallSignalPayload;
      if (typeof payload.consultationId !== 'string' || typeof payload.targetUserId !== 'string')
        return;
      if (!consumeSignalQuota(userId, event)) {
        trackCallEvent(payload, event, 'REJECTED', { reason: 'rate_limited' });
        socket.emit(SOCKET_EVENTS.CALL_REJECT, {
          consultationId: payload.consultationId,
          targetUserId: payload.targetUserId,
          fromUserId: payload.targetUserId,
          reason: 'rate_limited'
        });
        return;
      }
      void recordCallSignal(userId, event, payload)
        .then(async (result) => {
          trackCallEvent(
            payload,
            event,
            event === SOCKET_EVENTS.CALL_DIAGNOSTIC
              ? 'OBSERVED'
              : result.relay
                ? 'ACCEPTED'
                : 'REJECTED',
            { reason: result.reason, sessionId: result.sessionId }
          );
          if (!result.relay) {
            socket.emit(SOCKET_EVENTS.CALL_REJECT, {
              consultationId: payload.consultationId,
              targetUserId: payload.targetUserId,
              fromUserId: payload.targetUserId,
              reason: result.reason || 'call_unavailable'
            });
            return;
          }
          if (event === SOCKET_EVENTS.CALL_RING || event === SOCKET_EVENTS.CALL_OFFER) {
            void markConsultationInProgressFromCall(io, userId, payload);
          }
          const sender =
            event === SOCKET_EVENTS.CALL_RING || event === SOCKET_EVENTS.CALL_OFFER
              ? await prisma.user.findUnique({
                  where: { id: userId },
                  select: { name: true, profileImageUrl: true, role: true }
                })
              : null;
          if (event === SOCKET_EVENTS.CALL_RING) {
            void sendIncomingCallPush({
              targetUserId: payload.targetUserId,
              consultationId: payload.consultationId,
              fromName: sender?.name,
              mode: payload.mode
            }).catch((error) => console.warn('[push] Incoming call push failed', error));
          }
          relayCallSignal(io, userId, relay, payload, sender ?? undefined);
        })
        .catch((error) => {
          trackCallEvent(payload, event, 'ERROR', { reason: 'server_processing_error' });
          socket.emit(SOCKET_EVENTS.CALL_REJECT, {
            consultationId: payload.consultationId,
            targetUserId: payload.targetUserId,
            fromUserId: payload.targetUserId,
            callId: payload.callId,
            reason: 'server_processing_error'
          });
          console.error('[call-signal] Could not process signal', error);
        });
    });
  }
}
