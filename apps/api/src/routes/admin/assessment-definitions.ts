import { Router } from 'express';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  queryPositiveInt,
  queryText,
  routeParam,
  writeAuditLog
} from '../../utils/helpers.js';
import {
  type AssessmentConfigDefinition,
  getAssessmentDefinition,
  validateAssessmentConfig
} from '../../services/assessment-definitions.js';

const assessmentDefinitionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  type: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(3000),
  version: z.string().trim().min(1).max(40).default('v1'),
  config: z.record(z.string(), z.unknown()),
  accessMode: z.enum(['FREE', 'LOGIN_REQUIRED', 'PAID']).default('FREE'),
  priceInPaise: z.number().int().min(0).max(10000000).nullable().optional(),
  couponCode: z.string().trim().min(2).max(80).nullable().optional(),
  couponLabel: z.string().trim().min(2).max(160).nullable().optional(),
  couponDiscountType: z.enum(['FREE', 'PERCENT', 'FLAT']).default('FREE'),
  couponDiscountValue: z.number().int().min(0).max(10000000).nullable().optional(),
  couponStartsAt: z.coerce.date().nullable().optional(),
  couponEndsAt: z.coerce.date().nullable().optional(),
  couponMaxRedemptions: z.number().int().min(1).max(100000).nullable().optional(),
  accessNote: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(100000).default(0)
});

const updateAssessmentDefinitionSchema = assessmentDefinitionSchema.partial().omit({ id: true });

function serializeDefinition(definition: Awaited<ReturnType<typeof getAssessmentDefinition>>) {
  return definition;
}

function validateForPublish(config: unknown) {
  const errors = validateAssessmentConfig(config);
  if (errors.length) {
    return errors;
  }
  const typed = config as AssessmentConfigDefinition;
  const maxOption = Math.max(...typed.responseOptions.map((option) => option.value));
  const maxScore = maxOption * typed.questions.length;
  const coversZero = typed.scoring.some((band) => band.min <= 0 && band.max >= 0);
  const coversMax = typed.scoring.some((band) => band.min <= maxScore && band.max >= maxScore);
  const coverageErrors: string[] = [];
  if (!coversZero) coverageErrors.push('Scoring bands must cover score 0.');
  if (!coversMax) coverageErrors.push(`Scoring bands must cover maximum score ${maxScore}.`);
  return coverageErrors;
}

export function registerAdminAssessmentDefinitionRoutes(router: Router) {
  router.get(
    '/admin/assessment-definitions/access-report',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const q = queryText(req, 'q').trim();
      const status = queryText(req, 'status');
      const assessmentId = queryText(req, 'assessmentId').trim();
      const paymentWhere: Prisma.AssessmentPaymentWhereInput = {
        ...(status && status in PaymentStatus ? { status: status as PaymentStatus } : {}),
        ...(assessmentId ? { assessmentId } : {}),
        ...(q
          ? {
              OR: [
                { providerOrderId: { contains: q, mode: 'insensitive' } },
                { providerPaymentId: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { assessment: { title: { contains: q, mode: 'insensitive' } } }
              ]
            }
          : {})
      };
      const redemptionWhere: Prisma.AssessmentCouponRedemptionWhereInput = {
        ...(assessmentId ? { assessmentId } : {}),
        ...(q
          ? {
              OR: [
                { couponCode: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { assessment: { title: { contains: q, mode: 'insensitive' } } }
              ]
            }
          : {})
      };

      const [
        payments,
        paymentTotal,
        paidSummary,
        pendingSummary,
        redemptions,
        redemptionTotal,
        couponUsage,
        paidDefinitions
      ] = await Promise.all([
        prisma.assessmentPayment.findMany({
          where: paymentWhere,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
            assessment: { select: { id: true, title: true, accessMode: true, priceInPaise: true } }
          }
        }),
        prisma.assessmentPayment.count({ where: paymentWhere }),
        prisma.assessmentPayment.aggregate({
          where: { ...paymentWhere, status: 'PAID' },
          _sum: { amountInPaise: true },
          _count: { _all: true }
        }),
        prisma.assessmentPayment.aggregate({
          where: { ...paymentWhere, status: 'CREATED' },
          _sum: { amountInPaise: true },
          _count: { _all: true }
        }),
        prisma.assessmentCouponRedemption.findMany({
          where: redemptionWhere,
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
            assessment: {
              select: {
                id: true,
                title: true,
                couponCode: true,
                couponLabel: true,
                couponDiscountType: true,
                couponDiscountValue: true,
                couponMaxRedemptions: true
              }
            }
          }
        }),
        prisma.assessmentCouponRedemption.count({ where: redemptionWhere }),
        prisma.assessmentCouponRedemption.groupBy({
          by: ['assessmentId', 'couponCode'],
          _count: { _all: true },
          orderBy: { _count: { couponCode: 'desc' } },
          take: 50
        }),
        prisma.assessmentDefinition.findMany({
          where: {
            OR: [{ accessMode: 'PAID' }, { couponCode: { not: null } }]
          },
          select: {
            id: true,
            title: true,
            accessMode: true,
            priceInPaise: true,
            couponCode: true,
            couponLabel: true,
            couponDiscountType: true,
            couponDiscountValue: true,
            couponMaxRedemptions: true
          },
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
        })
      ]);

      const usageByAssessmentAndCode = new Map(
        couponUsage.map((item) => [`${item.assessmentId}:${item.couponCode}`, item._count._all])
      );

      res.json({
        payments,
        redemptions,
        couponUsage: paidDefinitions.map((definition) => ({
          assessmentId: definition.id,
          title: definition.title,
          accessMode: definition.accessMode,
          priceInPaise: definition.priceInPaise,
          couponCode: definition.couponCode,
          couponLabel: definition.couponLabel,
          couponDiscountType: definition.couponDiscountType,
          couponDiscountValue: definition.couponDiscountValue,
          couponMaxRedemptions: definition.couponMaxRedemptions,
          used: definition.couponCode
            ? (usageByAssessmentAndCode.get(`${definition.id}:${definition.couponCode}`) ?? 0)
            : 0
        })),
        summary: {
          paidAmountInPaise: paidSummary._sum.amountInPaise ?? 0,
          paidCount: paidSummary._count._all,
          pendingAmountInPaise: pendingSummary._sum.amountInPaise ?? 0,
          pendingCount: pendingSummary._count._all,
          redemptionCount: redemptionTotal
        },
        pagination: {
          page,
          pageSize,
          total: paymentTotal,
          totalPages: Math.max(1, Math.ceil(paymentTotal / pageSize))
        }
      });
    })
  );

  router.get(
    '/admin/assessment-definitions',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 500);
      const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
      const q = queryText(req, 'q').trim();
      const category = queryText(req, 'category').trim();
      const includeInactive = queryText(req, 'includeInactive') === 'true';
      const conditions: Prisma.Sql[] = [];
      if (!includeInactive) conditions.push(Prisma.sql`"isActive" = true`);
      if (q) {
        const search = `%${q}%`;
        conditions.push(
          Prisma.sql`("title" ILIKE ${search} OR "description" ILIKE ${search} OR "type" ILIKE ${search})`
        );
      }
      if (category) conditions.push(Prisma.sql`"category" = ${category}`);
      const where = conditions.length
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

      const [definitions, countRows] = await Promise.all([
        prisma.$queryRaw(Prisma.sql`
          SELECT
            "id", "type", "category", "title", "description", "version", "config",
            "accessMode", "priceInPaise", "couponCode", "couponLabel", "couponStartsAt",
            "couponDiscountType", "couponDiscountValue", "couponEndsAt", "couponMaxRedemptions",
            "accessNote", "isActive", "sortOrder"
          FROM "AssessmentDefinition"
          ${where}
          ORDER BY "sortOrder" ASC, "title" ASC
          LIMIT ${pageSize}
          OFFSET ${(page - 1) * pageSize}
        `),
        prisma.$queryRaw<{ count: bigint | number }[]>(Prisma.sql`
          SELECT COUNT(*) AS "count"
          FROM "AssessmentDefinition"
          ${where}
        `)
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      res.json({
        definitions,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.get(
    '/admin/assessment-definitions/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const definition = await getAssessmentDefinition(routeParam(req, 'id'), true);
      if (!definition) {
        res.status(404).json({ message: 'Assessment definition not found.' });
        return;
      }
      res.json({ definition: serializeDefinition(definition) });
    })
  );

  router.post(
    '/admin/assessment-definitions',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = assessmentDefinitionSchema.parse(req.body);
      const errors = body.isActive
        ? validateForPublish(body.config)
        : validateAssessmentConfig(body.config);
      if (errors.length) {
        res.status(400).json({ message: 'Assessment definition is not valid.', errors });
        return;
      }

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "AssessmentDefinition" (
          "id", "type", "category", "title", "description", "version", "config",
          "accessMode", "priceInPaise", "couponCode", "couponLabel", "couponStartsAt",
          "couponDiscountType", "couponDiscountValue", "couponEndsAt", "couponMaxRedemptions",
          "accessNote", "isActive", "sortOrder", "updatedAt"
        )
        VALUES (
          ${body.id}, ${body.type}, ${body.category}, ${body.title}, ${body.description}, ${body.version},
          ${body.config as Prisma.InputJsonValue}::jsonb, ${body.accessMode}, ${body.priceInPaise ?? null},
          ${body.couponCode?.toUpperCase() ?? null}, ${body.couponLabel ?? null}, ${body.couponStartsAt ?? null},
          ${body.couponDiscountType}, ${body.couponDiscountValue ?? null}, ${body.couponEndsAt ?? null},
          ${body.couponMaxRedemptions ?? null}, ${body.accessNote ?? null},
          ${body.isActive}, ${body.sortOrder}, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("id") DO UPDATE SET
          "type" = EXCLUDED."type",
          "category" = EXCLUDED."category",
          "title" = EXCLUDED."title",
          "description" = EXCLUDED."description",
          "version" = EXCLUDED."version",
          "config" = EXCLUDED."config",
          "accessMode" = EXCLUDED."accessMode",
          "priceInPaise" = EXCLUDED."priceInPaise",
          "couponCode" = EXCLUDED."couponCode",
          "couponLabel" = EXCLUDED."couponLabel",
          "couponDiscountType" = EXCLUDED."couponDiscountType",
          "couponDiscountValue" = EXCLUDED."couponDiscountValue",
          "couponStartsAt" = EXCLUDED."couponStartsAt",
          "couponEndsAt" = EXCLUDED."couponEndsAt",
          "couponMaxRedemptions" = EXCLUDED."couponMaxRedemptions",
          "accessNote" = EXCLUDED."accessNote",
          "isActive" = EXCLUDED."isActive",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = CURRENT_TIMESTAMP
      `);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'assessment_definition.upsert',
        targetType: 'assessment_definition',
        targetId: body.id,
        summary: 'Assessment definition saved.'
      });
      res.status(201).json({ definition: await getAssessmentDefinition(body.id, true) });
    })
  );

  router.patch(
    '/admin/assessment-definitions/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const current = await getAssessmentDefinition(id, true);
      if (!current) {
        res.status(404).json({ message: 'Assessment definition not found.' });
        return;
      }
      const body = updateAssessmentDefinitionSchema.parse(req.body);
      const next = {
        ...current,
        ...body,
        config: (body.config ?? current.config) as AssessmentConfigDefinition
      };
      const errors = next.isActive
        ? validateForPublish(next.config)
        : validateAssessmentConfig(next.config);
      if (errors.length) {
        res.status(400).json({ message: 'Assessment definition is not valid.', errors });
        return;
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AssessmentDefinition"
        SET
          "type" = ${next.type},
          "category" = ${next.category},
          "title" = ${next.title},
          "description" = ${next.description},
          "version" = ${next.version},
          "config" = ${next.config as Prisma.InputJsonValue}::jsonb,
          "accessMode" = ${next.accessMode},
          "priceInPaise" = ${next.priceInPaise ?? null},
          "couponCode" = ${next.couponCode?.toUpperCase() ?? null},
          "couponLabel" = ${next.couponLabel ?? null},
          "couponDiscountType" = ${next.couponDiscountType},
          "couponDiscountValue" = ${next.couponDiscountValue ?? null},
          "couponStartsAt" = ${next.couponStartsAt ?? null},
          "couponEndsAt" = ${next.couponEndsAt ?? null},
          "couponMaxRedemptions" = ${next.couponMaxRedemptions ?? null},
          "accessNote" = ${next.accessNote ?? null},
          "isActive" = ${next.isActive},
          "sortOrder" = ${next.sortOrder},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
      `);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'assessment_definition.update',
        targetType: 'assessment_definition',
        targetId: id,
        summary: 'Assessment definition updated.'
      });
      res.json({ definition: await getAssessmentDefinition(id, true) });
    })
  );

  router.post(
    '/admin/assessment-definitions/:id/publish',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const definition = await getAssessmentDefinition(id, true);
      if (!definition) {
        res.status(404).json({ message: 'Assessment definition not found.' });
        return;
      }
      const errors = validateForPublish(definition.config);
      if (errors.length) {
        res.status(400).json({ message: 'Assessment definition is not valid.', errors });
        return;
      }
      await prisma.$executeRaw`UPDATE "AssessmentDefinition" SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'assessment_definition.publish',
        targetType: 'assessment_definition',
        targetId: id,
        summary: 'Assessment definition published.'
      });
      res.json({ definition: await getAssessmentDefinition(id, true) });
    })
  );

  router.post(
    '/admin/assessment-definitions/:id/unpublish',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.$executeRaw`UPDATE "AssessmentDefinition" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'assessment_definition.unpublish',
        targetType: 'assessment_definition',
        targetId: id,
        summary: 'Assessment definition unpublished.'
      });
      res.json({ definition: await getAssessmentDefinition(id, true) });
    })
  );
}
