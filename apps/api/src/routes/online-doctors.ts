import { Router } from 'express';
import { z } from 'zod';
import type { Server as SocketIoServer } from 'socket.io';
import {
  LivePresenceStatus,
  OnlineDoctorCategory,
  Role,
  ConsultationMode,
  ConsultationStatus
} from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { getPublicIceServers } from '../constants/rtc.constants.js';
import { prisma } from '../db.js';
import {
  ensureDoctorOnlineSession,
  heartbeatDoctor,
  listLiveOnlineDoctors,
  mapLiveDoctor,
  setDoctorLiveStatus
} from '../services/online-doctor-presence.js';
import { asyncRoute } from '../utils/helpers.js';

export function createOnlineDoctorsRouter(io: SocketIoServer) {
  const router = Router();

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
          user: { select: { id: true, name: true, profileImageKey: true, isActive: true } },
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
        }
      });

      const diseases = await prisma.disease.findMany({
        where: { isActive: true },
        select: { id: true, name: true, publicCategory: true },
        orderBy: { name: 'asc' }
      });

      res.json({ profile: mapLiveDoctor(full), diseases, stunServers: getPublicIceServers() });
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
          acceptsVoiceCall: z.boolean().optional()
        })
        .parse(req.body);

      const session = await ensureDoctorOnlineSession(req.user!.id);
      if (!session) return res.status(404).json({ message: 'Doctor profile not found.' });

      const updated = await prisma.doctorOnlineSession.update({
        where: { id: session.id },
        data: body,
        include: {
          user: { select: { id: true, name: true, profileImageKey: true, isActive: true } },
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
        }
      });

      res.json({ profile: mapLiveDoctor(updated) });
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
          acceptsVoiceCall: z.boolean().optional()
        })
        .parse(req.body);

      const profile = await setDoctorLiveStatus(req.user!.id, body, io);
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      res.json({ profile });
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
          specialists: live.filter((d) => d.category === 'SPECIALIST').length
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
            user: { select: { id: true, name: true, profileImageKey: true, isActive: true } },
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
