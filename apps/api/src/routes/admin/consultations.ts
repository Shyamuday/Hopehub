import { Router } from 'express';
import { z } from 'zod';
import { Role, ConsultationStatus } from '@prisma/client';
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
import { enabledNotificationChannels, notificationService } from '../../services/notification-service.js';
import { emitConsultationAssigned } from '../../services/consultation-realtime.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';

export function registerAdminConsultationRoutes(router: Router, io: SocketIoServer) {
  // ─── Admin consultations ───────────────────────────────────────────────────────

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
            payment: { select: { status: true, amountInPaise: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.consultation.count({ where })
      ]);

      const filtered = q
        ? consultations.filter((c) => {
            const text = [c.patient?.name, c.patient?.mobile, c.disease?.name].join(' ').toLowerCase();
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
          patient: { select: { id: true, name: true, mobile: true, email: true, patientCode: true } },
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
        io.to(`user:${patient.id}`).emit('consultation:updated', { consultationId: consultation.id, status: consultation.status });
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
          payment: { select: { status: true, amountInPaise: true } }
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
}
