import type { Server as SocketIoServer } from 'socket.io';
import {
  ConsultationMode,
  ConsultationStatus,
  LivePresenceStatus,
  OnlineDoctorCategory,
  Role
} from '@prisma/client';
import { ONLINE_HEARTBEAT_TTL_MS } from '../constants/online-doctor.constants.js';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { prisma } from '../db.js';
import {
  doctorTypeLabel,
  providerTypeLabel,
  specialtyFocusLabel
} from '../constants/homeopathic-doctor-types.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../utils/profile-image-url.js';

export function isHeartbeatFresh(lastHeartbeatAt: Date | null | undefined) {
  if (!lastHeartbeatAt) return false;
  return Date.now() - lastHeartbeatAt.getTime() <= ONLINE_HEARTBEAT_TTL_MS;
}

export async function ensureDoctorOnlineSession(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, userId: true }
  });
  if (!doctor) return null;

  return prisma.doctorOnlineSession.upsert({
    where: { doctorId: doctor.id },
    create: { doctorId: doctor.id, userId: doctor.userId },
    update: {}
  });
}

const liveDoctorInclude = {
  user: {
    select: {
      id: true,
      name: true,
      profileImageKey: true,
      isActive: true
    }
  },
  doctor: {
    select: {
      specialty: true,
      specialization: true,
      providerType: true,
      providerCategory: true,
      doctorType: true,
      specialtyFocus: true,
      bio: true,
      yearsOfExperience: true,
      focusAreas: true,
      isAvailable: true
    }
  }
} as const;

export function mapLiveDoctor(session: {
  id: string;
  userId: string;
  category: OnlineDoctorCategory;
  specialtyDiseaseIds: string[];
  liveStatus: LivePresenceStatus;
  acceptsChat: boolean;
  acceptsVoiceCall: boolean;
  lastHeartbeatAt: Date | null;
  wentLiveAt: Date | null;
  user: { id: string; name: string; profileImageKey: string | null; isActive: boolean };
  doctor: {
    specialty: string;
    specialization: string | null;
    providerType: import('@prisma/client').ProviderType;
    providerCategory: import('@prisma/client').ProviderCategory;
    doctorType: import('@prisma/client').HomeopathicDoctorType;
    specialtyFocus: import('@prisma/client').HomeopathicSpecialtyFocus | null;
    bio: string | null;
    yearsOfExperience: number | null;
    focusAreas: string[];
    isAvailable: boolean;
  };
}) {
  const profileImageUrl = enrichWithProfileImageUrl(
    { id: session.user.id, profileImageKey: session.user.profileImageKey },
    userProfileImagePath
  ).profileImageUrl;

  return {
    userId: session.userId,
    name: session.user.name,
    profileImageUrl,
    specialty: session.doctor.specialty,
    specialization: session.doctor.specialization,
    providerType: session.doctor.providerType,
    providerCategory: session.doctor.providerCategory,
    providerTypeLabel: providerTypeLabel(session.doctor.providerType),
    doctorTypeLabel: doctorTypeLabel(session.doctor.doctorType),
    specialtyFocusLabel: specialtyFocusLabel(session.doctor.specialtyFocus),
    category: session.category,
    specialtyDiseaseIds: session.specialtyDiseaseIds,
    liveStatus: session.liveStatus,
    acceptsChat: session.acceptsChat,
    acceptsVoiceCall: session.acceptsVoiceCall,
    bio: session.doctor.bio,
    yearsOfExperience: session.doctor.yearsOfExperience,
    focusAreas: session.doctor.focusAreas,
    isAvailable: session.doctor.isAvailable,
    wentLiveAt: session.wentLiveAt
  };
}

export async function listLiveOnlineDoctors(filters?: {
  diseaseId?: string;
  category?: OnlineDoctorCategory;
}) {
  const cutoff = new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS);
  const sessions = await prisma.doctorOnlineSession.findMany({
    where: {
      enabled: true,
      liveStatus: { in: [LivePresenceStatus.ONLINE, LivePresenceStatus.ON_CALL] },
      lastHeartbeatAt: { gte: cutoff },
      user: { isActive: true, role: Role.DOCTOR },
      doctor: { isAvailable: true, employeeStatus: 'ACTIVE' },
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.diseaseId
        ? {
            OR: [
              { category: OnlineDoctorCategory.GENERALIST },
              { specialtyDiseaseIds: { has: filters.diseaseId } }
            ]
          }
        : {})
    },
    include: liveDoctorInclude,
    orderBy: [{ liveStatus: 'asc' }, { wentLiveAt: 'asc' }]
  });

  return sessions.map(mapLiveDoctor);
}

export async function setDoctorLiveStatus(
  userId: string,
  payload: {
    liveStatus: LivePresenceStatus;
    acceptsChat?: boolean;
    acceptsVoiceCall?: boolean;
  },
  io?: SocketIoServer
) {
  const session = await ensureDoctorOnlineSession(userId);
  if (!session) return null;

  const now = new Date();
  const updated = await prisma.doctorOnlineSession.update({
    where: { id: session.id },
    data: {
      enabled: true,
      liveStatus: payload.liveStatus,
      acceptsChat: payload.acceptsChat ?? session.acceptsChat,
      acceptsVoiceCall: payload.acceptsVoiceCall ?? session.acceptsVoiceCall,
      lastHeartbeatAt:
        payload.liveStatus === LivePresenceStatus.OFFLINE ? session.lastHeartbeatAt : now,
      wentLiveAt:
        payload.liveStatus === LivePresenceStatus.ONLINE &&
        session.liveStatus === LivePresenceStatus.OFFLINE
          ? now
          : payload.liveStatus === LivePresenceStatus.OFFLINE
            ? null
            : session.wentLiveAt
    },
    include: liveDoctorInclude
  });

  if (io) {
    broadcastPresence(io, updated);
  }
  return mapLiveDoctor(updated);
}

export async function heartbeatDoctor(userId: string, io?: SocketIoServer) {
  const session = await ensureDoctorOnlineSession(userId);
  if (!session || session.liveStatus === LivePresenceStatus.OFFLINE) return null;

  const updated = await prisma.doctorOnlineSession.update({
    where: { id: session.id },
    data: { lastHeartbeatAt: new Date() },
    include: liveDoctorInclude
  });
  if (io) broadcastPresence(io, updated);
  return mapLiveDoctor(updated);
}

export function broadcastPresence(
  io: SocketIoServer,
  session: Parameters<typeof mapLiveDoctor>[0]
) {
  const doctor = mapLiveDoctor(session);
  io.to(SOCKET_ROOM_PREFIXES.ONLINE_DOCTORS_WATCHERS).emit(SOCKET_EVENTS.DOCTOR_PRESENCE, doctor);
  if (
    session.liveStatus === LivePresenceStatus.OFFLINE ||
    !isHeartbeatFresh(session.lastHeartbeatAt)
  ) {
    io.to(SOCKET_ROOM_PREFIXES.ONLINE_DOCTORS_WATCHERS).emit(SOCKET_EVENTS.DOCTOR_OFFLINE, {
      userId: session.userId
    });
  }
}

export async function markDoctorBusy(userId: string, status: 'BUSY' | 'ON_CALL') {
  const session = await prisma.doctorOnlineSession.findUnique({ where: { userId } });
  if (!session) return;
  await prisma.doctorOnlineSession.update({
    where: { id: session.id },
    data: { liveStatus: status, lastHeartbeatAt: new Date() }
  });
}

export async function isDoctorLiveForInstant(userId: string, diseaseId: string) {
  const cutoff = new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS);
  const session = await prisma.doctorOnlineSession.findFirst({
    where: {
      userId,
      enabled: true,
      liveStatus: { in: [LivePresenceStatus.ONLINE, LivePresenceStatus.ON_CALL] },
      lastHeartbeatAt: { gte: cutoff },
      user: { isActive: true },
      doctor: { isAvailable: true, employeeStatus: 'ACTIVE' },
      OR: [
        { category: OnlineDoctorCategory.GENERALIST },
        { specialtyDiseaseIds: { has: diseaseId } }
      ]
    }
  });
  return Boolean(session);
}

export async function findBestLiveDoctor(diseaseId: string) {
  const doctors = await listLiveOnlineDoctors({ diseaseId });
  const specialist = doctors.find(
    (d) =>
      d.category === OnlineDoctorCategory.SPECIALIST && d.liveStatus === LivePresenceStatus.ONLINE
  );
  if (specialist) return specialist.userId;
  const generalist = doctors.find(
    (d) =>
      d.category === OnlineDoctorCategory.GENERALIST && d.liveStatus === LivePresenceStatus.ONLINE
  );
  return generalist?.userId ?? null;
}

export async function tryAssignInstantConsultation(io: SocketIoServer, consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      disease: { select: { name: true } },
      patient: { select: { id: true, name: true, mobile: true, email: true, patientCode: true } }
    }
  });
  if (!consultation || consultation.consultationMode !== ConsultationMode.INSTANT_ONLINE)
    return null;
  if (consultation.status !== ConsultationStatus.PAID || consultation.assignedDoctorId) return null;

  let doctorUserId = consultation.preferredDoctorUserId;
  if (doctorUserId && !(await isDoctorLiveForInstant(doctorUserId, consultation.diseaseId))) {
    doctorUserId = null;
  }
  if (!doctorUserId) {
    doctorUserId = await findBestLiveDoctor(consultation.diseaseId);
  }
  if (!doctorUserId) return null;

  const doctor = await prisma.user.findFirstOrThrow({
    where: { id: doctorUserId, role: Role.DOCTOR, isActive: true }
  });

  const updated = await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      assignedDoctorId: doctor.id,
      status: ConsultationStatus.ASSIGNED,
      clinicStoreId: null
    },
    include: { disease: { select: { name: true } } }
  });

  await markDoctorBusy(doctor.id, LivePresenceStatus.BUSY);

  const { emitConsultationAssigned } = await import('./consultation-realtime.js');
  emitConsultationAssigned(io, doctor.id, {
    consultationId: updated.id,
    patientCode: consultation.patient.patientCode,
    patientName: consultation.patient.name,
    diseaseName: consultation.disease?.name ?? null,
    status: updated.status,
    consultationMode: ConsultationMode.INSTANT_ONLINE
  });

  io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.patientId}`).emit(
    SOCKET_EVENTS.CONSULTATION_UPDATED,
    {
      consultationId: updated.id,
      status: updated.status,
      assignedDoctorId: doctor.id,
      consultationMode: ConsultationMode.INSTANT_ONLINE
    }
  );

  return updated;
}
