import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import {
  ConsultationStatus,
  FollowUpEntitlementStatus,
  PaymentStatus,
  Prisma,
  Role
} from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import {
  getRazorpayClient,
  isRazorpayConfigured,
  verifyRazorpaySignature,
  razorpayKeyId,
  razorpayWebhookSecret
} from '../services/razorpay.js';
import { buildDoctorPayslip, buildPayslipHistory, parseMonth } from '../services/payroll.js';
import {
  doctorReceivesConsultationShare,
  resolveDoctorSharePercent
} from '../services/doctor-compensation.js';
import { buildDoctorEarningsReport } from '../services/doctor-earnings.js';
import { upsertProviderEarningForPayment } from '../services/provider-earnings.js';
import { settleConsultationPaymentRewards } from '../services/reward-settlement.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';
import { tryAssignInstantConsultation } from '../services/online-doctor-presence.js';
import { notifyConsultationBooked } from '../services/consultation-reminders.js';

type RazorpayPaymentEntity = {
  id: string;
  order_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

type RazorpayOrderEntity = {
  id?: string | null;
  amount?: number | string | null;
  amount_paid?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

type RazorpayRefundEntity = {
  id: string;
  payment_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  created_at?: number | null;
  notes?: Record<string, unknown> | null;
};

export function createPaymentsRouter(io: SocketIoServer) {
  const router = Router();

  function asJsonObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  function isSingleSessionPayment(payment: {
    lineItems: Prisma.JsonValue | null;
    consultation: { pricingSnapshot: Prisma.JsonValue | null };
  }) {
    const lineItems = asJsonObject(payment.lineItems);
    const pricingSnapshot = asJsonObject(payment.consultation.pricingSnapshot);
    return (
      lineItems['offeringCode'] === 'SINGLE_30' || pricingSnapshot['offeringCode'] === 'SINGLE_30'
    );
  }

  async function ensureFollowUpEntitlement(input: {
    paymentId: string;
    consultationId: string;
    patientId: string;
    providerPaymentId: string;
  }) {
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      select: {
        lineItems: true,
        consultation: { select: { pricingSnapshot: true } }
      }
    });
    if (!payment || !isSingleSessionPayment(payment)) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.consultationFollowUpEntitlement.upsert({
      where: { consultationId: input.consultationId },
      create: {
        consultationId: input.consultationId,
        patientId: input.patientId,
        durationMinutes: 15,
        status: FollowUpEntitlementStatus.AVAILABLE,
        source: 'single_session_offer',
        availableAfter: now,
        expiresAt,
        metadata: {
          paymentId: input.paymentId,
          providerPaymentId: input.providerPaymentId,
          offeringCode: 'SINGLE_30'
        }
      },
      update: {}
    });
  }

  async function recordGatewayEvent(input: {
    paymentId?: string | null;
    providerEventId?: string | null;
    eventType: string;
    providerOrderId?: string | null;
    providerPaymentId?: string | null;
    amountInPaise?: number | null;
    currency?: string | null;
    status?: string | null;
    source: string;
    signatureVerified?: boolean;
    payload?: Prisma.InputJsonValue;
  }) {
    try {
      await prisma.paymentGatewayEvent.create({
        data: {
          paymentId: input.paymentId ?? null,
          providerEventId: input.providerEventId || null,
          eventType: input.eventType,
          providerOrderId: input.providerOrderId || null,
          providerPaymentId: input.providerPaymentId || null,
          amountInPaise: input.amountInPaise ?? null,
          currency: input.currency || null,
          status: input.status || null,
          source: input.source,
          signatureVerified: input.signatureVerified ?? false,
          payload: input.payload ?? Prisma.JsonNull
        }
      });
      return { duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { duplicate: true };
      }
      throw error;
    }
  }

  async function markConsultationPaid(input: {
    paymentId: string;
    consultationId: string;
    providerPaymentId: string;
    patientId: string;
    actorRole: Role;
    diseaseName?: string | null;
    patient?: { id: string; name: string; mobile: string | null; email: string | null } | null;
    source?: string;
    wasPaid: boolean;
  }) {
    await prisma.payment.update({
      where: { id: input.paymentId },
      data: { status: PaymentStatus.PAID, providerPaymentId: input.providerPaymentId }
    });
    await prisma.consultation.update({
      where: { id: input.consultationId },
      data: { status: ConsultationStatus.PAID }
    });

    if (input.patient) {
      io.to(`user:${input.patient.id}`).emit('payment:updated', {
        consultationId: input.consultationId,
        status: 'PAID'
      });
    }

    if (!input.wasPaid) {
      await ensureFollowUpEntitlement({
        paymentId: input.paymentId,
        consultationId: input.consultationId,
        patientId: input.patientId,
        providerPaymentId: input.providerPaymentId
      });

      await tryAssignInstantConsultation(io, input.consultationId).catch((err) => {
        console.error('[instant] Auto-assign failed after payment', err);
        return null;
      });
      await upsertProviderEarningForPayment(input.paymentId);
      void notifyConsultationBooked(input.consultationId).catch((err) =>
        console.error('[booking-reminders] Payment booking notification failed', err)
      );
      void trackProductEvent({
        name: PRODUCT_EVENTS.PAYMENT_COMPLETED,
        actorId: input.patientId,
        actorRole: input.actorRole,
        properties: {
          consultationId: input.consultationId,
          razorpayPaymentId: input.providerPaymentId,
          ...(input.source ? { source: input.source } : {})
        }
      });
      void settleConsultationPaymentRewards(input.paymentId).catch((err) => {
        console.error('[rewards] Settlement failed after payment', err);
      });
    }
  }

  async function syncRefundFromWebhook(refundEntity: RazorpayRefundEntity) {
    if (!refundEntity.payment_id) return;
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: refundEntity.payment_id },
      select: {
        id: true,
        amountInPaise: true,
        refundedAmountInPaise: true,
        consultation: { select: { patientId: true } }
      }
    });
    if (!payment) return;

    const amountInPaise = Number(refundEntity.amount);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) return;

    const existing = await prisma.paymentRefund.findUnique({
      where: {
        provider_providerRefundId: { provider: 'razorpay', providerRefundId: refundEntity.id }
      }
    });
    const previousAmount = existing && existing.status !== 'failed' ? existing.amountInPaise : 0;
    const nextAmount = refundEntity.status === 'failed' ? 0 : amountInPaise;
    const refundedAmountInPaise = Math.max(
      0,
      Math.min(payment.amountInPaise, payment.refundedAmountInPaise - previousAmount + nextAmount)
    );
    const nextPaymentStatus =
      refundedAmountInPaise <= 0
        ? PaymentStatus.PAID
        : refundedAmountInPaise >= payment.amountInPaise
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;
    const providerCreatedAt =
      typeof refundEntity.created_at === 'number'
        ? new Date(refundEntity.created_at * 1000)
        : undefined;

    await prisma.$transaction([
      prisma.paymentRefund.upsert({
        where: {
          provider_providerRefundId: { provider: 'razorpay', providerRefundId: refundEntity.id }
        },
        create: {
          paymentId: payment.id,
          providerRefundId: refundEntity.id,
          providerPaymentId: refundEntity.payment_id,
          amountInPaise,
          status: refundEntity.status || 'unknown',
          notes: (refundEntity.notes || {}) as Prisma.InputJsonObject,
          providerCreatedAt
        },
        update: {
          amountInPaise,
          status: refundEntity.status || 'unknown',
          notes: (refundEntity.notes || {}) as Prisma.InputJsonObject,
          providerCreatedAt
        }
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { refundedAmountInPaise, status: nextPaymentStatus }
      })
    ]);

    await upsertProviderEarningForPayment(payment.id, {
      forceHold: nextPaymentStatus !== PaymentStatus.PAID,
      payoutNote:
        nextPaymentStatus === PaymentStatus.REFUNDED
          ? 'Refund webhook: full refund'
          : nextPaymentStatus === PaymentStatus.PARTIALLY_REFUNDED
            ? 'Refund webhook: partial refund'
            : undefined
    });

    io.to(`user:${payment.consultation.patientId}`).emit('payment:updated', {
      paymentId: payment.id,
      status: nextPaymentStatus
    });
  }

  // POST /payments/:consultationId/create-order
  router.post(
    '/payments/:consultationId/create-order',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const consultationId = routeParam(req, 'consultationId');
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: { payment: true }
      });
      if (!consultation) return res.status(404).json({ message: 'Consultation not found.' });
      if (consultation.patientId !== req.user!.id)
        return res.status(403).json({ message: 'Access denied.' });

      const payment = consultation.payment;
      if (!payment)
        return res
          .status(400)
          .json({ message: 'Payment record is missing for this consultation.' });
      if (
        payment.status === PaymentStatus.PAID ||
        payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
        payment.status === PaymentStatus.REFUNDED
      ) {
        return res.status(400).json({ message: 'Payment is already completed.' });
      }

      if (!isRazorpayConfigured()) {
        return res.status(503).json({ message: 'Payment gateway is not configured.' });
      }

      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.create({
        amount: payment.amountInPaise,
        currency: 'INR',
        receipt: consultationId,
        notes: {
          consultationId,
          patientId: req.user!.id,
          billingPlanCode: payment.billingPlanCode || consultation.billingPlanCode || 'ONE_TIME'
        }
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerOrderId: order.id, status: PaymentStatus.CREATED }
      });

      void trackProductEvent({
        name: PRODUCT_EVENTS.PAYMENT_INITIATED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: { consultationId, orderId: order.id, amountInPaise: payment.amountInPaise }
      });

      res.json({
        orderId: order.id,
        amountInPaise: payment.amountInPaise,
        currency: 'INR',
        razorpayKeyId
      });
    })
  );

  // POST /payments/:consultationId/verify
  router.post(
    '/payments/:consultationId/verify',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          razorpayOrderId: z.string().min(1),
          razorpayPaymentId: z.string().min(1),
          razorpaySignature: z.string().min(1)
        })
        .parse(req.body);

      const consultationId = routeParam(req, 'consultationId');
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          payment: true,
          patient: { select: { id: true, name: true, mobile: true, email: true } },
          disease: { select: { name: true } }
        }
      });
      if (!consultation) return res.status(404).json({ message: 'Consultation not found.' });
      if (consultation.patientId !== req.user!.id)
        return res.status(403).json({ message: 'Access denied.' });

      const payment = consultation.payment;
      if (!payment || payment.providerOrderId !== body.razorpayOrderId) {
        return res.status(400).json({ message: 'Payment order does not match consultation.' });
      }
      if (!isRazorpayConfigured()) {
        return res.status(503).json({ message: 'Payment gateway is not configured.' });
      }
      if (!verifyRazorpaySignature(body)) {
        return res.status(400).json({ message: 'Invalid Razorpay signature.' });
      }

      const razorpay = getRazorpayClient();
      const gatewayPayment = (await razorpay.payments.fetch(
        body.razorpayPaymentId
      )) as RazorpayPaymentEntity;
      const gatewayAmount = Number(gatewayPayment.amount);
      const gatewayCurrency = (gatewayPayment.currency || '').toUpperCase();
      await recordGatewayEvent({
        paymentId: payment.id,
        eventType: 'payment.checkout_callback',
        providerOrderId: gatewayPayment.order_id || body.razorpayOrderId,
        providerPaymentId: gatewayPayment.id,
        amountInPaise: Number.isFinite(gatewayAmount) ? gatewayAmount : null,
        currency: gatewayCurrency || null,
        status: gatewayPayment.status || null,
        source: 'checkout_callback',
        signatureVerified: true,
        payload: gatewayPayment as Prisma.InputJsonValue
      });
      if (
        gatewayPayment.order_id !== body.razorpayOrderId ||
        gatewayAmount !== payment.amountInPaise ||
        gatewayCurrency !== 'INR'
      ) {
        return res.status(400).json({ message: 'Payment details do not match this order.' });
      }

      let capturedPayment = gatewayPayment;
      if (gatewayPayment.status === 'authorized') {
        capturedPayment = (await razorpay.payments.capture(
          body.razorpayPaymentId,
          payment.amountInPaise,
          'INR'
        )) as RazorpayPaymentEntity;
      }
      if (capturedPayment.status !== 'captured') {
        return res.status(400).json({ message: 'Payment is not captured yet.' });
      }

      const wasPaid = payment.status === PaymentStatus.PAID;

      await markConsultationPaid({
        paymentId: payment.id,
        consultationId,
        providerPaymentId: body.razorpayPaymentId,
        patientId: req.user!.id,
        actorRole: req.user!.role,
        diseaseName: consultation.disease?.name,
        patient: consultation.patient,
        wasPaid
      });

      res.json({ ok: true });
    })
  );

  // POST /payments/razorpay-webhook
  router.post(
    '/payments/razorpay-webhook',
    asyncRoute(async (req, res) => {
      if (!razorpayWebhookSecret) {
        return res.status(503).json({ message: 'Razorpay webhook secret is not configured.' });
      }

      const signature = req.header('x-razorpay-signature') || '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', razorpayWebhookSecret)
        .update(rawBody)
        .digest('hex');

      if (
        expectedSignature.length !== signature.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
      ) {
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      }

      const event = JSON.parse(rawBody.toString()) as {
        event: string;
        payload?: {
          payment?: { entity?: RazorpayPaymentEntity };
          order?: { entity?: RazorpayOrderEntity };
          refund?: { entity?: RazorpayRefundEntity };
        };
      };

      const providerEventId = req.header('x-razorpay-event-id') || null;
      const paymentEntity = event.payload?.payment?.entity;
      const refundEntity = event.payload?.refund?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const gatewayAmount = paymentEntity?.amount ?? event.payload?.order?.entity?.amount_paid;
      const gatewayCurrency =
        paymentEntity?.currency || event.payload?.order?.entity?.currency || null;
      const gatewayStatus = paymentEntity?.status || event.payload?.order?.entity?.status || null;
      const paymentAmount = Number(gatewayAmount);

      const payment = orderId
        ? await prisma.payment.findFirst({
            where: { providerOrderId: orderId },
            select: {
              id: true,
              consultationId: true,
              status: true,
              amountInPaise: true,
              providerPaymentId: true,
              consultation: { select: { patientId: true } }
            }
          })
        : refundEntity?.payment_id
          ? await prisma.payment.findFirst({
              where: { providerPaymentId: refundEntity.payment_id },
              select: {
                id: true,
                consultationId: true,
                status: true,
                amountInPaise: true,
                providerPaymentId: true,
                consultation: { select: { patientId: true } }
              }
            })
          : null;

      const audit = await recordGatewayEvent({
        paymentId: payment?.id,
        providerEventId,
        eventType: event.event || 'unknown',
        providerOrderId: orderId || null,
        providerPaymentId: paymentEntity?.id || refundEntity?.payment_id || null,
        amountInPaise: Number.isFinite(paymentAmount)
          ? paymentAmount
          : Number.isFinite(Number(refundEntity?.amount))
            ? Number(refundEntity?.amount)
            : null,
        currency: gatewayCurrency || refundEntity?.currency || null,
        status: gatewayStatus || refundEntity?.status || null,
        source: 'webhook',
        signatureVerified: true,
        payload: event as unknown as Prisma.InputJsonValue
      });
      if (audit.duplicate) return res.json({ ok: true, duplicate: true });

      const refundEvents = [
        'refund.created',
        'refund.processed',
        'refund.failed',
        'refund.speed_changed'
      ];
      if (refundEvents.includes(event.event)) {
        if (refundEntity) await syncRefundFromWebhook(refundEntity);
        return res.json({ ok: true });
      }

      const supportedEvents = ['payment.captured', 'payment.failed', 'order.paid'];
      if (!supportedEvents.includes(event.event)) return res.json({ ok: true, ignored: true });

      if (!orderId) {
        return res.status(400).json({ message: 'Webhook payment payload is missing order id.' });
      }

      if (!payment)
        return res.status(404).json({ message: 'Payment record not found for Razorpay order.' });

      const wasPaid = payment.status === PaymentStatus.PAID;

      if (event.event === 'payment.failed') {
        if (!wasPaid) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerPaymentId: paymentEntity?.id || payment.providerPaymentId || null
            }
          });
          io.to(`user:${payment.consultation.patientId}`).emit('payment:updated', {
            consultationId: payment.consultationId,
            status: 'FAILED'
          });
        }
        return res.json({ ok: true });
      }

      if (paymentEntity) {
        const webhookAmount = Number(paymentEntity.amount);
        const webhookCurrency = (paymentEntity.currency || '').toUpperCase();
        if (
          paymentEntity.status !== 'captured' ||
          webhookAmount !== payment.amountInPaise ||
          webhookCurrency !== 'INR'
        ) {
          return res
            .status(400)
            .json({ message: 'Webhook payment details do not match this order.' });
        }
      } else if (event.event === 'order.paid') {
        const orderEntity = event.payload?.order?.entity;
        const orderAmount = Number(orderEntity?.amount_paid);
        const orderCurrency = (orderEntity?.currency || '').toUpperCase();
        if (
          orderEntity?.status !== 'paid' ||
          orderAmount !== payment.amountInPaise ||
          orderCurrency !== 'INR'
        ) {
          return res
            .status(400)
            .json({ message: 'Webhook order details do not match this payment.' });
        }
      }

      const consultationForNotif = await prisma.consultation.findUnique({
        where: { id: payment.consultationId },
        select: {
          patient: { select: { id: true, name: true, mobile: true, email: true } },
          disease: { select: { name: true } }
        }
      });
      const webhookPatient = consultationForNotif?.patient;
      await markConsultationPaid({
        paymentId: payment.id,
        consultationId: payment.consultationId,
        providerPaymentId: paymentEntity?.id || payment.providerPaymentId || orderId,
        patientId: payment.consultation.patientId,
        actorRole: Role.PATIENT,
        diseaseName: consultationForNotif?.disease?.name,
        patient: webhookPatient,
        source: `webhook:${event.event}`,
        wasPaid
      });

      res.json({ ok: true });
    })
  );

  // GET /doctor/payments/summary
  router.get(
    '/doctor/payments/summary',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: { compensationModel: true, consultationSharePercent: true }
      });
      if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });

      const doctorSharePercent = doctorReceivesConsultationShare(doctor)
        ? resolveDoctorSharePercent(doctor)
        : 0;

      const monthQuery = typeof req.query['month'] === 'string' ? req.query['month'] : undefined;
      const range = monthQuery ? parseMonth(monthQuery) : undefined;
      const earnings = await buildDoctorEarningsReport(
        req.user!.id,
        doctorSharePercent,
        range?.monthStart,
        range?.monthEnd
      );

      const payments = await prisma.payment.findMany({
        where: {
          consultation: { assignedDoctorId: req.user!.id },
          ...(range
            ? {
                createdAt: {
                  gte: range.monthStart,
                  lte: new Date(
                    range.monthEnd.getFullYear(),
                    range.monthEnd.getMonth(),
                    range.monthEnd.getDate(),
                    23,
                    59,
                    59,
                    999
                  )
                }
              }
            : {})
        },
        include: {
          consultation: {
            select: {
              id: true,
              status: true,
              disease: { select: { name: true } },
              patient: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.json({
        doctorSharePercent,
        month: range?.month ?? null,
        totals: {
          paidConsultations: earnings.consultation.paid.count,
          pendingConsultations: earnings.consultation.pending.count,
          failedConsultations: earnings.consultation.failed.count,
          medicineSales: earnings.medicineSales.count,
          consultationFeeGrossInPaise: earnings.consultation.paid.consultationGrossInPaise,
          medicineFeeGrossInPaise:
            earnings.consultation.paid.medicineGrossInPaise +
            earnings.medicineSales.medicineGrossInPaise,
          grossInPaise: earnings.totals.totalGrossInPaise,
          estimatedDoctorEarningsInPaise: earnings.totals.earnedInPaise,
          pendingEarningsInPaise: earnings.totals.pendingInPaise,
          failedGrossInPaise: earnings.totals.failedGrossInPaise
        },
        earnings,
        payments,
        lineItems: earnings.lineItems.slice(0, 50)
      });
    })
  );

  // GET /doctor/my-payslip?month=YYYY-MM
  router.get(
    '/doctor/my-payslip',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });

      const month = typeof req.query['month'] === 'string' ? req.query['month'] : undefined;
      const payslip = await buildDoctorPayslip(doctor.id, month);
      if (!payslip) return res.status(404).json({ message: 'Doctor record not found.' });
      const history = await buildPayslipHistory('DOCTOR', doctor.id, 3);
      res.json({ payslip, history });
    })
  );

  return router;
}
