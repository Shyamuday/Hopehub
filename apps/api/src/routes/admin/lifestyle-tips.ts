import { Router } from 'express';
import {
  LifestyleTipDifficulty,
  LifestyleTipStatus,
  LifestyleTipType,
  Prisma,
  Role
} from '@prisma/client';
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

const stringList = z.array(z.string().trim().min(1).max(180)).max(60).default([]);
const optionalString = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
  });

const tipSchema = z.object({
  slug: z.string().trim().min(2).max(140),
  title: z.string().trim().min(2).max(180),
  shortDescription: z.string().trim().min(5).max(260),
  description: z.string().trim().min(10).max(5000),
  type: z.nativeEnum(LifestyleTipType),
  difficulty: z.nativeEnum(LifestyleTipDifficulty).default(LifestyleTipDifficulty.EASY),
  timeToImplement: z.string().trim().min(2).max(160),
  concernSlugs: stringList,
  categories: stringList,
  benefits: stringList,
  steps: z.array(z.record(z.string(), z.unknown())).min(1).max(40),
  tips: stringList,
  scientificBasis: optionalString,
  commonMistakes: stringList,
  progressTracking: stringList,
  relatedTipSlugs: stringList,
  contraindications: stringList,
  avoidIf: stringList,
  tags: stringList,
  mediaUrl: optionalString,
  audioUrl: optionalString,
  videoUrl: optionalString,
  youtubeUrl: optionalString,
  telegramUrl: optionalString,
  thumbnailUrl: optionalString,
  language: z.string().trim().min(2).max(12).default('en'),
  expertReviewed: z.boolean().default(false),
  expertReviewedBy: optionalString,
  expertReviewedAt: z.coerce.date().nullable().optional(),
  safetyLevel: z.string().trim().min(2).max(40).default('LOW'),
  status: z.nativeEnum(LifestyleTipStatus).default(LifestyleTipStatus.DRAFT),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ruleSchema = z.object({
  lifestyleTipId: z.string().trim().min(1),
  assessmentType: optionalString,
  concernSlug: optionalString,
  minScore: z.number().int().nullable().optional(),
  maxScore: z.number().int().nullable().optional(),
  level: optionalString,
  priority: z.number().int().min(1).max(10).default(3),
  routineSlot: optionalString,
  isActive: z.boolean().default(true),
  notes: optionalString
});

function jsonOrNull(value: Record<string, unknown> | null | undefined) {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonObject);
}

export function registerAdminLifestyleTipRoutes(router: Router) {
  router.get(
    '/admin/lifestyle-tips',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
      const q = queryText(req, 'q').trim();
      const status = queryText(req, 'status').trim();
      const where: Prisma.LifestyleTipWhereInput = {
        ...(status && status in LifestyleTipStatus ? { status: status as LifestyleTipStatus } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { shortDescription: { contains: q, mode: 'insensitive' } },
                { tags: { has: q } }
              ]
            }
          : {})
      };
      const [tips, total] = await Promise.all([
        prisma.lifestyleTip.findMany({
          where,
          include: { recommendationRules: { orderBy: { priority: 'asc' } } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.lifestyleTip.count({ where })
      ]);
      res.json({
        tips,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.post(
    '/admin/lifestyle-tips',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = tipSchema.parse(req.body);
      const tip = await prisma.lifestyleTip.create({
        data: {
          ...body,
          steps: body.steps as Prisma.InputJsonValue,
          metadata: jsonOrNull(body.metadata)
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'lifestyle_tip.create',
        targetType: 'lifestyle_tip',
        targetId: tip.id,
        summary: `Created lifestyle tip "${tip.title}".`
      });
      res.status(201).json({ tip });
    })
  );

  router.put(
    '/admin/lifestyle-tips/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = tipSchema.partial().parse(req.body);
      const tip = await prisma.lifestyleTip.update({
        where: { id },
        data: {
          ...body,
          steps: body.steps ? (body.steps as Prisma.InputJsonValue) : undefined,
          metadata: 'metadata' in body ? jsonOrNull(body.metadata) : undefined
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'lifestyle_tip.update',
        targetType: 'lifestyle_tip',
        targetId: id,
        summary: 'Updated lifestyle tip.'
      });
      res.json({ tip });
    })
  );

  router.delete(
    '/admin/lifestyle-tips/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.lifestyleTip.update({
        where: { id },
        data: { status: LifestyleTipStatus.ARCHIVED }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'lifestyle_tip.archive',
        targetType: 'lifestyle_tip',
        targetId: id,
        summary: 'Archived lifestyle tip.'
      });
      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/lifestyle-tip-rules',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const rule = await prisma.lifestyleTipRecommendationRule.create({
        data: ruleSchema.parse(req.body)
      });
      res.status(201).json({ rule });
    })
  );

  router.put(
    '/admin/lifestyle-tip-rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const rule = await prisma.lifestyleTipRecommendationRule.update({
        where: { id: routeParam(req, 'id') },
        data: ruleSchema.partial().parse(req.body)
      });
      res.json({ rule });
    })
  );

  router.delete(
    '/admin/lifestyle-tip-rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      await prisma.lifestyleTipRecommendationRule.delete({ where: { id: routeParam(req, 'id') } });
      res.json({ ok: true });
    })
  );
}
