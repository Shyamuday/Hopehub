import type { Server as SocketIoServer } from 'socket.io';
import {
  ConsultationMode,
  ConsultationStatus,
  Prisma,
  LivePresenceStatus,
  OnlineDoctorCategory,
  Role,
  CareTeamMemberType
} from '@prisma/client';
import {
  INSTANT_ASSIGNMENT_RESPONSE_TIMEOUT_MS,
  ONLINE_HEARTBEAT_TTL_MS
} from '../constants/online-doctor.constants.js';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { prisma } from '../db.js';
import {
  capabilitiesForDoctorProfile,
  doctorTypeLabel,
  specialtyFocusLabel
} from '../constants/homeopathic-doctor-types.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../utils/profile-image-url.js';

let onlineDoctorPresenceSocket: SocketIoServer | null = null;
let waitingAssignmentDrain: Promise<unknown> | null = null;
let queuedWaitingAssignmentDrain: { io: SocketIoServer; reason: string } | null = null;
let lastWaitingAssignmentDrainAt = 0;
const WAITING_ASSIGNMENT_DRAIN_THROTTLE_MS = 5_000;
const scheduledOfflineTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function setOnlineDoctorPresenceSocket(io: SocketIoServer) {
  onlineDoctorPresenceSocket = io;
}

export function cancelScheduledDoctorOffline(userId: string) {
  const timer = scheduledOfflineTimers.get(userId);
  if (timer) clearTimeout(timer);
  scheduledOfflineTimers.delete(userId);
}

export function scheduleDoctorOfflineAfterDisconnect(userId: string, io?: SocketIoServer) {
  cancelScheduledDoctorOffline(userId);
  const realtime = io ?? onlineDoctorPresenceSocket;

  const schedulePresenceCheck = (delayMs: number) => {
    scheduledOfflineTimers.set(
      userId,
      setTimeout(() => {
        void checkPresence().catch((error) => {
          scheduledOfflineTimers.delete(userId);
          console.error('Failed to reconcile provider presence after disconnect', {
            userId,
            error
          });
        });
      }, delayMs)
    );
  };

  const checkPresence = async () => {
    scheduledOfflineTimers.delete(userId);
    const session = await prisma.doctorOnlineSession.findUnique({
      where: { userId },
      include: liveDoctorInclude
    });
    if (!session || session.liveStatus === LivePresenceStatus.OFFLINE) return;

    const heartbeatAge = session.lastHeartbeatAt
      ? Date.now() - session.lastHeartbeatAt.getTime()
      : ONLINE_HEARTBEAT_TTL_MS + 1;
    if (heartbeatAge <= ONLINE_HEARTBEAT_TTL_MS) {
      const remaining = ONLINE_HEARTBEAT_TTL_MS - heartbeatAge + 500;
      schedulePresenceCheck(remaining);
      return;
    }

    const expired = await prisma.doctorOnlineSession.updateMany({
      where: {
        id: session.id,
        liveStatus: { not: LivePresenceStatus.OFFLINE },
        OR: [
          { lastHeartbeatAt: null },
          { lastHeartbeatAt: { lt: new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS) } }
        ]
      },
      data: { liveStatus: LivePresenceStatus.OFFLINE, wentLiveAt: null }
    });
    if (!expired.count || !realtime) return;
    const updated = await prisma.doctorOnlineSession.findUnique({
      where: { id: session.id },
      include: liveDoctorInclude
    });
    if (updated) broadcastPresence(realtime, updated);
  };

  schedulePresenceCheck(ONLINE_HEARTBEAT_TTL_MS + 500);
}

export async function expireStaleDoctorPresence(io?: SocketIoServer) {
  const cutoff = new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS);
  const staleSessions = await prisma.doctorOnlineSession.findMany({
    where: {
      liveStatus: { not: LivePresenceStatus.OFFLINE },
      OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: cutoff } }]
    },
    select: { id: true, userId: true }
  });
  if (!staleSessions.length) return 0;

  const realtime = io ?? onlineDoctorPresenceSocket;
  let expiredCount = 0;
  for (const session of staleSessions) {
    const expired = await prisma.doctorOnlineSession.updateMany({
      where: {
        id: session.id,
        liveStatus: { not: LivePresenceStatus.OFFLINE },
        OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: cutoff } }]
      },
      data: { liveStatus: LivePresenceStatus.OFFLINE, wentLiveAt: null }
    });
    if (!expired.count) continue;

    expiredCount += expired.count;
    cancelScheduledDoctorOffline(session.userId);
    realtime
      ?.to(SOCKET_ROOM_PREFIXES.ONLINE_DOCTORS_WATCHERS)
      .emit(SOCKET_EVENTS.DOCTOR_OFFLINE, { userId: session.userId });
  }

  return expiredCount;
}

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
      profileImageUrl: true,
      isActive: true
    }
  },
  doctor: {
    select: {
      specialty: true,
      doctorType: true,
      specialtyFocus: true,
      bio: true,
      yearsOfExperience: true,
      focusAreas: true,
      isAvailable: true,
      showOnWebsite: true,
      suspendedAt: true,
      mentalHealthProfile: {
        select: {
          careTeamType: true,
          careTeamTypes: true
        }
      }
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
  acceptsVideoCall: boolean;
  lastHeartbeatAt: Date | null;
  wentLiveAt: Date | null;
  user: {
    id: string;
    name: string;
    profileImageKey: string | null;
    profileImageUrl?: string | null;
    isActive: boolean;
  };
  doctor: {
    specialty: string;
    doctorType: import('@prisma/client').HomeopathicDoctorType;
    specialtyFocus: import('@prisma/client').HomeopathicSpecialtyFocus | null;
    bio: string | null;
    yearsOfExperience: number | null;
    focusAreas: string[];
    isAvailable: boolean;
    showOnWebsite: boolean;
    suspendedAt: Date | null;
    mentalHealthProfile?: {
      careTeamType: CareTeamMemberType;
      careTeamTypes: CareTeamMemberType[];
    } | null;
  };
}) {
  const capabilities = capabilitiesForDoctorProfile(session.doctor);
  const profileImageUrl = enrichWithProfileImageUrl(
    {
      id: session.user.id,
      profileImageKey: session.user.profileImageKey,
      profileImageUrl: session.user.profileImageUrl
    },
    userProfileImagePath
  ).profileImageUrl;

  return {
    userId: session.userId,
    name: session.user.name,
    profileImageUrl,
    specialty: session.doctor.specialty,
    doctorType: session.doctor.doctorType,
    doctorTypeLabel: doctorTypeLabel(session.doctor.doctorType),
    mentalHealthProfile: session.doctor.mentalHealthProfile
      ? {
          careTeamType: session.doctor.mentalHealthProfile.careTeamType,
          careTeamTypes: session.doctor.mentalHealthProfile.careTeamTypes
        }
      : null,
    specialtyFocusLabel: specialtyFocusLabel(session.doctor.specialtyFocus),
    category: capabilities.diseaseSpecialtySettings
      ? session.category
      : OnlineDoctorCategory.GENERALIST,
    specialtyDiseaseIds: capabilities.diseaseSpecialtySettings ? session.specialtyDiseaseIds : [],
    liveStatus: session.liveStatus,
    acceptsChat: session.acceptsChat,
    acceptsVoiceCall: session.acceptsVoiceCall,
    acceptsVideoCall: session.acceptsVideoCall,
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
      liveStatus: LivePresenceStatus.ONLINE,
      lastHeartbeatAt: { gte: cutoff },
      user: { isActive: true, role: Role.DOCTOR },
      doctor: {
        isAvailable: true,
        showOnWebsite: true,
        suspendedAt: null,
        employeeStatus: 'ACTIVE'
      },
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
    acceptsVideoCall?: boolean;
  },
  io?: SocketIoServer
) {
  cancelScheduledDoctorOffline(userId);
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
      acceptsVideoCall: payload.acceptsVideoCall ?? session.acceptsVideoCall,
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

  const realtime = io ?? onlineDoctorPresenceSocket;
  if (realtime) broadcastPresence(realtime, updated);
  if (payload.liveStatus === LivePresenceStatus.ONLINE && realtime) {
    scheduleWaitingInstantAssignments(realtime, 'provider went online', true);
  }
  return mapLiveDoctor(updated);
}

export async function heartbeatDoctor(userId: string, io?: SocketIoServer) {
  cancelScheduledDoctorOffline(userId);
  const session = await ensureDoctorOnlineSession(userId);
  if (!session || session.liveStatus === LivePresenceStatus.OFFLINE) return null;

  const updated = await prisma.doctorOnlineSession.update({
    where: { id: session.id },
    data: { lastHeartbeatAt: new Date() },
    include: liveDoctorInclude
  });
  const realtime = io ?? onlineDoctorPresenceSocket;
  if (realtime) {
    broadcastPresence(realtime, updated);
    scheduleWaitingInstantAssignments(realtime, 'provider heartbeat');
  }
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

export async function markDoctorBusy(
  userId: string,
  status: 'BUSY' | 'ON_CALL',
  io?: SocketIoServer
) {
  const session = await prisma.doctorOnlineSession.findUnique({ where: { userId } });
  if (!session) return;
  const updated = await prisma.doctorOnlineSession.update({
    where: { id: session.id },
    data: { liveStatus: status, lastHeartbeatAt: new Date() },
    include: liveDoctorInclude
  });
  const realtime = io ?? onlineDoctorPresenceSocket;
  if (realtime) broadcastPresence(realtime, updated);
}

export async function claimDoctorForInstantConsultation(
  tx: Prisma.TransactionClient,
  userId: string,
  mode?: LiveConnectMode
) {
  const claimed = await tx.doctorOnlineSession.updateMany({
    where: {
      userId,
      enabled: true,
      liveStatus: LivePresenceStatus.ONLINE,
      lastHeartbeatAt: { gte: new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS) },
      ...(mode ? liveConnectModeWhere(mode) : {})
    },
    data: { liveStatus: LivePresenceStatus.BUSY, lastHeartbeatAt: new Date() }
  });
  return claimed.count === 1;
}

export async function restoreDoctorOnlineAfterInstantConsultation(
  userId: string,
  io?: SocketIoServer
) {
  const activeConsultations = await prisma.consultation.count({
    where: {
      assignedDoctorId: userId,
      consultationMode: ConsultationMode.INSTANT_ONLINE,
      status: {
        in: [
          ConsultationStatus.ASSIGNED,
          ConsultationStatus.IN_PROGRESS,
          ConsultationStatus.PRESCRIPTION_UPLOADED
        ]
      }
    }
  });
  if (activeConsultations > 0) return false;

  const restored = await prisma.doctorOnlineSession.updateMany({
    where: {
      userId,
      liveStatus: { in: [LivePresenceStatus.BUSY, LivePresenceStatus.ON_CALL] },
      lastHeartbeatAt: { gte: new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS) }
    },
    data: { liveStatus: LivePresenceStatus.ONLINE }
  });
  if (!restored.count) return false;

  const realtime = io ?? onlineDoctorPresenceSocket;
  if (realtime) {
    const session = await prisma.doctorOnlineSession.findUnique({
      where: { userId },
      include: liveDoctorInclude
    });
    if (session) broadcastPresence(realtime, session);
    scheduleWaitingInstantAssignments(realtime, 'session ended', true);
  }
  return true;
}

export async function releaseInstantConsultationAssignment(input: {
  consultationId: string;
  providerUserId: string;
  reason: string;
  io: SocketIoServer;
}) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    select: {
      id: true,
      patientId: true,
      assignedDoctorId: true,
      consultationMode: true,
      status: true,
      intakeAnswers: true
    }
  });
  if (!consultation) return { released: false as const, code: 'NOT_FOUND' as const };
  if (
    consultation.consultationMode !== ConsultationMode.INSTANT_ONLINE ||
    consultation.assignedDoctorId !== input.providerUserId
  ) {
    return { released: false as const, code: 'NOT_ASSIGNED' as const };
  }
  if (consultation.status !== ConsultationStatus.ASSIGNED) {
    return { released: false as const, code: 'ALREADY_STARTED' as const };
  }

  const intake = asRecord(consultation.intakeAnswers);
  const declinedProviderUserIds = Array.from(
    new Set([...asStringList(intake['declinedProviderUserIds']), input.providerUserId])
  );
  const released = await prisma.consultation.updateMany({
    where: {
      id: consultation.id,
      assignedDoctorId: input.providerUserId,
      status: ConsultationStatus.ASSIGNED
    },
    data: {
      assignedDoctorId: null,
      preferredDoctorUserId: null,
      status: ConsultationStatus.PAID,
      intakeAnswers: {
        ...intake,
        declinedProviderUserIds,
        lastProviderDecline: {
          providerUserId: input.providerUserId,
          reason: input.reason,
          declinedAt: new Date().toISOString()
        }
      } as Prisma.InputJsonObject
    }
  });
  if (!released.count) return { released: false as const, code: 'CHANGED' as const };

  await restoreDoctorOnlineAfterInstantConsultation(input.providerUserId, input.io);
  const updatePayload = {
    consultationId: consultation.id,
    status: ConsultationStatus.PAID,
    assignedDoctorId: null
  };
  input.io
    .to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.patientId}`)
    .emit(SOCKET_EVENTS.CONSULTATION_UPDATED, updatePayload);
  input.io
    .to(`${SOCKET_ROOM_PREFIXES.USER}${input.providerUserId}`)
    .emit(SOCKET_EVENTS.CONSULTATION_UPDATED, updatePayload);
  input.io
    .to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultation.id}`)
    .emit(SOCKET_EVENTS.CONSULTATION_UPDATED, updatePayload);
  return { released: true as const, code: 'RELEASED' as const };
}

async function expireUnacceptedInstantAssignments(io: SocketIoServer, limit = 20) {
  const stale = await prisma.consultation.findMany({
    where: {
      consultationMode: ConsultationMode.INSTANT_ONLINE,
      status: ConsultationStatus.ASSIGNED,
      assignedDoctorId: { not: null },
      updatedAt: { lte: new Date(Date.now() - INSTANT_ASSIGNMENT_RESPONSE_TIMEOUT_MS) }
    },
    select: { id: true, assignedDoctorId: true },
    orderBy: { updatedAt: 'asc' },
    take: Math.max(1, Math.min(limit, 50))
  });
  let releasedCount = 0;
  for (const consultation of stale) {
    if (!consultation.assignedDoctorId) continue;
    const result = await releaseInstantConsultationAssignment({
      consultationId: consultation.id,
      providerUserId: consultation.assignedDoctorId,
      reason: 'Provider did not respond before the incoming request expired',
      io
    });
    if (result.released) releasedCount += 1;
  }
  return releasedCount;
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
      doctor: {
        isAvailable: true,
        showOnWebsite: true,
        suspendedAt: null,
        employeeStatus: 'ACTIVE'
      },
      OR: [
        { category: OnlineDoctorCategory.GENERALIST },
        { specialtyDiseaseIds: { has: diseaseId } }
      ]
    }
  });
  return Boolean(session);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
    : [];
}

function isHopeHubQuickTalkConsultation(consultation: {
  intakeAnswers: Prisma.JsonValue;
  pricingSnapshot: Prisma.JsonValue | null;
}) {
  const intake = asRecord(consultation.intakeAnswers);
  const pricing = asRecord(consultation.pricingSnapshot);
  return (
    intake['source'] === 'hope-hub-quick-talk' ||
    pricing['source'] === 'hope-hub-quick-talk' ||
    intake['quickTalk'] === true
  );
}

type LiveConnectMode = 'chat' | 'voice' | 'video';

class InstantProviderUnavailableError extends Error {}

type AssignedInstantConsultation = Prisma.ConsultationGetPayload<{
  include: { disease: { select: { name: true } } };
}>;

function normalizeLiveConnectMode(value: unknown): LiveConnectMode {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('video')) return 'video';
  if (raw.includes('chat') || raw.includes('message')) return 'chat';
  return 'voice';
}

function liveConnectModeWhere(mode: LiveConnectMode) {
  if (mode === 'chat') return { acceptsChat: true };
  if (mode === 'video') return { acceptsVideoCall: true };
  return { acceptsVoiceCall: true };
}

async function isHopeHubProviderLiveForInstant(userId: string, mode: LiveConnectMode) {
  const cutoff = new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS);
  const session = await prisma.doctorOnlineSession.findFirst({
    where: {
      userId,
      enabled: true,
      liveStatus: LivePresenceStatus.ONLINE,
      lastHeartbeatAt: { gte: cutoff },
      ...liveConnectModeWhere(mode),
      user: { isActive: true, role: Role.DOCTOR },
      doctor: {
        isAvailable: true,
        showOnWebsite: true,
        suspendedAt: null,
        employeeStatus: 'ACTIVE',
        mentalHealthProfile: { is: { acceptingNewUsers: true, autoMatchEnabled: true } }
      }
    }
  });
  return Boolean(session);
}

async function findBestHopeHubLiveProvider(consultation: {
  intakeAnswers: Prisma.JsonValue;
  preferredDoctorUserId: string | null;
}) {
  const intake = asRecord(consultation.intakeAnswers);
  const mode = normalizeLiveConnectMode(intake['sessionMode']);
  const declinedProviderUserIds = asStringList(intake['declinedProviderUserIds']);
  if (
    consultation.preferredDoctorUserId &&
    !declinedProviderUserIds.includes(consultation.preferredDoctorUserId) &&
    (await isHopeHubProviderLiveForInstant(consultation.preferredDoctorUserId, mode))
  ) {
    return consultation.preferredDoctorUserId;
  }

  const language = String(intake['preferredLanguage'] || '').trim();
  const gender = String(intake['preferredProviderGender'] || '').trim();
  const concern = String(intake['concernCategory'] || '').trim();

  async function queryBest(opts: { includeConcern: boolean }) {
    const session = await prisma.doctorOnlineSession.findFirst({
      where: {
        ...(declinedProviderUserIds.length ? { userId: { notIn: declinedProviderUserIds } } : {}),
        enabled: true,
        liveStatus: LivePresenceStatus.ONLINE,
        lastHeartbeatAt: { gte: new Date(Date.now() - ONLINE_HEARTBEAT_TTL_MS) },
        ...liveConnectModeWhere(mode),
        user: { isActive: true, role: Role.DOCTOR },
        doctor: {
          isAvailable: true,
          showOnWebsite: true,
          suspendedAt: null,
          employeeStatus: 'ACTIVE',
          ...(gender && gender !== 'PREFER_NOT_TO_SAY' ? { user: { gender: gender as any } } : {}),
          mentalHealthProfile: {
            is: {
              acceptingNewUsers: true,
              autoMatchEnabled: true,
              ...(language ? { languages: { has: language } } : {}),
              ...(opts.includeConcern && concern ? { concernsHandled: { has: concern } } : {})
            }
          }
        }
      },
      orderBy: [{ wentLiveAt: 'asc' }, { updatedAt: 'asc' }]
    });
    return session?.userId ?? null;
  }

  return (
    (await queryBest({ includeConcern: true })) ?? (await queryBest({ includeConcern: false }))
  );
}

export async function findBestLiveDoctor(diseaseId: string, excludedUserIds: string[] = []) {
  const doctors = await listLiveOnlineDoctors({ diseaseId });
  const specialist = doctors.find(
    (d) =>
      !excludedUserIds.includes(d.userId) &&
      d.category === OnlineDoctorCategory.SPECIALIST &&
      d.liveStatus === LivePresenceStatus.ONLINE
  );
  if (specialist) return specialist.userId;
  const generalist = doctors.find(
    (d) =>
      !excludedUserIds.includes(d.userId) &&
      d.category === OnlineDoctorCategory.GENERALIST &&
      d.liveStatus === LivePresenceStatus.ONLINE
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

  const isHopeHubQuickTalk = isHopeHubQuickTalkConsultation(consultation);
  const declinedProviderUserIds = asStringList(
    asRecord(consultation.intakeAnswers)['declinedProviderUserIds']
  );
  let doctorUserId = isHopeHubQuickTalk
    ? await findBestHopeHubLiveProvider(consultation)
    : consultation.preferredDoctorUserId;
  if (
    !isHopeHubQuickTalk &&
    doctorUserId &&
    (declinedProviderUserIds.includes(doctorUserId) ||
      !(await isDoctorLiveForInstant(doctorUserId, consultation.diseaseId)))
  ) {
    doctorUserId = null;
  }
  if (!doctorUserId && !isHopeHubQuickTalk) {
    doctorUserId = await findBestLiveDoctor(consultation.diseaseId, declinedProviderUserIds);
  }
  if (!doctorUserId) return null;

  const doctor = await prisma.user.findFirstOrThrow({
    where: { id: doctorUserId, role: Role.DOCTOR, isActive: true }
  });

  const mode = isHopeHubQuickTalk
    ? normalizeLiveConnectMode(asRecord(consultation.intakeAnswers)['sessionMode'])
    : undefined;
  let updated: AssignedInstantConsultation | null = null;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const assigned = await tx.consultation.updateMany({
        where: {
          id: consultationId,
          status: ConsultationStatus.PAID,
          assignedDoctorId: null
        },
        data: {
          assignedDoctorId: doctor.id,
          status: ConsultationStatus.ASSIGNED,
          clinicStoreId: null
        }
      });
      if (!assigned.count) return null;

      const claimed = await claimDoctorForInstantConsultation(tx, doctor.id, mode);
      if (!claimed) throw new InstantProviderUnavailableError();
      return tx.consultation.findUnique({
        where: { id: consultationId },
        include: { disease: { select: { name: true } } }
      });
    });
  } catch (error) {
    if (error instanceof InstantProviderUnavailableError) return null;
    throw error;
  }
  if (!updated) return null;

  await markDoctorBusy(doctor.id, LivePresenceStatus.BUSY, io);

  const { emitConsultationAssigned } = await import('./consultation-realtime.js');
  emitConsultationAssigned(io, doctor.id, {
    consultationId: updated.id,
    patientCode: consultation.patient.patientCode,
    patientName: consultation.patient.name,
    diseaseName: consultation.disease?.name ?? null,
    status: updated.status,
    consultationMode: ConsultationMode.INSTANT_ONLINE,
    sessionMode:
      mode ?? normalizeLiveConnectMode(asRecord(consultation.intakeAnswers)['sessionMode']),
    responseDeadlineAt: new Date(
      updated.updatedAt.getTime() + INSTANT_ASSIGNMENT_RESPONSE_TIMEOUT_MS
    ).toISOString()
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

export async function tryAssignWaitingInstantConsultations(io: SocketIoServer, limit = 10) {
  await expireUnacceptedInstantAssignments(io);
  const waiting = await prisma.consultation.findMany({
    where: {
      consultationMode: ConsultationMode.INSTANT_ONLINE,
      status: ConsultationStatus.PAID,
      assignedDoctorId: null
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, Math.min(limit, 50))
  });

  let assignedCount = 0;
  for (const consultation of waiting) {
    const assigned = await tryAssignInstantConsultation(io, consultation.id);
    if (assigned) assignedCount += 1;
  }
  return { checkedCount: waiting.length, assignedCount };
}

function scheduleWaitingInstantAssignments(io: SocketIoServer, reason: string, force = false) {
  const now = Date.now();
  if (waitingAssignmentDrain) {
    if (force) queuedWaitingAssignmentDrain = { io, reason };
    return;
  }
  if (!force && now - lastWaitingAssignmentDrainAt < WAITING_ASSIGNMENT_DRAIN_THROTTLE_MS) {
    return;
  }
  lastWaitingAssignmentDrainAt = now;
  waitingAssignmentDrain = tryAssignWaitingInstantConsultations(io)
    .catch((error) => {
      console.error(`[instant] Could not process waiting live requests after ${reason}`, error);
    })
    .finally(() => {
      waitingAssignmentDrain = null;
      const queued = queuedWaitingAssignmentDrain;
      queuedWaitingAssignmentDrain = null;
      if (queued) scheduleWaitingInstantAssignments(queued.io, queued.reason, true);
    });
}
