import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PaymentStatus, Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam, publicUserSelect, includeConsultationRelations } from '../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../services/notification-service.js';
import { ensureBillingPlans } from './catalog.js';

export function createConsultationsRouter(io: SocketIoServer) {
  const router = Router();

  // POST /consultations — patient books a new consultation
  router.post(
    '/consultations',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          diseaseId: z.string().min(1),
          intakeAnswers: z.record(z.string(), z.string().min(1)),
          purchaseType: z.enum(['ONE_TIME', 'PLAN']).optional().default('ONE_TIME'),
          planCode: z.string().min(2).optional()
        })
        .parse(req.body);

      await ensureBillingPlans();
      const disease = await prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } });
      const selectedPlan =
        body.purchaseType === 'PLAN'
          ? await prisma.billingPlan.findFirst({ where: { code: body.planCode || '', isActive: true } })
          : await prisma.billingPlan.findFirst({ where: { code: 'ONE_TIME', isActive: true } });

      if (!selectedPlan) {
        return res.status(400).json({ message: 'Selected billing plan is not available.' });
      }

      const amountInPaise = body.purchaseType === 'ONE_TIME' ? disease.feeInPaise : selectedPlan.priceInPaise;
      const patient = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { homeClinicStoreId: true }
      });
      const consultation = await prisma.consultation.create({
        data: {
          patientId: req.user!.id,
          diseaseId: disease.id,
          clinicStoreId: patient.homeClinicStoreId,
          intakeAnswers: body.intakeAnswers,
          billingPlanCode: selectedPlan.code,
          pricingSnapshot: {
            purchaseType: body.purchaseType,
            diseaseFeeInPaise: disease.feeInPaise,
            selectedPlanCode: selectedPlan.code,
            selectedPlanName: selectedPlan.name,
            selectedPlanPriceInPaise: selectedPlan.priceInPaise
          },
          payment: {
            create: {
              amountInPaise,
              billingPlanCode: selectedPlan.code,
              lineItems: {
                purchaseType: body.purchaseType,
                diseaseName: disease.name,
                diseaseFeeInPaise: disease.feeInPaise,
                planCode: selectedPlan.code,
                planName: selectedPlan.name,
                consultationsLimit: selectedPlan.consultationsLimit
              },
              status: PaymentStatus.CREATED
            }
          }
        },
        include: includeConsultationRelations()
      });

      res.status(201).json({ consultation });
    })
  );

  // GET /consultations — list consultations (role-scoped)
  router.get(
    '/consultations',
    authRequired,
    asyncRoute(async (req, res) => {
      const where =
        req.user!.role === Role.PATIENT
          ? { patientId: req.user!.id }
          : req.user!.role === Role.DOCTOR
            ? { assignedDoctorId: req.user!.id }
            : {};

      const consultations = await prisma.consultation.findMany({
        where,
        include: includeConsultationRelations(),
        orderBy: { createdAt: 'desc' }
      });
      res.json({ consultations });
    })
  );

  // GET /consultations/:id
  router.get(
    '/consultations/:id',
    authRequired,
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        include: includeConsultationRelations()
      });

      if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

      const userId = req.user!.id;
      const role = req.user!.role;
      const canView =
        role === Role.ADMIN ||
        consultation.patientId === userId ||
        consultation.assignedDoctorId === userId;

      if (!canView) return res.status(403).json({ message: 'Access denied' });
      res.json({ consultation });
    })
  );

  // POST /consultations/:id/assign — admin assigns a doctor (legacy route)
  router.post(
    '/consultations/:id/assign',
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
          status: ConsultationStatus.ASSIGNED,
          clinicStoreId: doctor.doctorProfile?.clinicStoreId ?? undefined
        },
        include: { ...includeConsultationRelations(), patient: { select: { id: true, name: true, mobile: true, email: true } } }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patient = (consultation as any).patient;
      if (patient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'DOCTOR_ASSIGNED' as const,
            channel: ch,
            recipientId: patient.id,
            recipientName: patient.name,
            recipientMobile: patient.mobile,
            recipientEmail: patient.email,
            title: 'Doctor assigned — Vitalis Care',
            body: `Dr. ${doctor.name} has been assigned to your consultation. You can now chat with your doctor in the app.`
          }))
        );
        io.to(`user:${patient.id}`).emit('consultation:updated', { consultationId: consultation.id, status: consultation.status });
      }

      res.json({ consultation });
    })
  );

  // POST /consultations/:id/messages
  router.post(
    '/consultations/:id/messages',
    authRequired,
    asyncRoute(async (req, res) => {
      const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
      const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });

      const canChat =
        req.user!.role === Role.ADMIN ||
        consultation.patientId === req.user!.id ||
        consultation.assignedDoctorId === req.user!.id;

      if (!canChat) return res.status(403).json({ message: 'Access denied' });

      const message = await prisma.message.create({
        data: { consultationId: consultation.id, senderId: req.user!.id, body: body.body },
        include: { sender: { select: publicUserSelect } }
      });

      if (consultation.status === ConsultationStatus.ASSIGNED) {
        await prisma.consultation.update({
          where: { id: consultation.id },
          data: { status: ConsultationStatus.IN_PROGRESS }
        });
      }

      io.to(`consultation:${consultation.id}`).emit('message:new', message);
      io.to(`user:${consultation.patientId}`).emit('message:new', message);
      if (consultation.assignedDoctorId) {
        io.to(`user:${consultation.assignedDoctorId}`).emit('message:new', message);
      }

      res.status(201).json({ message });
    })
  );

  // POST /consultations/:id/complete
  router.post(
    '/consultations/:id/complete',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });
      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Only the assigned doctor can complete consultation' });
      }

      const updated = await prisma.consultation.update({
        where: { id: consultation.id },
        data: { status: ConsultationStatus.COMPLETED },
        include: includeConsultationRelations()
      });

      res.json({ consultation: updated });
    })
  );

  return router;
}
