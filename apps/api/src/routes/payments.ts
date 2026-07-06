import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PaymentStatus, Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import { getRazorpayClient, verifyRazorpaySignature, razorpayKeyId, razorpayWebhookSecret } from '../services/razorpay.js';
import { enabledNotificationChannels, notificationService } from '../services/notification-service.js';
import { buildDoctorPayslip, buildPayslipHistory } from '../services/payroll.js';
import { doctorReceivesConsultationShare, resolveDoctorSharePercent } from '../services/doctor-compensation.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';

export function createPaymentsRouter(io: SocketIoServer) {
  const router = Router();

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
      if (consultation.patientId !== req.user!.id) return res.status(403).json({ message: 'Access denied.' });

      const payment = consultation.payment;
      if (!payment) return res.status(400).json({ message: 'Payment record is missing for this consultation.' });
      if (payment.status === PaymentStatus.PAID) return res.status(400).json({ message: 'Payment is already completed.' });

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

      res.json({ orderId: order.id, amountInPaise: payment.amountInPaise, currency: 'INR', razorpayKeyId });
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
      if (consultation.patientId !== req.user!.id) return res.status(403).json({ message: 'Access denied.' });

      const payment = consultation.payment;
      if (!payment || payment.providerOrderId !== body.razorpayOrderId) {
        return res.status(400).json({ message: 'Payment order does not match consultation.' });
      }
      if (!verifyRazorpaySignature(body)) {
        return res.status(400).json({ message: 'Invalid Razorpay signature.' });
      }

      const wasPaid = payment.status === PaymentStatus.PAID;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', providerPaymentId: body.razorpayPaymentId }
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
            title: 'Booking confirmed — Vitalis Care',
            body: `Your consultation for ${consultation.disease?.name || 'your concern'} has been booked and payment received. A doctor will be assigned shortly.`
          }))
        );
        io.to(`user:${patient.id}`).emit('payment:updated', { consultationId, status: 'PAID' });
      }

      if (!wasPaid) {
        void trackProductEvent({
          name: PRODUCT_EVENTS.PAYMENT_COMPLETED,
          actorId: req.user!.id,
          actorRole: req.user!.role,
          properties: { consultationId, razorpayPaymentId: body.razorpayPaymentId }
        });
      }

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
      const expectedSignature = crypto.createHmac('sha256', razorpayWebhookSecret).update(rawBody).digest('hex');

      if (
        expectedSignature.length !== signature.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
      ) {
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      }

      const event = JSON.parse(rawBody.toString()) as {
        event: string;
        payload?: { payment?: { entity?: { id: string; order_id: string } } };
      };

      if (event.event !== 'payment.captured') return res.json({ ok: true, ignored: true });

      const paymentEntity = event.payload?.payment?.entity;
      if (!paymentEntity?.order_id) {
        return res.status(400).json({ message: 'Webhook payment payload is missing order id.' });
      }

      const payment = await prisma.payment.findFirst({
        where: { providerOrderId: paymentEntity.order_id },
        select: { id: true, consultationId: true, status: true, consultation: { select: { patientId: true } } }
      });
      if (!payment) return res.status(404).json({ message: 'Payment record not found for Razorpay order.' });

      const wasPaid = payment.status === PaymentStatus.PAID;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, providerPaymentId: paymentEntity.id }
      });
      await prisma.consultation.update({
        where: { id: payment.consultationId },
        data: { status: ConsultationStatus.PAID }
      });

      const consultationForNotif = await prisma.consultation.findUnique({
        where: { id: payment.consultationId },
        select: {
          patient: { select: { id: true, name: true, mobile: true, email: true } },
          disease: { select: { name: true } }
        }
      });
      const webhookPatient = consultationForNotif?.patient;
      if (webhookPatient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((channel) => ({
            eventType: 'BOOKING_CONFIRMED' as const,
            channel,
            recipientId: webhookPatient.id,
            recipientName: webhookPatient.name,
            recipientMobile: webhookPatient.mobile,
            recipientEmail: webhookPatient.email,
            title: 'Booking confirmed — Vitalis Care',
            body: `Your consultation for ${consultationForNotif?.disease?.name || 'your concern'} has been booked and payment received. A doctor will be assigned shortly.`
          }))
        );
        io.to(`user:${webhookPatient.id}`).emit('payment:updated', { consultationId: payment.consultationId, status: 'PAID' });
      }

      if (!wasPaid) {
        void trackProductEvent({
          name: PRODUCT_EVENTS.PAYMENT_COMPLETED,
          actorId: payment.consultation.patientId,
          actorRole: Role.PATIENT,
          properties: { consultationId: payment.consultationId, razorpayPaymentId: paymentEntity.id, source: 'webhook' }
        });
      }

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
      const payments = await prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, consultation: { assignedDoctorId: req.user!.id } },
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

      const totals = payments.reduce(
        (acc, p) => {
          acc.gross += p.amountInPaise;
          acc.estimatedDoctorEarnings += Math.round((p.amountInPaise * doctorSharePercent) / 100);
          return acc;
        },
        { gross: 0, estimatedDoctorEarnings: 0 }
      );

      res.json({
        doctorSharePercent,
        totals: {
          paidConsultations: payments.length,
          grossInPaise: totals.gross,
          estimatedDoctorEarningsInPaise: totals.estimatedDoctorEarnings
        },
        payments
      });
    })
  );

  // GET /doctor/my-payslip?month=YYYY-MM
  router.get(
    '/doctor/my-payslip',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
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
