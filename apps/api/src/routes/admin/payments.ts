import { Router } from 'express';
import { FollowUpEntitlementStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, queryPositiveInt, routeParam } from '../../utils/helpers.js';
import { getRazorpayClient } from '../../services/razorpay.js';
import {
  buildPaymentWhere,
  exportAdminPaymentsCsv,
  listAdminPayments
} from '../../services/admin-payments.js';
import { applyConsultationCancellationEffects } from '../../services/consultation-cancellation.js';
import { upsertProviderEarningForPayment } from '../../services/provider-earnings.js';

type RazorpayRefundEntity = {
  id: string;
  amount: number | string;
  status: string;
  payment_id: string;
  created_at?: number;
  notes?: Record<string, unknown>;
};

const refundSchema = z.object({
  amountInPaise: z.number().int().min(100).optional(),
  reason: z.string().trim().min(3).max(500),
  speed: z.enum(['normal', 'optimum']).default('normal'),
  cancelConsultation: z.boolean().optional()
});

const followUpStatusSchema = z.object({
  status: z.nativeEnum(FollowUpEntitlementStatus),
  scheduledAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});

export function registerAdminPaymentRoutes(router: Router) {
  router.get(
    '/admin/payments',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const exportType = queryText(req, 'export').toLowerCase();
      const where = buildPaymentWhere({
        status: queryText(req, 'status'),
        from: queryText(req, 'from'),
        to: queryText(req, 'to')
      });

      if (exportType === 'csv') {
        const csv = await exportAdminPaymentsCsv(where);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
        return res.send(csv);
      }

      const result = await listAdminPayments(where, page, pageSize);
      res.json({
        payments: result.payments,
        summary: result.summary,
        pagination: result.pagination,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize
      });
    })
  );

  router.get(
    '/admin/payments/:paymentId/events',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const paymentId = routeParam(req, 'paymentId');
      const [events, refunds] = await Promise.all([
        prisma.paymentGatewayEvent.findMany({
          where: { paymentId },
          orderBy: { receivedAt: 'desc' },
          take: 100
        }),
        prisma.paymentRefund.findMany({
          where: { paymentId },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);

      res.json({ events, refunds });
    })
  );

  router.get(
    '/admin/donations',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const status = queryText(req, 'status');
      const q = queryText(req, 'q').trim();
      const where: Prisma.DonationPaymentWhereInput = {
        ...(status && status in PaymentStatus ? { status: status as PaymentStatus } : {}),
        ...(q
          ? {
              OR: [
                { donorName: { contains: q, mode: 'insensitive' } },
                { donorEmail: { contains: q, mode: 'insensitive' } },
                { donorPhone: { contains: q, mode: 'insensitive' } },
                { providerOrderId: { contains: q, mode: 'insensitive' } },
                { providerPaymentId: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [donations, total, paidSummary, createdSummary] = await Promise.all([
        prisma.donationPayment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.donationPayment.count({ where }),
        prisma.donationPayment.aggregate({
          where: { ...where, status: PaymentStatus.PAID },
          _sum: { amountInPaise: true },
          _count: { _all: true }
        }),
        prisma.donationPayment.aggregate({
          where: { ...where, status: PaymentStatus.CREATED },
          _sum: { amountInPaise: true },
          _count: { _all: true }
        })
      ]);

      res.json({
        donations,
        summary: {
          paidAmountInPaise: paidSummary._sum.amountInPaise ?? 0,
          paidCount: paidSummary._count._all,
          pendingAmountInPaise: createdSummary._sum.amountInPaise ?? 0,
          pendingCount: createdSummary._count._all
        },
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  router.get(
    '/admin/follow-ups',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const status = queryText(req, 'status');
      const q = queryText(req, 'q').trim();
      const where: Prisma.ConsultationFollowUpEntitlementWhereInput = {
        ...(status && status in FollowUpEntitlementStatus
          ? { status: status as FollowUpEntitlementStatus }
          : {}),
        ...(q
          ? {
              OR: [
                { patient: { name: { contains: q, mode: 'insensitive' } } },
                { patient: { email: { contains: q, mode: 'insensitive' } } },
                { patient: { mobile: { contains: q, mode: 'insensitive' } } },
                { consultationId: { contains: q, mode: 'insensitive' } },
                { consultation: { disease: { name: { contains: q, mode: 'insensitive' } } } }
              ]
            }
          : {})
      };

      const [followUps, total, requested, available, scheduled] = await Promise.all([
        prisma.consultationFollowUpEntitlement.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, email: true, mobile: true } },
            consultation: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                disease: { select: { name: true } },
                assignedDoctor: { select: { id: true, name: true, email: true, mobile: true } },
                payment: {
                  select: {
                    id: true,
                    status: true,
                    amountInPaise: true,
                    providerPaymentId: true,
                    createdAt: true
                  }
                }
              }
            }
          },
          orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.consultationFollowUpEntitlement.count({ where }),
        prisma.consultationFollowUpEntitlement.count({
          where: { status: FollowUpEntitlementStatus.REQUESTED }
        }),
        prisma.consultationFollowUpEntitlement.count({
          where: { status: FollowUpEntitlementStatus.AVAILABLE }
        }),
        prisma.consultationFollowUpEntitlement.count({
          where: { status: FollowUpEntitlementStatus.SCHEDULED }
        })
      ]);

      res.json({
        followUps,
        summary: { requested, available, scheduled },
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  router.patch(
    '/admin/follow-ups/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = followUpStatusSchema.parse(req.body);
      const data: Prisma.ConsultationFollowUpEntitlementUpdateInput = {
        status: body.status,
        notes: body.notes ?? undefined,
        scheduledAt:
          body.status === FollowUpEntitlementStatus.SCHEDULED
            ? (body.scheduledAt ?? new Date())
            : undefined,
        usedAt: body.status === FollowUpEntitlementStatus.USED ? new Date() : undefined
      };

      const followUp = await prisma.consultationFollowUpEntitlement.update({
        where: { id },
        data,
        include: {
          patient: { select: { id: true, name: true, email: true, mobile: true } },
          consultation: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              disease: { select: { name: true } },
              assignedDoctor: { select: { id: true, name: true, email: true, mobile: true } },
              payment: {
                select: {
                  id: true,
                  status: true,
                  amountInPaise: true,
                  providerPaymentId: true,
                  createdAt: true
                }
              }
            }
          }
        }
      });

      res.json({ followUp });
    })
  );

  router.post(
    '/admin/payments/:paymentId/refund',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const paymentId = routeParam(req, 'paymentId');
      const body = refundSchema.parse(req.body);
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { consultation: { select: { id: true, status: true, patientId: true } } }
      });

      if (!payment) return res.status(404).json({ message: 'Payment not found.' });
      if (!payment.providerPaymentId) {
        return res.status(400).json({ message: 'Gateway payment id is missing.' });
      }
      if (
        payment.status !== PaymentStatus.PAID &&
        payment.status !== PaymentStatus.PARTIALLY_REFUNDED
      ) {
        return res.status(400).json({ message: 'Only paid payments can be refunded.' });
      }

      const refundableInPaise = payment.amountInPaise - payment.refundedAmountInPaise;
      const amountInPaise = body.amountInPaise ?? refundableInPaise;
      if (amountInPaise <= 0 || amountInPaise > refundableInPaise) {
        return res.status(400).json({ message: 'Refund amount exceeds refundable balance.' });
      }

      const receipt = `refund_${payment.id}_${Date.now()}`;
      const notes = {
        paymentId: payment.id,
        consultationId: payment.consultationId,
        reason: body.reason.slice(0, 512),
        processedByUserId: req.user!.id
      };
      const razorpay = getRazorpayClient();
      const refund = (await razorpay.payments.refund(payment.providerPaymentId, {
        amount: amountInPaise,
        speed: body.speed,
        receipt,
        notes
      })) as RazorpayRefundEntity;

      const providerCreatedAt =
        typeof refund.created_at === 'number' ? new Date(refund.created_at * 1000) : undefined;
      const newRefundedTotal = payment.refundedAmountInPaise + Number(refund.amount);
      const nextStatus =
        newRefundedTotal >= payment.amountInPaise
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      const [savedRefund, updatedPayment] = await prisma.$transaction([
        prisma.paymentRefund.create({
          data: {
            paymentId: payment.id,
            providerRefundId: refund.id,
            providerPaymentId: refund.payment_id || payment.providerPaymentId,
            amountInPaise: Number(refund.amount),
            status: refund.status,
            reason: body.reason,
            notes: notes as Prisma.InputJsonObject,
            processedByUserId: req.user!.id,
            providerCreatedAt
          }
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundedAmountInPaise: newRefundedTotal,
            status: nextStatus,
            ...(body.cancelConsultation && nextStatus === PaymentStatus.REFUNDED
              ? { consultation: { update: { status: 'CANCELLED' } } }
              : {})
          }
        }),
        prisma.paymentGatewayEvent.create({
          data: {
            paymentId: payment.id,
            eventType: 'refund.created',
            providerOrderId: payment.providerOrderId,
            providerPaymentId: refund.payment_id || payment.providerPaymentId,
            amountInPaise: Number(refund.amount),
            currency: 'INR',
            status: refund.status,
            source: 'admin_refund',
            signatureVerified: false,
            payload: refund as unknown as Prisma.InputJsonValue
          }
        })
      ]);

      await upsertProviderEarningForPayment(payment.id, {
        forceHold: true,
        payoutNote: `Refund ${nextStatus === PaymentStatus.REFUNDED ? 'full' : 'partial'}: ${body.reason}`
      });

      if (body.cancelConsultation && nextStatus === PaymentStatus.REFUNDED) {
        await applyConsultationCancellationEffects({
          consultationId: payment.consultationId,
          actorId: req.user!.id,
          actorRole: req.user!.role,
          reason: body.reason,
          restorePackageSession: true,
          holdProviderPayout: true
        });
      }

      res.status(201).json({ refund: savedRefund, payment: updatedPayment });
    })
  );
}
