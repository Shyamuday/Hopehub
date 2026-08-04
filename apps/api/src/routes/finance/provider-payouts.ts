import { Router } from 'express';
import { PaymentStatus, ProviderPayoutStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import { backfillProviderEarnings } from '../../services/provider-earnings.js';
import { monthDateRange } from './shared.js';

const payoutStatusSchema = z.object({
  status: z.nativeEnum(ProviderPayoutStatus),
  payoutReference: z.string().trim().max(160).optional().nullable(),
  payoutNote: z.string().trim().max(1000).optional().nullable()
});

export function registerFinanceProviderPayoutRoutes(router: Router) {
  router.get(
    '/admin/finance/provider-payouts',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const status = queryText(req, 'status');
      const doctorId = queryText(req, 'doctorId');
      const { fromDate, toDate } = monthDateRange(queryText(req, 'from'), queryText(req, 'to'));
      const where = {
        ...(status && status in ProviderPayoutStatus
          ? { payoutStatus: status as ProviderPayoutStatus }
          : {}),
        ...(doctorId ? { doctorUserId: doctorId } : {}),
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {})
              }
            }
          : {})
      };

      const [earnings, totals, paidTotals, holdTotals, pendingTotals] = await Promise.all([
        prisma.providerEarning.findMany({
          where,
          include: {
            doctor: { select: { id: true, name: true, email: true, mobile: true } },
            patient: { select: { id: true, name: true, mobile: true } },
            consultation: {
              select: {
                id: true,
                status: true,
                disease: { select: { name: true } }
              }
            },
            payment: {
              select: {
                id: true,
                amountInPaise: true,
                status: true,
                providerPaymentId: true,
                createdAt: true
              }
            },
            paidBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 300
        }),
        prisma.providerEarning.aggregate({
          where,
          _sum: {
            grossAmountInPaise: true,
            providerEarningInPaise: true,
            platformFeeInPaise: true
          },
          _count: { _all: true }
        }),
        prisma.providerEarning.aggregate({
          where: { ...where, payoutStatus: ProviderPayoutStatus.PAID },
          _sum: { providerEarningInPaise: true },
          _count: { _all: true }
        }),
        prisma.providerEarning.aggregate({
          where: { ...where, payoutStatus: ProviderPayoutStatus.HOLD },
          _sum: { providerEarningInPaise: true },
          _count: { _all: true }
        }),
        prisma.providerEarning.aggregate({
          where: { ...where, payoutStatus: ProviderPayoutStatus.PENDING },
          _sum: { providerEarningInPaise: true },
          _count: { _all: true }
        })
      ]);

      res.json({
        earnings,
        summary: {
          count: totals._count._all,
          grossAmountInPaise: totals._sum.grossAmountInPaise ?? 0,
          providerEarningInPaise: totals._sum.providerEarningInPaise ?? 0,
          platformFeeInPaise: totals._sum.platformFeeInPaise ?? 0,
          paidInPaise: paidTotals._sum.providerEarningInPaise ?? 0,
          paidCount: paidTotals._count._all,
          holdInPaise: holdTotals._sum.providerEarningInPaise ?? 0,
          holdCount: holdTotals._count._all,
          pendingInPaise: pendingTotals._sum.providerEarningInPaise ?? 0,
          pendingCount: pendingTotals._count._all
        }
      });
    })
  );

  router.patch(
    '/admin/finance/provider-payouts/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = payoutStatusSchema.parse(req.body);
      const payoutStatus = body.status;
      const earning = await prisma.providerEarning.update({
        where: { id: routeParam(req, 'id') },
        data: {
          payoutStatus,
          payoutReference: body.payoutReference || null,
          payoutNote: body.payoutNote || null,
          paidAt: payoutStatus === ProviderPayoutStatus.PAID ? new Date() : null,
          paidByUserId: payoutStatus === ProviderPayoutStatus.PAID ? req.user!.id : null
        }
      });
      res.json({ earning });
    })
  );

  router.post(
    '/admin/finance/provider-payouts/backfill',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const result = await backfillProviderEarnings();
      const paidCount = await prisma.providerEarning.count({
        where: { paymentStatus: PaymentStatus.PAID }
      });
      res.json({ ...result, paidCount });
    })
  );
}
