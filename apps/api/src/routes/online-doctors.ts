import { Router } from 'express';
import { z } from 'zod';
import type { Server as SocketIoServer } from 'socket.io';
import {
  LivePresenceStatus,
  OnlineDoctorCategory,
  Role,
  ConsultationMode,
  ConsultationStatus,
  Prisma
} from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { capabilitiesForDoctorProfile } from '../constants/homeopathic-doctor-types.js';
import { providerPublicReadiness } from '../doctor-capabilities.js';
import { providerAllowedSessionModes } from '../services/provider-taxonomy.service.js';
import type { ProviderSessionMode } from '@hopehub/contracts';
import { getPublicIceServers } from '../constants/rtc.constants.js';
import { prisma } from '../db.js';
import {
  ensureDoctorOnlineSession,
  heartbeatDoctor,
  listLiveOnlineDoctors,
  mapLiveDoctor,
  restoreDoctorOnlineAfterInstantConsultation,
  setDoctorLiveStatus
} from '../services/online-doctor-presence.js';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function createOnlineDoctorsRouter(io: SocketIoServer) {
  const router = Router();

  const modeAllowed = (modes: readonly ProviderSessionMode[], mode: ProviderSessionMode) =>
    modes.includes(mode);
  const unsupportedModeMessage = (modes: string[]) =>
    `${modes.join(', ')} ${modes.length === 1 ? 'is' : 'are'} not available for your selected provider role.`;

  const profileWithAllowedModes = <T extends ReturnType<typeof mapLiveDoctor>>(
    profile: T,
    allowedModes: ProviderSessionMode[]
  ) => ({
    ...profile,
    allowedModes,
    acceptsChat: modeAllowed(allowedModes, 'CHAT') && profile.acceptsChat,
    acceptsVoiceCall: modeAllowed(allowedModes, 'VOICE') && profile.acceptsVoiceCall,
    acceptsVideoCall: modeAllowed(allowedModes, 'VIDEO') && profile.acceptsVideoCall
  });

  router.get(
    '/online-doctors',
    asyncRoute(async (req, res) => {
      const diseaseId =
        typeof req.query['diseaseId'] === 'string' ? req.query['diseaseId'] : undefined;
      const categoryRaw =
        typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
      const category =
        categoryRaw === OnlineDoctorCategory.GENERALIST ||
        categoryRaw === OnlineDoctorCategory.SPECIALIST
          ? categoryRaw
          : undefined;

      const doctors = await listLiveOnlineDoctors({ diseaseId, category });
      res.json({ doctors, stunServers: getPublicIceServers() });
    })
  );

  router.get(
    '/doctor/online-profile',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const session = await ensureDoctorOnlineSession(req.user!.id);
      if (!session) return res.status(404).json({ message: 'Doctor profile not found.' });

      const full = await prisma.doctorOnlineSession.findUniqueOrThrow({
        where: { id: session.id },
        include: {
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
        }
      });

      const canUseDiseaseSettings = capabilitiesForDoctorProfile(
        full.doctor
      ).diseaseSpecialtySettings;
      const diseases = canUseDiseaseSettings
        ? await prisma.disease.findMany({
            where: { isActive: true },
            select: { id: true, name: true, publicCategory: true },
            orderBy: { name: 'asc' }
          })
        : [];

      const allowedModes = await providerAllowedSessionModes(req.user!.id);
      res.json({
        profile: profileWithAllowedModes(mapLiveDoctor(full), allowedModes),
        diseases,
        stunServers: getPublicIceServers()
      });
    })
  );

  router.put(
    '/doctor/online-profile',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          enabled: z.boolean().optional(),
          category: z.nativeEnum(OnlineDoctorCategory).optional(),
          specialtyDiseaseIds: z.array(z.string().min(1)).max(20).optional(),
          acceptsChat: z.boolean().optional(),
          acceptsVoiceCall: z.boolean().optional(),
          acceptsVideoCall: z.boolean().optional()
        })
        .parse(req.body);

      const session = await ensureDoctorOnlineSession(req.user!.id);
      if (!session) return res.status(404).json({ message: 'Doctor profile not found.' });
      if (body.enabled !== false) {
        const readiness = await providerPublicReadiness(req.user!.id);
        if (!readiness.ready) {
          return res.status(409).json({ message: readiness.message, code: readiness.code });
        }
      }

      const doctor = await prisma.doctor.findUniqueOrThrow({
        where: { userId: req.user!.id },
        select: {
          doctorType: true,
          mentalHealthProfile: { select: { careTeamType: true, careTeamTypes: true } }
        }
      });
      const allowedModes = await providerAllowedSessionModes(req.user!.id);
      const unsupportedRequestedModes = [
        body.acceptsChat && !modeAllowed(allowedModes, 'CHAT') ? 'Chat' : '',
        body.acceptsVoiceCall && !modeAllowed(allowedModes, 'VOICE') ? 'Voice' : '',
        body.acceptsVideoCall && !modeAllowed(allowedModes, 'VIDEO') ? 'Video' : ''
      ].filter(Boolean);
      if (unsupportedRequestedModes.length) {
        return res.status(400).json({
          message: unsupportedModeMessage(unsupportedRequestedModes)
        });
      }
      const canUseDiseaseSettings = capabilitiesForDoctorProfile(doctor).diseaseSpecialtySettings;
      const modeSettings = {
        acceptsChat: modeAllowed(allowedModes, 'CHAT')
          ? (body.acceptsChat ?? session.acceptsChat)
          : false,
        acceptsVoiceCall: modeAllowed(allowedModes, 'VOICE')
          ? (body.acceptsVoiceCall ?? session.acceptsVoiceCall)
          : false,
        acceptsVideoCall: modeAllowed(allowedModes, 'VIDEO')
          ? (body.acceptsVideoCall ?? session.acceptsVideoCall)
          : false
      };
      const updateData = canUseDiseaseSettings
        ? { ...body, ...modeSettings }
        : {
            ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
            ...modeSettings
          };

      const updated = await prisma.doctorOnlineSession.update({
        where: { id: session.id },
        data: updateData,
        include: {
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
        }
      });

      res.json({ profile: profileWithAllowedModes(mapLiveDoctor(updated), allowedModes) });
    })
  );

  router.put(
    '/doctor/online-status',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          liveStatus: z.nativeEnum(LivePresenceStatus),
          acceptsChat: z.boolean().optional(),
          acceptsVoiceCall: z.boolean().optional(),
          acceptsVideoCall: z.boolean().optional()
        })
        .parse(req.body);

      const session = await ensureDoctorOnlineSession(req.user!.id);
      if (!session) return res.status(404).json({ message: 'Doctor profile not found.' });
      const allowedModes = await providerAllowedSessionModes(req.user!.id);
      const unsupportedRequestedModes = [
        body.acceptsChat && !modeAllowed(allowedModes, 'CHAT') ? 'Chat' : '',
        body.acceptsVoiceCall && !modeAllowed(allowedModes, 'VOICE') ? 'Voice' : '',
        body.acceptsVideoCall && !modeAllowed(allowedModes, 'VIDEO') ? 'Video' : ''
      ].filter(Boolean);
      if (unsupportedRequestedModes.length) {
        return res.status(400).json({
          message: unsupportedModeMessage(unsupportedRequestedModes)
        });
      }
      const nextAcceptsChat = modeAllowed(allowedModes, 'CHAT')
        ? (body.acceptsChat ?? session.acceptsChat)
        : false;
      const nextAcceptsVoiceCall = modeAllowed(allowedModes, 'VOICE')
        ? (body.acceptsVoiceCall ?? session.acceptsVoiceCall)
        : false;
      const nextAcceptsVideoCall = modeAllowed(allowedModes, 'VIDEO')
        ? (body.acceptsVideoCall ?? session.acceptsVideoCall)
        : false;
      if (
        body.liveStatus !== LivePresenceStatus.OFFLINE &&
        !nextAcceptsChat &&
        !nextAcceptsVoiceCall &&
        !nextAcceptsVideoCall
      ) {
        return res
          .status(400)
          .json({ message: 'Select at least one live mode before going online.' });
      }
      if (body.liveStatus !== LivePresenceStatus.OFFLINE) {
        const readiness = await providerPublicReadiness(req.user!.id);
        if (!readiness.ready) {
          return res.status(409).json({ message: readiness.message, code: readiness.code });
        }
      }

      const profile = await setDoctorLiveStatus(
        req.user!.id,
        {
          ...body,
          acceptsChat: nextAcceptsChat,
          acceptsVoiceCall: nextAcceptsVoiceCall,
          acceptsVideoCall: nextAcceptsVideoCall
        },
        io
      );
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      res.json({ profile: profileWithAllowedModes(profile, allowedModes) });
    })
  );

  router.post(
    '/doctor/online-heartbeat',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const profile = await heartbeatDoctor(req.user!.id, io);
      res.json({ profile });
    })
  );

  router.post(
    '/doctor/push-token',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          token: z.string().min(1),
          platform: z.enum(['ios', 'android', 'web']).optional()
        })
        .parse(req.body);
      // Stored when PushDevice model is added; accept now so mobile apps can register.
      res.json({ ok: true, token: body.token.slice(0, 8) + '…' });
    })
  );

  router.get(
    '/doctor/instant-consultations',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const rows = await prisma.consultation.findMany({
        where: {
          assignedDoctorId: req.user!.id,
          consultationMode: ConsultationMode.INSTANT_ONLINE,
          status: {
            in: [
              ConsultationStatus.ASSIGNED,
              ConsultationStatus.IN_PROGRESS,
              ConsultationStatus.PRESCRIPTION_UPLOADED
            ]
          }
        },
        include: {
          patient: { select: { id: true, name: true, patientCode: true } },
          disease: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      res.json({
        consultations: rows.map((c) => ({
          id: c.id,
          status: c.status,
          patient: c.patient,
          disease: c.disease,
          updatedAt: c.updatedAt
        }))
      });
    })
  );

  router.post(
    '/doctor/instant-consultations/:id/decline',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = z.object({ reason: z.string().trim().max(200).optional() }).parse(req.body);
      const consultationId = routeParam(req, 'id');
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        select: {
          id: true,
          patientId: true,
          assignedDoctorId: true,
          consultationMode: true,
          status: true,
          intakeAnswers: true
        }
      });
      if (!consultation) return res.status(404).json({ message: 'Live request not found.' });
      if (
        consultation.consultationMode !== ConsultationMode.INSTANT_ONLINE ||
        consultation.assignedDoctorId !== req.user!.id
      ) {
        return res.status(403).json({ message: 'This live request is not assigned to you.' });
      }
      if (consultation.status !== ConsultationStatus.ASSIGNED) {
        return res.status(409).json({ message: 'A started or closed session cannot be declined.' });
      }

      const intake = jsonRecord(consultation.intakeAnswers);
      const declinedProviderUserIds = Array.from(
        new Set([
          ...(Array.isArray(intake['declinedProviderUserIds'])
            ? intake['declinedProviderUserIds'].map((value) => String(value))
            : []),
          req.user!.id
        ])
      );
      const released = await prisma.consultation.updateMany({
        where: {
          id: consultation.id,
          assignedDoctorId: req.user!.id,
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
              providerUserId: req.user!.id,
              reason: body.reason || 'Provider unavailable',
              declinedAt: new Date().toISOString()
            }
          } as Prisma.InputJsonObject
        }
      });
      if (!released.count) {
        return res.status(409).json({ message: 'This request has already changed.' });
      }

      await restoreDoctorOnlineAfterInstantConsultation(req.user!.id, io);
      const updatePayload = {
        consultationId: consultation.id,
        status: ConsultationStatus.PAID,
        assignedDoctorId: null
      };
      io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.patientId}`).emit(
        SOCKET_EVENTS.CONSULTATION_UPDATED,
        updatePayload
      );
      io.to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultation.id}`).emit(
        SOCKET_EVENTS.CONSULTATION_UPDATED,
        updatePayload
      );
      res.json({ ok: true, status: ConsultationStatus.PAID });
    })
  );

  router.get(
    '/admin/online-doctors/stats',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const [live, enabled, instantQueue, onCall] = await Promise.all([
        listLiveOnlineDoctors(),
        prisma.doctorOnlineSession.count({ where: { enabled: true } }),
        prisma.consultation.count({
          where: { consultationMode: 'INSTANT_ONLINE', status: 'PAID', assignedDoctorId: null }
        }),
        prisma.doctorOnlineSession.count({ where: { liveStatus: 'ON_CALL' } })
      ]);

      res.json({
        stats: {
          liveNow: live.length,
          enabledDoctors: enabled,
          waitingInstant: instantQueue,
          onCall,
          generalists: live.filter((d) => d.category === 'GENERALIST').length,
          specialists: live.filter((d) => d.category === 'SPECIALIST').length,
          acceptingChat: live.filter((d) => d.acceptsChat).length,
          acceptingVoice: live.filter((d) => d.acceptsVoiceCall).length,
          acceptingVideo: live.filter((d) => d.acceptsVideoCall).length
        }
      });
    })
  );

  router.get(
    '/admin/online-doctors',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const [live, allSessions, waiting] = await Promise.all([
        listLiveOnlineDoctors(),
        prisma.doctorOnlineSession.findMany({
          include: {
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
          },
          orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }]
        }),
        prisma.consultation.findMany({
          where: {
            consultationMode: 'INSTANT_ONLINE',
            status: { in: ['PAID', 'ASSIGNED', 'IN_PROGRESS'] }
          },
          include: {
            patient: { select: { id: true, name: true, patientCode: true } },
            disease: { select: { name: true } },
            assignedDoctor: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);

      res.json({
        liveDoctors: live,
        sessions: allSessions.map(mapLiveDoctor),
        instantQueue: waiting
      });
    })
  );

  return router;
}
