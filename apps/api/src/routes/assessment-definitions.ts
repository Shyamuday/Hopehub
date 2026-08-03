import { Router } from 'express';
import { PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptional, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../utils/helpers.js';
import {
  assertAssessmentAccess,
  getAssessmentAccessStatus,
  getAssessmentDefinition,
  normalizeAssessmentAccessMode,
  redeemAssessmentCoupon,
  scoreAssessment,
  serializeAssessmentAccess
} from '../services/assessment-definitions.js';
import {
  getRazorpayClient,
  isRazorpayConfigured,
  razorpayKeyId,
  verifyRazorpaySignature
} from '../services/razorpay.js';

type RazorpayPaymentEntity = {
  id: string;
  order_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

type AssessmentDefinitionRow = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  version: string;
  config: unknown;
  accessMode: string;
  priceInPaise: number | null;
  couponLabel: string | null;
  accessNote: string | null;
  sortOrder: number;
};

export const assessmentDefinitionsRouter = Router();
const assessmentScoreSchema = z.object({
  answers: z.array(z.number().int().min(0).max(10)).min(1).max(120)
});
const redeemCouponSchema = z.object({
  couponCode: z.string().trim().min(2).max(80)
});
const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

function serializeDefinition(row: AssessmentDefinitionRow) {
  const access = serializeAssessmentAccess({
    accessMode: normalizeAssessmentAccessMode(row.accessMode),
    priceInPaise: row.priceInPaise,
    couponLabel: row.couponLabel,
    accessNote: row.accessNote
  });
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    version: row.version,
    sortOrder: row.sortOrder,
    config: row.config,
    access
  };
}

function serializeAssessmentConfig(row: AssessmentDefinitionRow) {
  return {
    ...(row.config as Record<string, unknown>),
    access: serializeDefinition(row).access
  };
}

assessmentDefinitionsRouter.get(
  '/assessment-definitions',
  asyncRoute(async (req, res) => {
    const q = queryText(req, 'q').trim();
    const category = queryText(req, 'category').trim();
    const page = queryPositiveInt(req, 'page', 1, 1, 500);
    const pageSize = queryPositiveInt(req, 'pageSize', 100, 1, 200);
    const offset = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
    if (q) {
      const search = `%${q}%`;
      conditions.push(Prisma.sql`(
        "title" ILIKE ${search}
        OR "description" ILIKE ${search}
        OR "type" ILIKE ${search}
        OR "category" ILIKE ${search}
      )`);
    }
    if (category) {
      conditions.push(Prisma.sql`"category" = ${category}`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<AssessmentDefinitionRow[]>(Prisma.sql`
        SELECT
          "id",
          "type",
          "category",
          "title",
          "description",
          "version",
          "config",
          "accessMode",
          "priceInPaise",
          "couponLabel",
          "accessNote",
          "sortOrder"
        FROM "AssessmentDefinition"
        ${where}
        ORDER BY "sortOrder" ASC, "title" ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<{ count: bigint | number }[]>(Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "AssessmentDefinition"
        ${where}
      `)
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    res.json({
      assessments: rows.map(serializeAssessmentConfig),
      definitions: rows.map(serializeDefinition),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

assessmentDefinitionsRouter.get(
  '/assessment-definitions/:id',
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const rows = await prisma.$queryRaw<AssessmentDefinitionRow[]>(Prisma.sql`
      SELECT
        "id",
        "type",
        "category",
        "title",
        "description",
        "version",
        "config",
        "accessMode",
        "priceInPaise",
        "couponLabel",
        "accessNote",
        "sortOrder"
      FROM "AssessmentDefinition"
      WHERE "id" = ${id} AND "isActive" = true
      LIMIT 1
    `);

    const definition = rows[0];
    if (!definition) {
      res.status(404).json({ error: 'Assessment definition not found' });
      return;
    }

    res.json({
      assessment: serializeAssessmentConfig(definition),
      definition: serializeDefinition(definition)
    });
  })
);

assessmentDefinitionsRouter.get(
  '/assessment-definitions/:id/access',
  authOptional,
  asyncRoute(async (req, res) => {
    const definition = await getAssessmentDefinition(routeParam(req, 'id'));
    if (!definition) {
      res.status(404).json({ message: 'Assessment definition not found.' });
      return;
    }

    res.json({ access: await getAssessmentAccessStatus(definition, req.user?.id) });
  })
);

assessmentDefinitionsRouter.post(
  '/assessment-definitions/:id/redeem-coupon',
  authRequired,
  asyncRoute(async (req, res) => {
    const definition = await getAssessmentDefinition(routeParam(req, 'id'));
    if (!definition) {
      res.status(404).json({ message: 'Assessment definition not found.' });
      return;
    }

    const body = redeemCouponSchema.parse(req.body);
    try {
      const result = await redeemAssessmentCoupon(definition, req.user!.id, body.couponCode);
      res.json(result);
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Could not redeem coupon.'
      });
    }
  })
);

assessmentDefinitionsRouter.post(
  '/assessment-definitions/:id/create-order',
  authRequired,
  asyncRoute(async (req, res) => {
    const definition = await getAssessmentDefinition(routeParam(req, 'id'));
    if (!definition) {
      res.status(404).json({ message: 'Assessment definition not found.' });
      return;
    }

    const existingAccess = await getAssessmentAccessStatus(definition, req.user!.id);
    if (existingAccess.canAccess) {
      res.status(400).json({ message: 'This assessment is already unlocked.' });
      return;
    }
    if (
      definition.accessMode !== 'PAID' ||
      !definition.priceInPaise ||
      definition.priceInPaise <= 0
    ) {
      res.status(400).json({ message: 'This assessment does not require payment.' });
      return;
    }
    if (!isRazorpayConfigured()) {
      res.status(503).json({ message: 'Payment gateway is not configured.' });
      return;
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: definition.priceInPaise,
      currency: 'INR',
      receipt: `assessment_${definition.id}_${Date.now()}`.slice(0, 40),
      notes: {
        purpose: 'assessment_unlock',
        assessmentId: definition.id,
        userId: req.user!.id
      }
    });

    await prisma.assessmentPayment.create({
      data: {
        userId: req.user!.id,
        assessmentId: definition.id,
        providerOrderId: order.id,
        amountInPaise: definition.priceInPaise,
        currency: 'INR',
        status: PaymentStatus.CREATED,
        notes: {
          purpose: 'assessment_unlock',
          assessmentTitle: definition.title,
          receipt: order.receipt || null
        }
      }
    });

    res.json({
      orderId: order.id,
      amountInPaise: definition.priceInPaise,
      currency: 'INR',
      razorpayKeyId,
      description: `Unlock ${definition.title}`
    });
  })
);

assessmentDefinitionsRouter.post(
  '/assessment-definitions/:id/verify-payment',
  authRequired,
  asyncRoute(async (req, res) => {
    const definition = await getAssessmentDefinition(routeParam(req, 'id'));
    if (!definition) {
      res.status(404).json({ message: 'Assessment definition not found.' });
      return;
    }

    if (!isRazorpayConfigured()) {
      res.status(503).json({ message: 'Payment gateway is not configured.' });
      return;
    }

    const body = verifyPaymentSchema.parse(req.body);
    if (!verifyRazorpaySignature(body)) {
      res.status(400).json({ message: 'Invalid Razorpay signature.' });
      return;
    }

    const assessmentPayment = await prisma.assessmentPayment.findUnique({
      where: { providerOrderId: body.razorpayOrderId }
    });
    if (
      !assessmentPayment ||
      assessmentPayment.userId !== req.user!.id ||
      assessmentPayment.assessmentId !== definition.id
    ) {
      res.status(400).json({ message: 'Payment order does not match this assessment.' });
      return;
    }
    if (assessmentPayment.status === PaymentStatus.PAID) {
      res.json({ ok: true, access: await getAssessmentAccessStatus(definition, req.user!.id) });
      return;
    }

    const razorpay = getRazorpayClient();
    const gatewayPayment = (await razorpay.payments.fetch(
      body.razorpayPaymentId
    )) as RazorpayPaymentEntity;
    const gatewayAmount = Number(gatewayPayment.amount);
    const gatewayCurrency = (gatewayPayment.currency || '').toUpperCase();
    if (
      gatewayPayment.order_id !== body.razorpayOrderId ||
      gatewayAmount !== assessmentPayment.amountInPaise ||
      gatewayCurrency !== 'INR'
    ) {
      res.status(400).json({ message: 'Payment details do not match this assessment.' });
      return;
    }

    let capturedPayment = gatewayPayment;
    if (gatewayPayment.status === 'authorized') {
      capturedPayment = (await razorpay.payments.capture(
        body.razorpayPaymentId,
        assessmentPayment.amountInPaise,
        'INR'
      )) as RazorpayPaymentEntity;
    }
    if (capturedPayment.status !== 'captured') {
      res.status(400).json({ message: 'Payment is not captured yet.' });
      return;
    }

    await prisma.$transaction([
      prisma.assessmentPayment.update({
        where: { id: assessmentPayment.id },
        data: {
          providerPaymentId: body.razorpayPaymentId,
          status: PaymentStatus.PAID,
          verifiedAt: new Date()
        }
      }),
      prisma.assessmentAccessGrant.upsert({
        where: {
          userId_assessmentId_source_couponCode: {
            userId: req.user!.id,
            assessmentId: definition.id,
            source: 'PAYMENT',
            couponCode: ''
          }
        },
        create: {
          userId: req.user!.id,
          assessmentId: definition.id,
          source: 'PAYMENT',
          couponCode: '',
          paymentId: assessmentPayment.id
        },
        update: { paymentId: assessmentPayment.id }
      })
    ]);

    res.json({ ok: true, access: await getAssessmentAccessStatus(definition, req.user!.id) });
  })
);

assessmentDefinitionsRouter.post(
  '/assessment-definitions/:id/score',
  authOptional,
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = assessmentScoreSchema.parse(req.body);
    const definition = await getAssessmentDefinition(id);
    if (!definition) {
      res.status(404).json({ error: 'Assessment definition not found' });
      return;
    }

    try {
      await assertAssessmentAccess(definition, req.user?.id);
      res.json({ result: scoreAssessment(definition, body.answers) });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Could not score assessment',
        error: error instanceof Error ? error.message : 'Could not score assessment'
      });
    }
  })
);
