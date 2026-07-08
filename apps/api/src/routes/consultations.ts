import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PaymentStatus, Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam, publicUserSelect, includeConsultationRelations } from '../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../services/notification-service.js';
import { emitConsultationAssigned } from '../services/consultation-realtime.js';
import { ensureBillingPlans } from './catalog.js';
import { resolveDiseaseConsultationFee } from '../services/consultation-pricing.js';
import { resolveConsultationCheckout } from '../services/checkout-pricing.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';

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
          planCode: z.string().min(2).optional(),
          promoCode: z.string().min(2).max(32).optional(),
          walletRedeemInPaise: z.number().int().min(0).optional(),
          clinicStoreId: z.string().min(1).nullable().optional(),
          consultationMode: z.enum(['CLINIC_QUEUE', 'INSTANT_ONLINE']).optional().default('CLINIC_QUEUE'),
          preferredDoctorUserId: z.string().min(1).nullable().optional()
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

      const patient = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { homeClinicStoreId: true }
      });
      const isInstant = body.consultationMode === 'INSTANT_ONLINE';
      const clinicStoreId = isInstant
        ? null
        : body.clinicStoreId === undefined
          ? patient.homeClinicStoreId
          : body.clinicStoreId;
      if (!isInstant && body.clinicStoreId !== undefined && body.clinicStoreId !== patient.homeClinicStoreId) {
        await prisma.user.update({
          where: { id: req.user!.id },
          data: { homeClinicStoreId: body.clinicStoreId }
        });
      }
      const consultFeePaise = await resolveDiseaseConsultationFee(disease.id, clinicStoreId);
      const grossInPaise = body.purchaseType === 'ONE_TIME' ? consultFeePaise : selectedPlan.priceInPaise;
      const checkout = await resolveConsultationCheckout({
        patientId: req.user!.id,
        grossInPaise,
        promoCode: body.promoCode,
        walletRedeemInPaise: body.walletRedeemInPaise
      });
      const consultation = await prisma.consultation.create({
        data: {
          patientId: req.user!.id,
          diseaseId: disease.id,
          clinicStoreId,
          consultationMode: body.consultationMode,
          preferredDoctorUserId: body.preferredDoctorUserId ?? null,
          intakeAnswers: body.intakeAnswers,
          billingPlanCode: selectedPlan.code,
          pricingSnapshot: {
            purchaseType: body.purchaseType,
            diseaseFeeInPaise: consultFeePaise,
            selectedPlanCode: selectedPlan.code,
            selectedPlanName: selectedPlan.name,
            selectedPlanPriceInPaise: selectedPlan.priceInPaise,
            checkout
          },
          payment: {
            create: {
              grossAmountInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              amountInPaise: checkout.payableInPaise,
              billingPlanCode: selectedPlan.code,
              appliedRules: checkout.appliedRules,
              lineItems: {
                purchaseType: body.purchaseType,
                diseaseName: disease.name,
                consultationFeeInPaise: checkout.grossAmountInPaise,
                diseaseFeeInPaise: consultFeePaise,
                discountInPaise: checkout.discountInPaise,
                walletRedeemedInPaise: checkout.walletRedeemedInPaise,
                payableInPaise: checkout.payableInPaise,
                medicineFeeInPaise: 0,
                planCode: selectedPlan.code,
                planName: selectedPlan.name,
                selectedPlanPriceInPaise: selectedPlan.priceInPaise,
                consultationsLimit: selectedPlan.consultationsLimit,
                appliedRules: checkout.appliedRules
              },
              status: PaymentStatus.CREATED
            }
          }
        },
        include: includeConsultationRelations()
      });

      void trackProductEvent({
        name: PRODUCT_EVENTS.CONSULTATION_BOOKED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: {
          consultationId: consultation.id,
          diseaseId: disease.id,
          purchaseType: body.purchaseType
        }
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
      const id = routeParam(req, 'id');
      const existing = await prisma.consultation.findUnique({ where: { id }, select: { consultationMode: true } });
      const doctor = await prisma.user.findFirstOrThrow({
        where: { id: body.doctorId, role: Role.DOCTOR, isActive: true },
        include: { doctorProfile: { select: { clinicStoreId: true } } }
      });

      const consultation = await prisma.consultation.update({
        where: { id },
        data: {
          assignedDoctorId: doctor.id,
          status: ConsultationStatus.ASSIGNED,
          clinicStoreId:
            existing?.consultationMode === 'INSTANT_ONLINE'
              ? null
              : doctor.doctorProfile?.clinicStoreId ?? undefined
        },
        include: { ...includeConsultationRelations(), patient: { select: { id: true, name: true, mobile: true, email: true, patientCode: true } } }
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

      emitConsultationAssigned(io, doctor.id, {
        consultationId: consultation.id,
        patientCode: patient?.patientCode ?? null,
        patientName: patient?.name ?? null,
        diseaseName: (consultation as { disease?: { name?: string } }).disease?.name ?? null,
        status: consultation.status
      });

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

      if (consultation.consultationMode === 'INSTANT_ONLINE' && consultation.assignedDoctorId) {
        const { setDoctorLiveStatus } = await import('../services/online-doctor-presence.js');
        const { LivePresenceStatus } = await import('@prisma/client');
        await setDoctorLiveStatus(consultation.assignedDoctorId, { liveStatus: LivePresenceStatus.ONLINE }, io);
      }

      res.json({ consultation: updated });
    })
  );

  return router;
}
