import type { Server as SocketIoServer } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socket.constants.js';
import { SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';

export type ConsultationAssignedPayload = {
  consultationId: string;
  patientCode?: string | null;
  patientName?: string | null;
  diseaseName?: string | null;
  status: string;
  consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE';
  sessionMode?: 'chat' | 'voice' | 'video';
};

let consultationRealtimeSocket: SocketIoServer | null = null;

export function setConsultationRealtimeSocket(io: SocketIoServer) {
  consultationRealtimeSocket = io;
}

export function emitConsultationAssigned(
  io: SocketIoServer,
  doctorId: string,
  payload: ConsultationAssignedPayload
) {
  io.to(`${SOCKET_ROOM_PREFIXES.USER}${doctorId}`).emit(
    SOCKET_EVENTS.CONSULTATION_ASSIGNED,
    payload
  );
}

export function emitConsultationAssignedToDoctor(
  doctorId: string,
  payload: ConsultationAssignedPayload
) {
  if (!consultationRealtimeSocket) return false;
  emitConsultationAssigned(consultationRealtimeSocket, doctorId, payload);
  return true;
}
