import type express from 'express';
import { PaymentStatus, type Prisma, Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { queryPositiveInt, queryText } from '../../lib/http-params.js';

export function registerAdminPaymentRoutes(app: express.Application) {
  app.get(
    '/admin/payments',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const status = queryText(req, 'status').toUpperCase();
      const from = queryText(req, 'from');
      const to = queryText(req, 'to');
      const exportType = queryText(req, 'export').toLowerCase();

      const where: Prisma.PaymentWhereInput = {
        ...(status === 'PAID' || status === 'FAILED' || status === 'CREATED'
          ? { status: status as PaymentStatus }
          : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {})
              }
            }
          : {})
      };

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          include: {
            consultation: {
              select: {
                id: true,
                status: true,
                patient: { select: { id: true, name: true } },
                assignedDoctor: { select: { id: true, name: true } },
                disease: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      if (exportType === 'csv') {
        const lines = [
          'paymentId,consultationId,patientName,doctorName,disease,billingPlanCode,amountInPaise,status,providerOrderId,providerPaymentId,createdAt'
        ];
        for (const payment of payments) {
          lines.push(
            [
              payment.id,
              payment.consultationId,
              payment.consultation.patient?.name || '',
              payment.consultation.assignedDoctor?.name || '',
              payment.consultation.disease?.name || '',
              payment.billingPlanCode || '',
              String(payment.amountInPaise),
              payment.status,
              payment.providerOrderId || '',
              payment.providerPaymentId || '',
              payment.createdAt.toISOString()
            ]
              .map((value) => `"${String(value).replaceAll('"', '""')}"`)
              .join(',')
          );
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="admin-payments-page-${page}.csv"`);
        return res.send(lines.join('\n'));
      }

      const summary = payments.reduce(
        (acc, payment) => {
          acc.total += payment.amountInPaise;
          if (payment.status === PaymentStatus.PAID) acc.paid += payment.amountInPaise;
          if (payment.status === PaymentStatus.FAILED) acc.failedCount += 1;
          if (payment.status === PaymentStatus.CREATED) acc.pendingCount += 1;
          return acc;
        },
        { total: 0, paid: 0, failedCount: 0, pendingCount: 0 }
      );

      res.json({
        payments,
        summary,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );
}
