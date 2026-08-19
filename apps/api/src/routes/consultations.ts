import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PaymentStatus, Role, SupportNoteCategory } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../auth.js';
import { requireDoctorCapability } from '../doctor-capabilities.js';
import { prisma } from '../db.js';
import {
  asyncRoute,
  routeParam,
  publicUserSelect,
  includeConsultationRelations
} from '../utils/helpers.js';
import {
  enabledNotificationChannels,
  notificationService
} from '../services/notification-service.js';
import { emitConsultationAssigned } from '../services/consultation-realtime.js';
import { ensureBillingPlans } from './catalog.js';
import { resolveDiseaseConsultationFee } from '../services/consultation-pricing.js';
import {
  assertRequestedPromoApplied,
  resolveConsultationCheckout
} from '../services/checkout-pricing.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';
import { applyConsultationCancellationEffects } from '../services/consultation-cancellation.js';
import { notifyConsultationBooked } from '../services/consultation-reminders.js';
import { applySessionOutcome } from '../services/consultation-outcomes.js';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';
import { restoreDoctorOnlineAfterInstantConsultation } from '../services/online-doctor-presence.js';

function serializeHopeHubAssessmentAttempt(attempt: {
  id: string;
  assessmentId: string;
  assessmentType: string;
  category: string | null;
  title: string;
  totalScore: number;
  maxScore: number;
  level: string;
  color: string | null;
  safetyFlag: boolean;
  retakeNumber: number;
  previousId: string | null;
  completedAt: Date;
}) {
  return {
    ...attempt,
    completedAt: attempt.completedAt.toISOString()
  };
}

async function closeOpenCallSessionsForConsultation(consultationId: string, reason: string) {
  const openCalls = await prisma.consultationCallSession.findMany({
    where: { consultationId, endedAt: null }
  });
  const endedAt = new Date();
  for (const call of openCalls) {
    const startedFrom = call.answeredAt ?? call.startedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedFrom.getTime()) / 1000)
    );
    await prisma.consultationCallSession.update({
      where: { id: call.id },
      data: {
        status: call.status === 'RINGING' ? 'MISSED' : 'ENDED',
        endedAt,
        durationSeconds,
        endReason: reason,
        lastSignalEvent: 'session:closed'
      }
    });
  }
}

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
          consultationMode: z
            .enum(['CLINIC_QUEUE', 'INSTANT_ONLINE'])
            .optional()
            .default('CLINIC_QUEUE'),
          preferredDoctorUserId: z.string().min(1).nullable().optional()
        })
        .parse(req.body);

      await ensureBillingPlans();
      const disease = await prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } });
      const selectedPlan =
        body.purchaseType === 'PLAN'
          ? await prisma.billingPlan.findFirst({
              where: { code: body.planCode || '', isActive: true }
            })
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
      if (
        !isInstant &&
        body.clinicStoreId !== undefined &&
        body.clinicStoreId !== patient.homeClinicStoreId
      ) {
        await prisma.user.update({
          where: { id: req.user!.id },
          data: { homeClinicStoreId: body.clinicStoreId }
        });
      }
      const consultFeePaise = await resolveDiseaseConsultationFee(disease.id, clinicStoreId);
      const grossInPaise =
        body.purchaseType === 'ONE_TIME' ? consultFeePaise : selectedPlan.priceInPaise;
      const checkout = await resolveConsultationCheckout({
        patientId: req.user!.id,
        grossInPaise,
        promoCode: body.promoCode,
        walletRedeemInPaise: body.walletRedeemInPaise
      });
      try {
        assertRequestedPromoApplied(body.promoCode, checkout);
      } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
        return res.status(statusCode).json({
          message: error instanceof Error ? error.message : 'Coupon could not be applied.'
        });
      }
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

      if (consultation.payment?.status === PaymentStatus.PAID) {
        void notifyConsultationBooked(consultation.id).catch((err) =>
          console.error('[booking-reminders] Consultation booking notification failed', err)
        );
      }

      res.status(201).json({ consultation });
    })
  );

  router.patch(
    '/consultations/:id/cancel',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z.object({ reason: z.string().trim().max(1000).optional() }).parse(req.body);
      const consultation = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true, status: true }
      });
      if (!consultation) return res.status(404).json({ message: 'Consultation not found.' });
      if (consultation.patientId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (
        consultation.status === ConsultationStatus.COMPLETED ||
        consultation.status === ConsultationStatus.CANCELLED
      ) {
        return res.status(400).json({ message: 'This consultation can no longer be cancelled.' });
      }

      const result = await applyConsultationCancellationEffects({
        consultationId: consultation.id,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        reason: body.reason || 'Cancelled by user',
        restorePackageSession: true,
        holdProviderPayout: true
      });
      const updated = await prisma.consultation.findUniqueOrThrow({
        where: { id: consultation.id },
        include: includeConsultationRelations()
      });
      io.to(`user:${consultation.patientId}`).emit('consultation:updated', {
        consultationId: consultation.id,
        status: ConsultationStatus.CANCELLED
      });
      if (consultation.assignedDoctorId) {
        io.to(`user:${consultation.assignedDoctorId}`).emit('consultation:updated', {
          consultationId: consultation.id,
          status: ConsultationStatus.CANCELLED
        });
      }
      io.to(`consultation:${consultation.id}`).emit('consultation:updated', {
        consultationId: consultation.id,
        status: ConsultationStatus.CANCELLED
      });
      res.json({
        consultation: updated,
        cancellation: result,
        message: result?.restoredPackageSession
          ? 'Consultation cancelled and package session restored.'
          : 'Consultation cancelled.'
      });
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
      const existing = await prisma.consultation.findUnique({
        where: { id },
        select: { consultationMode: true }
      });
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
              : (doctor.doctorProfile?.clinicStoreId ?? undefined)
        },
        include: {
          ...includeConsultationRelations(),
          patient: {
            select: { id: true, name: true, mobile: true, email: true, patientCode: true }
          }
        }
      });

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
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') }
      });

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

      io.to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultation.id}`).emit(
        SOCKET_EVENTS.MESSAGE_NEW,
        message
      );
      io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.patientId}`).emit(
        SOCKET_EVENTS.MESSAGE_NEW,
        message
      );
      if (consultation.assignedDoctorId) {
        io.to(`${SOCKET_ROOM_PREFIXES.USER}${consultation.assignedDoctorId}`).emit(
          SOCKET_EVENTS.MESSAGE_NEW,
          message
        );
      }

      res.status(201).json({ message });
    })
  );

  router.get(
    '/consultations/:id/session-notes',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, assignedDoctorId: true }
      });

      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: 'Only the assigned doctor can view session notes.' });
      }

      const notes = await prisma.supportCaseNote.findMany({
        where: { consultationId: consultation.id },
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ notes });
    })
  );

  router.get(
    '/consultations/:id/call-sessions',
    authRequired,
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true }
      });

      const canView =
        req.user!.role === Role.ADMIN ||
        consultation.patientId === req.user!.id ||
        consultation.assignedDoctorId === req.user!.id;

      if (!canView) return res.status(403).json({ message: 'Access denied' });

      const callSessions = await prisma.consultationCallSession.findMany({
        where: { consultationId: consultation.id },
        orderBy: { startedAt: 'desc' },
        take: 25
      });

      res.json({ callSessions });
    })
  );

  router.get(
    '/consultations/:id/assessment-summary',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'clinicalMentalHealth',
      'Assessment history is available only for clinical Hope Hub providers.'
    ),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true }
      });

      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: 'Only the assigned doctor can view assessment history.' });
      }

      const attempts = await prisma.hopeHubAssessmentAttempt.findMany({
        where: { userId: consultation.patientId },
        select: {
          id: true,
          assessmentId: true,
          assessmentType: true,
          category: true,
          title: true,
          totalScore: true,
          maxScore: true,
          level: true,
          color: true,
          safetyFlag: true,
          retakeNumber: true,
          previousId: true,
          completedAt: true
        },
        orderBy: { completedAt: 'desc' },
        take: 20
      });

      const latestByAssessment = new Map<string, (typeof attempts)[number]>();
      for (const attempt of attempts) {
        if (!latestByAssessment.has(attempt.assessmentId)) {
          latestByAssessment.set(attempt.assessmentId, attempt);
        }
      }

      res.json({
        attempts: attempts.map(serializeHopeHubAssessmentAttempt),
        latest: Array.from(latestByAssessment.values()).map(serializeHopeHubAssessmentAttempt),
        safetyFlaggedCount: attempts.filter((attempt) => attempt.safetyFlag).length
      });
    })
  );

  router.post(
    '/consultations/:id/session-notes',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          note: z.string().trim().min(3).max(5000)
        })
        .parse(req.body);

      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true, status: true }
      });

      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Only the assigned doctor can add session notes.' });
      }

      const note = await prisma.supportCaseNote.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          authorId: req.user!.id,
          category: SupportNoteCategory.GENERAL,
          body: body.note
        },
        include: { author: { select: { id: true, name: true, role: true } } }
      });

      if (consultation.status === ConsultationStatus.ASSIGNED) {
        await prisma.consultation.update({
          where: { id: consultation.id },
          data: { status: ConsultationStatus.IN_PROGRESS }
        });
      }

      res.status(201).json({ note });
    })
  );

  // Read feedback for one completed consultation. Consumers see only their own submission;
  // providers see anonymous consumer feedback; admins may audit all submissions.
  router.get(
    '/consultations/:id/feedback',
    authRequired,
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true, status: true }
      });
      const isPatient = consultation.patientId === req.user!.id;
      const isAssignedProvider = consultation.assignedDoctorId === req.user!.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      if (!isPatient && !isAssignedProvider && !isAdmin) {
        return res
          .status(403)
          .json({ message: 'You do not have access to this session feedback.' });
      }

      const feedback = await prisma.consultationFeedback.findMany({
        where: {
          consultationId: consultation.id,
          ...(isPatient && !isAdmin ? { actorUserId: req.user!.id } : {}),
          ...(isAssignedProvider && !isAdmin ? { actorRole: 'CONSUMER' } : {})
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          actorRole: true,
          rating: true,
          helpful: true,
          followUpNeeded: true,
          tags: true,
          message: true,
          updatedAt: true
        }
      });
      res.json({
        feedback: feedback.map((item) => ({
          ...item,
          source: item.actorRole === 'CONSUMER' ? 'Hope Hub member' : 'Provider',
          updatedAt: item.updatedAt.toISOString()
        }))
      });
    })
  );

  // Provider feedback inbox. Patient identity is deliberately not returned here;
  // the feedback is tied to a verified completed session and is for service improvement.
  router.get(
    '/doctor/feedback',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const limit = Math.max(1, Math.min(100, Number(req.query['limit'] || 30) || 30));
      const providerUserId = req.user!.id;
      const where = {
        actorRole: 'CONSUMER',
        consultation: {
          is: { assignedDoctorId: providerUserId, status: ConsultationStatus.COMPLETED }
        }
      };
      const [summary, items] = await Promise.all([
        prisma.consultationFeedback.aggregate({
          where,
          _avg: { rating: true },
          _count: { _all: true }
        }),
        prisma.consultationFeedback.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            rating: true,
            helpful: true,
            followUpNeeded: true,
            tags: true,
            message: true,
            updatedAt: true,
            consultation: {
              select: {
                id: true,
                createdAt: true,
                consultationMode: true,
                disease: { select: { name: true } }
              }
            }
          }
        })
      ]);
      res.json({
        summary: {
          averageRating: summary._count._all
            ? Math.round(Number(summary._avg.rating || 0) * 10) / 10
            : null,
          ratingCount: summary._count._all
        },
        feedback: items.map((item) => ({
          id: item.id,
          rating: item.rating,
          helpful: item.helpful,
          followUpNeeded: item.followUpNeeded,
          tags: item.tags,
          message: item.message,
          updatedAt: item.updatedAt.toISOString(),
          session: {
            id: item.consultation.id,
            date: item.consultation.createdAt.toISOString(),
            mode: item.consultation.consultationMode,
            serviceName: item.consultation.disease?.name || 'Hope Hub session'
          }
        }))
      });
    })
  );

  // POST /consultations/:id/feedback
  router.post(
    '/consultations/:id/feedback',
    authRequired,
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          rating: z.number().int().min(1).max(5),
          helpful: z.boolean().optional(),
          followUpNeeded: z.boolean().optional(),
          tags: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
          message: z.string().trim().min(2).max(2000).optional()
        })
        .parse(req.body);
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, assignedDoctorId: true, status: true }
      });
      const isPatient = consultation.patientId === req.user!.id;
      const isAssignedProvider = consultation.assignedDoctorId === req.user!.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      if (!isPatient && !isAssignedProvider && !isAdmin) {
        return res
          .status(403)
          .json({ message: 'You do not have access to this consultation feedback.' });
      }
      if (isAdmin && !isPatient && !isAssignedProvider) {
        return res
          .status(403)
          .json({ message: 'Admins can review feedback but cannot submit it.' });
      }
      if (consultation.status !== ConsultationStatus.COMPLETED) {
        return res
          .status(409)
          .json({ message: 'Feedback becomes available after the session is completed.' });
      }

      const feedback = await prisma.consultationFeedback.upsert({
        where: {
          consultationId_actorUserId: {
            consultationId: consultation.id,
            actorUserId: req.user!.id
          }
        },
        create: {
          consultationId: consultation.id,
          actorUserId: req.user!.id,
          actorRole: isPatient ? 'CONSUMER' : 'PROVIDER',
          rating: body.rating,
          helpful: body.helpful,
          followUpNeeded: body.followUpNeeded,
          tags: body.tags || [],
          message: body.message || null
        },
        update: {
          rating: body.rating,
          helpful: body.helpful,
          followUpNeeded: body.followUpNeeded,
          tags: body.tags || [],
          message: body.message || null
        },
        select: {
          id: true,
          rating: true,
          helpful: true,
          followUpNeeded: true,
          tags: true,
          message: true,
          updatedAt: true
        }
      });
      res.status(201).json({ feedback });
    })
  );

  router.post(
    '/consultations/:id/complete',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') }
      });
      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: 'Only the assigned doctor can complete consultation' });
      }

      const result = await applySessionOutcome({
        consultationId: consultation.id,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        outcome: 'COMPLETED',
        privateNote: 'Marked complete from legacy complete action.'
      });
      const updated = result?.consultation;

      if (consultation.consultationMode === 'INSTANT_ONLINE' && consultation.assignedDoctorId) {
        await restoreDoctorOnlineAfterInstantConsultation(consultation.assignedDoctorId, io);
      }

      if (updated) {
        await closeOpenCallSessionsForConsultation(updated.id, 'completed');
        const updatePayload = { consultationId: updated.id, status: updated.status };
        io.to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${updated.id}`).emit(
          SOCKET_EVENTS.CONSULTATION_UPDATED,
          updatePayload
        );
        io.to(`${SOCKET_ROOM_PREFIXES.USER}${updated.patientId}`).emit(
          SOCKET_EVENTS.CONSULTATION_UPDATED,
          updatePayload
        );
        if (updated.assignedDoctorId) {
          io.to(`${SOCKET_ROOM_PREFIXES.USER}${updated.assignedDoctorId}`).emit(
            SOCKET_EVENTS.CONSULTATION_UPDATED,
            updatePayload
          );
        }
      }

      res.json({ consultation: updated, sessionOutcome: result?.sessionOutcome });
    })
  );

  router.post(
    '/consultations/:id/outcome',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          outcome: z.enum(['COMPLETED', 'USER_MISSED', 'PROVIDER_NO_SHOW', 'RESCHEDULE_NEEDED']),
          privateNote: z.string().trim().max(5000).optional(),
          userSummary: z.string().trim().max(2000).optional(),
          recommendedNextStep: z.string().trim().max(1000).optional(),
          restorePackageSession: z.boolean().optional(),
          holdProviderPayout: z.boolean().optional()
        })
        .parse(req.body);
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'id') }
      });
      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: 'Only the assigned provider can close this session.' });
      }
      const result = await applySessionOutcome({
        consultationId: consultation.id,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        outcome: body.outcome,
        privateNote: body.privateNote,
        userSummary: body.userSummary,
        recommendedNextStep: body.recommendedNextStep,
        restorePackageSession: body.restorePackageSession,
        holdProviderPayout: body.holdProviderPayout
      });

      if (consultation.consultationMode === 'INSTANT_ONLINE' && consultation.assignedDoctorId) {
        await restoreDoctorOnlineAfterInstantConsultation(consultation.assignedDoctorId, io);
      }

      if (result?.consultation) {
        await closeOpenCallSessionsForConsultation(
          result.consultation.id,
          result.sessionOutcome?.outcome || 'closed'
        );
        const updatePayload = {
          consultationId: result.consultation.id,
          status: result.consultation.status
        };
        io.to(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${result.consultation.id}`).emit(
          SOCKET_EVENTS.CONSULTATION_UPDATED,
          updatePayload
        );
        io.to(`${SOCKET_ROOM_PREFIXES.USER}${result.consultation.patientId}`).emit(
          SOCKET_EVENTS.CONSULTATION_UPDATED,
          updatePayload
        );
        if (result.consultation.assignedDoctorId) {
          io.to(`${SOCKET_ROOM_PREFIXES.USER}${result.consultation.assignedDoctorId}`).emit(
            SOCKET_EVENTS.CONSULTATION_UPDATED,
            updatePayload
          );
        }
      }

      res.json({ consultation: result?.consultation, sessionOutcome: result?.sessionOutcome });
    })
  );

  return router;
}
