import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { DEFAULT_BILLING_PLANS } from '../constants/billing.constants.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';

export const router = Router();

export async function ensureBillingPlans() {
  await Promise.all(
    DEFAULT_BILLING_PLANS.map((plan) =>
      prisma.billingPlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          planType: plan.planType,
          priceInPaise: plan.priceInPaise,
          consultationsLimit: plan.consultationsLimit,
          isActive: true,
          sortOrder: plan.sortOrder
        },
        create: plan
      })
    )
  );
}

// ─── Public disease list ───────────────────────────────────────────────────────

router.get(
  '/diseases',
  asyncRoute(async (_req, res) => {
    const diseases = await prisma.disease.findMany({
      where: { isActive: true },
      orderBy: { feeInPaise: 'asc' }
    });
    res.json({ diseases });
  })
);

// ─── Billing plans ─────────────────────────────────────────────────────────────

router.get(
  '/billing/plans',
  asyncRoute(async (_req, res) => {
    await ensureBillingPlans();
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceInPaise: 'asc' }]
    });
    res.json({ plans });
  })
);

// ─── Admin disease CRUD (kept alongside public routes for cohesion) ────────────

router.get(
  '/admin/diseases/list',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (_req, res) => {
    const diseases = await prisma.disease.findMany({ orderBy: { name: 'asc' } });
    res.json({ diseases });
  })
);

router.post(
  '/admin/diseases',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        intakeQuestions: z.array(z.string().min(3)).min(1)
      })
      .parse(req.body);

    const disease = await prisma.disease.create({ data: body });
    res.status(201).json({ disease });
  })
);

router.put(
  '/admin/diseases/:id',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        isActive: z.boolean(),
        intakeQuestions: z.array(z.string().min(1)).min(1)
      })
      .parse(req.body);

    const disease = await prisma.disease.update({
      where: { id: routeParam(req, 'id') },
      data: body
    });
    res.json({ disease });
  })
);
