import { Router } from 'express';
import { z } from 'zod';
import { Role, ConsultationStatus, SupportNoteCategory, Prisma } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  queryText,
  queryPositiveInt,
  writeAuditLog,
  includeConsultationRelations
} from '../../utils/helpers.js';
import {
  enabledNotificationChannels,
  notificationService
} from '../../services/notification-service.js';
import { emitConsultationAssigned } from '../../services/consultation-realtime.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';

export function registerAdminConsultationRoutes(router: Router, io: SocketIoServer) {
  // ─── Admin consultations ───────────────────────────────────────────────────────

  router.get(
    '/admin/safety-flags',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = Math.max(1, Math.min(50, queryPositiveInt(req, 'pageSize', 20)));

      const where = {
        OR: [
          { category: SupportNoteCategory.ESCALATION },
          { body: { startsWith: '[SAFETY]', mode: 'insensitive' as const } }
        ]
      };

      const [notes, total] = await Promise.all([
        prisma.supportCaseNote.findMany({
          where,
          include: {
            author: { select: { id: true, name: true, role: true } },
            patient: {
              select: { id: true, name: true, email: true, mobile: true, patientCode: true }
            },
            consultation: {
              include: {
                assignedDoctor: { select: { id: true, name: true, email: true, mobile: true } },
                disease: { select: { id: true, name: true } },
                payment: { select: { status: true, amountInPaise: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.supportCaseNote.count({ where })
      ]);

      res.json({
        flags: notes,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  router.post(
    '/admin/safety-flags/:consultationId/notes',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ note: z.string().trim().min(3).max(5000) }).parse(req.body);
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'consultationId') },
        select: { id: true, patientId: true }
      });

      const note = await prisma.supportCaseNote.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          authorId: req.user!.id,
          category: SupportNoteCategory.ESCALATION,
          body: `[SAFETY FOLLOW-UP] ${body.note}`
        },
        include: { author: { select: { id: true, name: true, role: true } } }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'safety_flag.follow_up',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: 'Admin added a safety follow-up note.'
      });

      res.status(201).json({ note });
    })
  );

  router.get(
    '/admin/consultations',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const status = queryText(req, 'status');
      const assigned = queryText(req, 'assigned');
      const q = queryText(req, 'q').trim().toLowerCase();

      const where: Record<string, unknown> = {};
      if (status) where['status'] = status;
      if (assigned === 'no') where['assignedDoctorId'] = null;
      if (assigned === 'yes') where['assignedDoctorId'] = { not: null };

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, mobile: true } },
            assignedDoctor: { select: { id: true, name: true } },
            disease: { select: { id: true, name: true } },
            payment: { select: { status: true, amountInPaise: true, lineItems: true } },
            pricingSnapshot: true,
            intakeAnswers: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.consultation.count({ where })
      ]);

      const filtered = q
        ? consultations.filter((c) => {
            const text = [c.patient?.name, c.patient?.mobile, c.disease?.name]
              .join(' ')
              .toLowerCase();
            return text.includes(q);
          })
        : consultations;

      res.json({ consultations: filtered, total, page, pageSize });
    })
  );

  router.put(
    '/admin/consultations/:id/assign',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
      const doctor = await prisma.user.findFirstOrThrow({
        where: { id: body.doctorId, role: Role.DOCTOR, isActive: true },
        include: { doctorProfile: { select: { clinicStoreId: true } } }
      });

      const consultation = await prisma.consultation.update({
        where: { id: routeParam(req, 'id') },
        data: {
          assignedDoctorId: doctor.id,
          status: 'ASSIGNED' as const,
          clinicStoreId: doctor.doctorProfile?.clinicStoreId ?? undefined
        },
        include: {
          patient: {
            select: { id: true, name: true, mobile: true, email: true, patientCode: true }
          },
          disease: { select: { name: true } }
        }
      });

      const patient = consultation.patient;
      if (patient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'DOCTOR_ASSIGNED' as const,
            channel: ch,
            recipientId: patient.id,
            recipientName: patient.name,
            recipientMobile: patient.mobile,
            recipientEmail: patient.email,
            title: 'Doctor assigned — HopeHub Care',
            body: `Dr. ${doctor.name} has been assigned to your consultation. You can now chat with your doctor in the app.`
          }))
        );
        io.to(`user:${patient.id}`).emit('consultation:updated', {
          consultationId: consultation.id,
          status: consultation.status
        });
      }

      emitConsultationAssigned(io, doctor.id, {
        consultationId: consultation.id,
        patientCode: patient?.patientCode ?? null,
        patientName: patient?.name ?? null,
        diseaseName: consultation.disease?.name ?? null,
        status: consultation.status
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consultation.assign_doctor',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Assigned Dr. ${doctor.name} to ${patient?.name || 'patient'} consultation.`,
        metadata: {
          doctorId: doctor.id,
          doctorName: doctor.name,
          patientId: consultation.patientId,
          diseaseName: consultation.disease?.name ?? null
        }
      });

      void trackProductEvent({
        name: PRODUCT_EVENTS.CONSULTATION_ASSIGNED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: {
          consultationId: consultation.id,
          doctorId: doctor.id,
          patientId: consultation.patientId
        }
      });

      res.json({ consultation, message: 'Doctor assigned successfully.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ status: z.nativeEnum(ConsultationStatus) }).parse(req.body);

      const existing = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        include: {
          patient: { select: { id: true, name: true } },
          disease: { select: { name: true } }
        }
      });
      if (!existing) {
        return res.status(404).json({ message: 'Consultation not found.' });
      }

      const consultation = await prisma.consultation.update({
        where: { id: existing.id },
        data: { status: body.status },
        include: {
          patient: { select: { id: true, name: true, mobile: true } },
          assignedDoctor: { select: { id: true, name: true } },
          disease: { select: { id: true, name: true } },
          payment: { select: { status: true, amountInPaise: true, lineItems: true } },
          pricingSnapshot: true,
          intakeAnswers: true
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consultation.status_override',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Status changed ${existing.status} → ${body.status} for ${existing.patient?.name || 'patient'}.`,
        metadata: {
          previousStatus: existing.status,
          nextStatus: body.status,
          patientId: consultation.patientId,
          diseaseName: existing.disease?.name ?? null
        }
      });

      io.to(`user:${consultation.patientId}`).emit('consultation:updated', {
        consultationId: consultation.id,
        status: consultation.status
      });

      res.json({ consultation, message: 'Consultation status updated.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/hope-hub-usage',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ usedSessions: z.number().int().min(0) }).parse(req.body);
      const existing = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, pricingSnapshot: true, patient: { select: { name: true } } }
      });
      if (!existing) return res.status(404).json({ message: 'Consultation not found.' });

      const snapshot = ((existing.pricingSnapshot || {}) as Record<string, unknown>) || {};
      const currentUsage = (snapshot['packageUsage'] || null) as Record<string, unknown> | null;
      if (!currentUsage) {
        return res.status(400).json({ message: 'This consultation has no package usage.' });
      }

      const totalSessions = Math.max(1, Number(currentUsage['totalSessions'] || 1));
      const usedSessions = Math.min(totalSessions, body.usedSessions);
      const nextSnapshot = {
        ...snapshot,
        packageUsage: {
          ...currentUsage,
          totalSessions,
          usedSessions,
          remainingSessions: Math.max(0, totalSessions - usedSessions)
        }
      };

      const consultation = await prisma.consultation.update({
        where: { id: existing.id },
        data: { pricingSnapshot: nextSnapshot as Prisma.InputJsonObject },
        include: {
          patient: { select: { id: true, name: true, mobile: true } },
          assignedDoctor: { select: { id: true, name: true } },
          disease: { select: { id: true, name: true } },
          payment: { select: { status: true, amountInPaise: true, lineItems: true } }
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.package_usage.update',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Updated package usage to ${usedSessions}/${totalSessions} for ${existing.patient?.name || 'patient'}.`
      });

      res.json({ consultation, packageUsage: nextSnapshot.packageUsage });
    })
  );
}
