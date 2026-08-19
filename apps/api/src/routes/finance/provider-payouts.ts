import { Router } from 'express';
import {
  PaymentStatus,
  Prisma,
  ProviderEarningModel,
  ProviderPayoutStatus,
  Role
} from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import { backfillProviderEarnings } from '../../services/provider-earnings.js';
import { monthDateRange } from './shared.js';
import {
  computeProviderCompensation,
  providerCompensationSelect,
  serializeProviderCompensation
} from '../../services/provider-compensation.js';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function enrichPayoutRow(row: any) {
  const lineItems = asRecord(row.payment?.lineItems);
  const usage = row.packageUsage || lineItems['packageUsage'] || null;
  return {
    ...row,
    pricingLabel: String(lineItems['careTeamPricingLabel'] || '') || null,
    pricingMode: row.pricingMode || String(lineItems['careTeamPricingMode'] || '') || null,
    pricingRule: row.pricingRule || String(lineItems['careTeamPricingRule'] || '') || null,
    serviceTitle: row.serviceTitle || String(lineItems['careTeamServiceTitle'] || '') || null,
    packageUsage: usage,
    freeMinutes: Number(lineItems['careTeamFreeMinutes'] || 0) || null,
    pricePerMinuteInPaise: Number(lineItems['careTeamPricePerMinuteInPaise'] || 0) || null,
    billableMinutes: Number(lineItems['careTeamBillableMinutes'] || 0) || null
  };
}

const payoutStatusSchema = z.object({
  status: z.nativeEnum(ProviderPayoutStatus),
  payoutReference: z.string().trim().max(160).optional().nullable(),
  payoutNote: z.string().trim().max(1000).optional().nullable()
});

const compensationSchema = z.object({
  model: z.nativeEnum(ProviderEarningModel),
  providerPercent: z.number().int().min(0).max(100),
  providerFixedInPaise: z.number().int().min(0).max(100_000_000),
  platformPercent: z.number().int().min(0).max(100),
  platformFixedInPaise: z.number().int().min(0).max(100_000_000),
  minimumProviderInPaise: z.number().int().min(0).max(100_000_000).nullable(),
  maximumPlatformInPaise: z.number().int().min(0).max(100_000_000).nullable()
});

export function registerFinanceProviderPayoutRoutes(router: Router) {
  router.get(
    '/admin/finance/provider-compensation',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const previewGrossInPaise = Math.max(
        100,
        Math.min(10_000_000, Number(queryText(req, 'previewGrossInPaise')) || 100_000)
      );
      const [doctors, audits] = await Promise.all([
        prisma.doctor.findMany({
          where: { user: { isActive: true } },
          select: {
            id: true,
            providerDomain: true,
            doctorType: true,
            specialty: true,
            designation: true,
            compensationModel: true,
            compensationUpdatedAt: true,
            ...providerCompensationSelect,
            user: { select: { id: true, name: true, email: true, mobile: true } }
          },
          orderBy: [{ user: { name: 'asc' } }]
        }),
        prisma.providerCompensationAudit.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);
      const actors = await prisma.user.findMany({
        where: { id: { in: [...new Set(audits.map((audit) => audit.actorUserId))] } },
        select: { id: true, name: true, email: true }
      });
      const actorById = new Map(actors.map((actor) => [actor.id, actor]));
      const doctorNameById = new Map(doctors.map((doctor) => [doctor.id, doctor.user.name]));
      res.json({
        previewGrossInPaise,
        providers: doctors.map((doctor) => ({
          id: doctor.id,
          user: doctor.user,
          providerDomain: doctor.providerDomain,
          doctorType: doctor.doctorType,
          specialty: doctor.specialty,
          designation: doctor.designation,
          compensationModel: doctor.compensationModel,
          compensationUpdatedAt: doctor.compensationUpdatedAt,
          rule: serializeProviderCompensation(doctor),
          preview: computeProviderCompensation(previewGrossInPaise, doctor)
        })),
        audits: audits.map((audit) => ({
          ...audit,
          providerName: doctorNameById.get(audit.doctorId) || 'Provider',
          actor: actorById.get(audit.actorUserId) || null
        }))
      });
    })
  );

  router.patch(
    '/admin/finance/provider-compensation/:doctorId',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = compensationSchema.parse(req.body);
      const doctorId = routeParam(req, 'doctorId');
      const existing = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, ...providerCompensationSelect }
      });
      if (!existing) return res.status(404).json({ message: 'Provider not found.' });
      const before = serializeProviderCompensation(existing);
      const doctor = await prisma.$transaction(async (tx) => {
        const updated = await tx.doctor.update({
          where: { id: doctorId },
          data: {
            providerEarningModel: body.model,
            consultationSharePercent: body.providerPercent,
            providerFixedEarningInPaise: body.providerFixedInPaise,
            platformFeePercent: body.platformPercent,
            platformFixedFeeInPaise: body.platformFixedInPaise,
            minimumProviderEarningInPaise: body.minimumProviderInPaise,
            maximumPlatformFeeInPaise: body.maximumPlatformInPaise,
            compensationUpdatedAt: new Date(),
            compensationUpdatedById: req.user!.id
          },
          select: { id: true, ...providerCompensationSelect }
        });
        await tx.providerCompensationAudit.create({
          data: {
            doctorId,
            actorUserId: req.user!.id,
            before: before as Prisma.InputJsonValue,
            after: serializeProviderCompensation(updated) as Prisma.InputJsonValue
          }
        });
        return updated;
      });
      const rule = serializeProviderCompensation(doctor);
      res.json({
        rule,
        preview: computeProviderCompensation(100_000, doctor),
        message: 'Provider income rule saved. It applies to future payment calculations.'
      });
    })
  );

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
                lineItems: true,
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
        earnings: earnings.map(enrichPayoutRow),
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
