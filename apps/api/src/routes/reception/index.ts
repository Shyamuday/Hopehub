import type { Server as SocketIoServer } from 'socket.io';
import { ConsultationStatus, PaymentStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { ensureBillingPlans } from '../catalog.js';
import {
  asyncRoute,
  queryText,
  routeParam,
  writeAuditLog
} from '../../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../../services/notification-service.js';
import { emitConsultationAssigned } from '../../services/consultation-realtime.js';
import { createPatientRecord, searchPatients } from '../../services/patient-identity.js';
import { resolveDiseaseConsultationFee } from '../../services/consultation-pricing.js';
import { getWalletBalance } from '../../services/patient-wallet.js';
import { quoteConsultationCheckoutForPatient, settleConsultationPaymentRewards } from '../../services/reward-settlement.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';
import {
  consultationInclude,
  getReceptionStoreFromRequest,
  ReceptionScopeError,
  requireStoreId,
  resolveReceptionContext
} from './shared.js';

async function assertConsultationInStore(consultationId: string, storeId: string) {
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, clinicStoreId: storeId },
    include: consultationInclude()
  });
  if (!consultation) {
    throw new ReceptionScopeError('Consultation not found for this clinic.');
  }
  return consultation;
}

async function markCashPaid(
  consultationId: string,
  actor: { id: string; role: Role },
  io: SocketIoServer
) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      payment: true,
      patient: { select: { id: true, name: true, mobile: true, email: true } },
      disease: { select: { name: true } }
    }
  });

  if (!consultation?.payment) {
    throw new ReceptionScopeError('Payment record not found.');
  }
  if (consultation.payment.status === PaymentStatus.PAID) {
    return consultation;
  }

  await prisma.payment.update({
    where: { id: consultation.payment.id },
    data: {
      status: PaymentStatus.PAID,
      providerPaymentId: `cash-${Date.now()}`
    }
  });
  await prisma.consultation.update({
    where: { id: consultation.id },
    data: { status: ConsultationStatus.PAID }
  });

  const patient = consultation.patient;
  if (patient) {
    void notificationService.sendBatch(
      enabledNotificationChannels.map((channel) => ({
        eventType: 'BOOKING_CONFIRMED' as const,
        channel,
        recipientId: patient.id,
        recipientName: patient.name,
        recipientMobile: patient.mobile,
        recipientEmail: patient.email,
        title: 'Booking confirmed — HopeHub Care',
        body: `Your consultation for ${consultation.disease?.name || 'your concern'} has been booked and payment received at the clinic desk.`
      }))
    );
    io.to(`user:${patient.id}`).emit('payment:updated', { consultationId, status: 'PAID' });
  }

  void trackProductEvent({
    name: PRODUCT_EVENTS.PAYMENT_COMPLETED,
    actorId: actor.id,
    actorRole: actor.role,
    properties: { consultationId, source: 'reception_cash' }
  });

  void settleConsultationPaymentRewards(consultation.payment.id).catch((err) => {
    console.error('[rewards] Settlement failed after reception cash payment', err);
  });

  return prisma.consultation.findUniqueOrThrow({
    where: { id: consultationId },
    include: consultationInclude()
  });
}

async function quoteReceptionCheckout(input: {
  patientId: string;
  diseaseId: string;
  promoCode?: string;
  walletRedeemInPaise?: number;
}) {
  return quoteConsultationCheckoutForPatient({
    patientId: input.patientId,
    diseaseId: input.diseaseId,
    purchaseType: 'ONE_TIME',
    promoCode: input.promoCode,
    walletRedeemInPaise: input.walletRedeemInPaise
  });
}

export function registerReceptionRoutes(router: import('express').Router, io: SocketIoServer) {
  const receptionRoles = [Role.RECEPTIONIST, Role.ADMIN] as const;

  router.get(
    '/reception/me',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const profile = await prisma.receptionistProfile.findUnique({
        where: { userId: req.user!.id },
        include: { store: { select: { id: true, name: true, code: true, address: true } } }
      });

      res.json({
        user: req.user,
        storeId: ctx.storeId,
        profile,
        store: profile?.store ?? null
      });
    })
  );

  router.get(
    '/reception/queue',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = await getReceptionStoreFromRequest(req, ctx);
      const status = queryText(req, 'status');
      const q = queryText(req, 'q').trim().toLowerCase();

      const where: Record<string, unknown> = { clinicStoreId: storeId };
      if (status) where['status'] = status;

      const consultations = await prisma.consultation.findMany({
        where,
        include: consultationInclude(),
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        take: 100
      });

      const filtered = q
        ? consultations.filter((item) => {
            const text = [
              item.patient?.name,
              item.patient?.mobile,
              item.patient?.patientCode,
              item.disease?.name,
              item.assignedDoctor?.name
            ]
              .join(' ')
              .toLowerCase();
            return text.includes(q);
          })
        : consultations;

      const summary = {
        total: filtered.length,
        awaitingPayment: filtered.filter((c) => c.status === ConsultationStatus.PAYMENT_PENDING).length,
        awaitingDoctor: filtered.filter((c) => c.status === ConsultationStatus.PAID).length,
        inProgress: filtered.filter(
          (c) => c.status === ConsultationStatus.ASSIGNED || c.status === ConsultationStatus.IN_PROGRESS
        ).length
      };

      res.json({ consultations: filtered, summary, storeId });
    })
  );

  router.get(
    '/reception/patients/search',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = await getReceptionStoreFromRequest(req, ctx);
      const query = queryText(req, 'q');
      const result = await searchPatients({ query, clinicStoreId: storeId, scope: 'auto' });
      res.json(result);
    })
  );

  router.get(
    '/reception/doctors',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = await getReceptionStoreFromRequest(req, ctx);

      const doctors = await prisma.doctor.findMany({
        where: {
          employeeStatus: { not: 'TERMINATED' },
          user: { isActive: true },
          OR: [{ clinicStoreId: storeId }, { isOnline: true, clinicStoreId: null }]
        },
        select: {
          id: true,
          specialty: true,
          isOnline: true,
          clinicStoreId: true,
          user: { select: { id: true, name: true } }
        },
        orderBy: { user: { name: 'asc' } }
      });

      res.json({
        doctors: doctors.map((doctor) => ({
          id: doctor.user.id,
          doctorProfileId: doctor.id,
          name: doctor.user.name,
          specialty: doctor.specialty,
          isOnline: doctor.isOnline,
          clinicStoreId: doctor.clinicStoreId
        }))
      });
    })
  );

  router.get(
    '/reception/patients/:patientId/rewards',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      const patient = await prisma.user.findFirst({
        where: { id: patientId, role: Role.PATIENT },
        select: { id: true, name: true, patientCode: true }
      });
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });
      const balanceInPaise = await getWalletBalance(patientId);
      res.json({ patient, balanceInPaise });
    })
  );

  router.post(
    '/reception/patients/:patientId/checkout-quote',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      const body = z
        .object({
          diseaseId: z.string().min(1),
          promoCode: z.string().optional(),
          walletRedeemInPaise: z.number().int().min(0).optional()
        })
        .parse(req.body);

      const patient = await prisma.user.findFirst({
        where: { id: patientId, role: Role.PATIENT },
        select: { id: true }
      });
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });

      const quote = await quoteReceptionCheckout({
        patientId,
        diseaseId: body.diseaseId,
        promoCode: body.promoCode,
        walletRedeemInPaise: body.walletRedeemInPaise
      });
      res.json({ quote });
    })
  );

  router.post(
    '/reception/checkout-quote',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          diseaseId: z.string().min(1),
          promoCode: z.string().optional(),
          storeId: z.string().optional()
        })
        .parse(req.body);

      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = requireStoreId(ctx, body.storeId);
      const consultFeePaise = await resolveDiseaseConsultationFee(body.diseaseId, storeId);
      const { resolveGuestConsultationCheckout } = await import('../../services/checkout-pricing.js');
      const quote = await resolveGuestConsultationCheckout({
        grossInPaise: consultFeePaise,
        promoCode: body.promoCode
      });
      res.json({ quote });
    })
  );

  router.post(
    '/reception/walk-in',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          mobile: z.string().min(8),
          email: z.string().email().optional().nullable(),
          diseaseId: z.string().min(1),
          intakeAnswers: z.record(z.string(), z.string()).optional().default({}),
          collectCash: z.boolean().optional().default(false),
          notes: z.string().optional(),
          promoCode: z.string().optional(),
          walletRedeemInPaise: z.number().int().min(0).optional()
        })
        .parse(req.body);

      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = storeIdFromBody(req, ctx);

      await ensureBillingPlans();
      const disease = await prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } });
      const billingPlan = await prisma.billingPlan.findFirst({ where: { code: 'ONE_TIME', isActive: true } });
      if (!billingPlan) {
        return res.status(400).json({ error: 'Billing plan is not configured.' });
      }

      let patient;
      try {
        patient = await createPatientRecord({
          name: body.name,
          mobile: body.mobile,
          email: body.email ?? null,
          homeClinicStoreId: storeId
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
          return res.status(409).json({ error: 'A patient with this email already exists.' });
        }
        throw error;
      }

      const consultFeePaise = await resolveDiseaseConsultationFee(disease.id, storeId);
      const checkout = await quoteReceptionCheckout({
        patientId: patient.id,
        diseaseId: body.diseaseId,
        promoCode: body.promoCode,
        walletRedeemInPaise: body.walletRedeemInPaise
      });

      const consultation = await prisma.consultation.create({
        data: {
          patientId: patient.id,
          diseaseId: disease.id,
          clinicStoreId: storeId,
          intakeAnswers: body.intakeAnswers,
          billingPlanCode: billingPlan.code,
          pricingSnapshot: {
            source: 'reception_walk_in',
            diseaseFeeInPaise: consultFeePaise,
            notes: body.notes ?? null,
            checkout
          },
          payment: {
            create: {
              grossAmountInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              amountInPaise: checkout.payableInPaise,
              billingPlanCode: billingPlan.code,
              appliedRules: checkout.appliedRules,
              lineItems: {
                source: 'reception_walk_in',
                diseaseName: disease.name,
                consultationFeeInPaise: checkout.grossAmountInPaise,
                diseaseFeeInPaise: consultFeePaise,
                discountInPaise: checkout.discountInPaise,
                walletRedeemedInPaise: checkout.walletRedeemedInPaise,
                payableInPaise: checkout.payableInPaise,
                medicineFeeInPaise: 0,
                appliedRules: checkout.appliedRules
              },
              status: body.collectCash ? PaymentStatus.PAID : PaymentStatus.CREATED
            }
          },
          status: body.collectCash ? ConsultationStatus.PAID : ConsultationStatus.PAYMENT_PENDING
        },
        include: consultationInclude()
      });

      if (body.collectCash) {
        const paymentId = consultation.payment?.id;
        if (paymentId) {
          void settleConsultationPaymentRewards(paymentId).catch((err) => {
            console.error('[rewards] Settlement failed after reception walk-in cash', err);
          });
        }
        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'reception.cash_payment',
          targetType: 'consultation',
          targetId: consultation.id,
          summary: `Cash payment recorded for ${patient.name}.`,
          metadata: { patientId: patient.id, amountInPaise: checkout.payableInPaise }
        });
        void trackProductEvent({
          name: PRODUCT_EVENTS.PAYMENT_COMPLETED,
          actorId: req.user!.id,
          actorRole: req.user!.role,
          properties: { consultationId: consultation.id, source: 'reception_walk_in_cash' }
        });
      }

      void trackProductEvent({
        name: PRODUCT_EVENTS.CONSULTATION_BOOKED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: {
          consultationId: consultation.id,
          patientId: patient.id,
          source: 'reception_walk_in'
        }
      });

      res.status(201).json({ patient, consultation });
    })
  );

  router.post(
    '/reception/consultations',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          patientId: z.string().min(1),
          diseaseId: z.string().min(1),
          intakeAnswers: z.record(z.string(), z.string()).optional().default({}),
          collectCash: z.boolean().optional().default(false),
          promoCode: z.string().optional(),
          walletRedeemInPaise: z.number().int().min(0).optional()
        })
        .parse(req.body);

      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = storeIdFromBody(req, ctx);

      await ensureBillingPlans();
      const [patient, disease] = await Promise.all([
        prisma.user.findFirstOrThrow({ where: { id: body.patientId, role: Role.PATIENT } }),
        prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } })
      ]);
      const billingPlan = await prisma.billingPlan.findFirst({ where: { code: 'ONE_TIME', isActive: true } });
      if (!billingPlan) {
        return res.status(400).json({ error: 'Billing plan is not configured.' });
      }

      const consultFeePaise = await resolveDiseaseConsultationFee(disease.id, storeId);
      const checkout = await quoteReceptionCheckout({
        patientId: patient.id,
        diseaseId: body.diseaseId,
        promoCode: body.promoCode,
        walletRedeemInPaise: body.walletRedeemInPaise
      });

      const consultation = await prisma.consultation.create({
        data: {
          patientId: patient.id,
          diseaseId: disease.id,
          clinicStoreId: storeId,
          intakeAnswers: body.intakeAnswers,
          billingPlanCode: billingPlan.code,
          pricingSnapshot: { source: 'reception_booking', diseaseFeeInPaise: consultFeePaise, checkout },
          payment: {
            create: {
              grossAmountInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              amountInPaise: checkout.payableInPaise,
              billingPlanCode: billingPlan.code,
              appliedRules: checkout.appliedRules,
              lineItems: {
                source: 'reception_booking',
                diseaseName: disease.name,
                consultationFeeInPaise: checkout.grossAmountInPaise,
                diseaseFeeInPaise: consultFeePaise,
                discountInPaise: checkout.discountInPaise,
                walletRedeemedInPaise: checkout.walletRedeemedInPaise,
                payableInPaise: checkout.payableInPaise,
                medicineFeeInPaise: 0,
                appliedRules: checkout.appliedRules
              },
              status: body.collectCash ? PaymentStatus.PAID : PaymentStatus.CREATED
            }
          },
          status: body.collectCash ? ConsultationStatus.PAID : ConsultationStatus.PAYMENT_PENDING
        },
        include: consultationInclude()
      });

      if (body.collectCash && consultation.payment?.id) {
        void settleConsultationPaymentRewards(consultation.payment.id).catch((err) => {
          console.error('[rewards] Settlement failed after reception booking cash', err);
        });
      }

      res.status(201).json({ consultation });
    })
  );

  router.post(
    '/reception/consultations/:id/collect-cash',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = await getReceptionStoreFromRequest(req, ctx);
      const consultationId = routeParam(req, 'id');
      await assertConsultationInStore(consultationId, storeId);

      const consultation = await markCashPaid(consultationId, req.user!, io);

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'reception.cash_payment',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Cash payment recorded for consultation ${consultation.id}.`,
        metadata: { patientId: consultation.patientId }
      });

      res.json({ consultation });
    })
  );

  router.put(
    '/reception/consultations/:id/assign',
    authRequired,
    allowRoles(...receptionRoles),
    asyncRoute(async (req, res) => {
      const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
      const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
      const storeId = await getReceptionStoreFromRequest(req, ctx);
      const consultationId = routeParam(req, 'id');
      await assertConsultationInStore(consultationId, storeId);

      const doctor = await prisma.user.findFirstOrThrow({
        where: { id: body.doctorId, role: Role.DOCTOR, isActive: true },
        include: { doctorProfile: { select: { clinicStoreId: true } } }
      });

      const consultation = await prisma.consultation.update({
        where: { id: consultationId },
        data: {
          assignedDoctorId: doctor.id,
          status: ConsultationStatus.ASSIGNED,
          clinicStoreId: doctor.doctorProfile?.clinicStoreId ?? storeId
        },
        include: consultationInclude()
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
            body: `Dr. ${doctor.name} has been assigned to your consultation.`
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
        action: 'reception.assign_doctor',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Assigned Dr. ${doctor.name} from reception desk.`,
        metadata: { doctorId: doctor.id, patientId: consultation.patientId }
      });

      void trackProductEvent({
        name: PRODUCT_EVENTS.CONSULTATION_ASSIGNED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: { consultationId: consultation.id, doctorId: doctor.id, source: 'reception' }
      });

      res.json({ consultation });
    })
  );
}

function storeIdFromBody(req: import('express').Request, ctx: Awaited<ReturnType<typeof resolveReceptionContext>>) {
  const bodyStoreId = typeof req.body?.storeId === 'string' ? req.body.storeId : undefined;
  return requireStoreId(ctx, bodyStoreId);
}
