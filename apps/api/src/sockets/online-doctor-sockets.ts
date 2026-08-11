import type { Server as SocketIoServer, Socket } from 'socket.io';
import { ConsultationStatus, LivePresenceStatus, Role } from '@prisma/client';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { prisma } from '../db.js';
import { heartbeatDoctor, setDoctorLiveStatus } from '../services/online-doctor-presence.js';

type CallSignalPayload = {
  consultationId: string;
  targetUserId: string;
  mode?: string;
  reason?: string;
  sdp?: unknown;
  candidate?: unknown;
  metadata?: Record<string, unknown>;
};

const ACTIVE_CALL_STATUSES = ['RINGING', 'CONNECTING', 'CONNECTED', 'RECONNECTING'] as const;

function safeCallReason(reason: unknown, fallback: string): string {
  if (typeof reason !== 'string') return fallback;
  const trimmed = reason
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 80);
  return trimmed || fallback;
}

function relayCallSignal(
  io: SocketIoServer,
  fromUserId: string,
  event: string,
  payload: CallSignalPayload
) {
  io.to(`${SOCKET_ROOM_PREFIXES.USER}${payload.targetUserId}`).emit(event, {
    ...payload,
    fromUserId
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

async function recordCallSignal(
  fromUserId: string,
  event: string,
  payload: CallSignalPayload
): Promise<{ relay: boolean; reason?: string }> {
  if (event === SOCKET_EVENTS.CALL_RING || event === SOCKET_EVENTS.CALL_OFFER) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (existing) {
      const isSameInitiator = existing.initiatedByUserId === fromUserId;
      if (!isSameInitiator) {
        return { relay: false, reason: 'active_call_exists' };
      }
      await prisma.consultationCallSession.update({
        where: { id: existing.id },
        data: {
          mode: payload.mode || existing.mode,
          status: event === SOCKET_EVENTS.CALL_OFFER ? 'CONNECTING' : existing.status,
          lastSignalEvent: event,
          metadata: {
            ...((existing.metadata as Record<string, unknown> | null) || {}),
            lastSignalFromUserId: fromUserId
          }
        }
      });
      return { relay: true };
    }

    const consultationActive = await findActiveCallSession({
      consultationId: payload.consultationId
    });
    if (consultationActive) {
      return { relay: false, reason: 'consultation_call_already_active' };
    }

    await prisma.consultationCallSession.create({
      data: {
        consultationId: payload.consultationId,
        initiatedByUserId: fromUserId,
        targetUserId: payload.targetUserId,
        mode: payload.mode || 'audio',
        status: event === SOCKET_EVENTS.CALL_OFFER ? 'CONNECTING' : 'RINGING',
        lastSignalEvent: event,
        metadata: {
          startedByUserId: fromUserId,
          targetUserId: payload.targetUserId,
          ...(payload.metadata || {})
        }
      }
    });
    return { relay: true };
  }

  if (event === SOCKET_EVENTS.CALL_ANSWER) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (!existing) return { relay: true };
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
    return { relay: true };
  }

  if (event === SOCKET_EVENTS.CALL_END || event === SOCKET_EVENTS.CALL_REJECT) {
    const existing = await findActiveCallSession({
      consultationId: payload.consultationId,
      userA: fromUserId,
      userB: payload.targetUserId
    });
    if (!existing) return { relay: true };
    const endedAt = new Date();
    const startedFrom = existing.answeredAt ?? existing.startedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedFrom.getTime()) / 1000)
    );
    await prisma.consultationCallSession.update({
      where: { id: existing.id },
      data: {
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
        metadata: {
          ...((existing.metadata as Record<string, unknown> | null) || {}),
          endedByUserId: fromUserId,
          ...(payload.metadata || {})
        }
      }
    });
    return { relay: true };
  }

  return { relay: true };
}

export function registerOnlineDoctorSockets(io: SocketIoServer, socket: Socket, userId?: string) {
  if (!userId) return;

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
    const session = await prisma.doctorOnlineSession.findUnique({ where: { userId } });
    if (session && session.liveStatus !== LivePresenceStatus.OFFLINE) {
      await setDoctorLiveStatus(userId, { liveStatus: LivePresenceStatus.OFFLINE }, io);
    }
  });

  const callEvents: Array<{ event: string; relay: string }> = [
    { event: SOCKET_EVENTS.CALL_OFFER, relay: SOCKET_EVENTS.CALL_OFFER },
    { event: SOCKET_EVENTS.CALL_ANSWER, relay: SOCKET_EVENTS.CALL_ANSWER },
    { event: SOCKET_EVENTS.CALL_ICE, relay: SOCKET_EVENTS.CALL_ICE },
    { event: SOCKET_EVENTS.CALL_END, relay: SOCKET_EVENTS.CALL_END },
    { event: SOCKET_EVENTS.CALL_REJECT, relay: SOCKET_EVENTS.CALL_REJECT },
    { event: SOCKET_EVENTS.CALL_RING, relay: SOCKET_EVENTS.CALL_RING }
  ];

  for (const { event, relay } of callEvents) {
    socket.on(event, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const payload = raw as CallSignalPayload;
      if (typeof payload.consultationId !== 'string' || typeof payload.targetUserId !== 'string')
        return;
      void recordCallSignal(userId, event, payload).then((result) => {
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
        relayCallSignal(io, userId, relay, payload);
      });
    });
  }
}
