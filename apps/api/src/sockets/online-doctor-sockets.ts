import type { Server as SocketIoServer, Socket } from 'socket.io';
import { ConsultationStatus, LivePresenceStatus, Role } from '@prisma/client';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { prisma } from '../db.js';
import { heartbeatDoctor, setDoctorLiveStatus } from '../services/online-doctor-presence.js';

type CallSignalPayload = {
  consultationId: string;
  targetUserId: string;
  sdp?: unknown;
  candidate?: unknown;
};

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
      if (event === SOCKET_EVENTS.CALL_RING || event === SOCKET_EVENTS.CALL_OFFER) {
        void markConsultationInProgressFromCall(io, userId, payload);
      }
      relayCallSignal(io, userId, relay, payload);
    });
  }
}
