import { Router } from 'express';
import { PracticeDifficulty, PracticeStatus, PracticeType, Prisma, Role } from '@prisma/client';
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
  .max(600)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
  });

const practiceSchema = z.object({
  slug: z.string().trim().min(2).max(140),
  title: z.string().trim().min(2).max(180),
  shortDescription: z.string().trim().min(5).max(260),
  description: z.string().trim().min(10).max(5000),
  type: z.nativeEnum(PracticeType),
  difficulty: z.nativeEnum(PracticeDifficulty).default(PracticeDifficulty.BEGINNER),
  durationMinutes: z.number().int().min(1).max(240).nullable().optional(),
  durationLabel: optionalString,
  concernSlugs: stringList,
  categories: stringList,
  benefits: stringList,
  steps: z.array(z.record(z.string(), z.unknown())).min(1).max(40),
  tips: stringList,
  whenToUse: stringList,
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
  sourceSystem: optionalString,
  expertReviewed: z.boolean().default(false),
  expertReviewedBy: optionalString,
  expertReviewedAt: z.coerce.date().nullable().optional(),
  safetyLevel: z.string().trim().min(2).max(40).default('LOW'),
  status: z.nativeEnum(PracticeStatus).default(PracticeStatus.DRAFT),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ruleSchema = z.object({
  practiceId: z.string().trim().min(1),
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

export function registerAdminPracticeRoutes(router: Router) {
  router.get(
    '/admin/practices',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
      const q = queryText(req, 'q').trim();
      const status = queryText(req, 'status').trim();
      const where: Prisma.PracticeWhereInput = {
        ...(status && status in PracticeStatus ? { status: status as PracticeStatus } : {}),
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
      const [practices, total] = await Promise.all([
        prisma.practice.findMany({
          where,
          include: { recommendationRules: { orderBy: { priority: 'asc' } } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.practice.count({ where })
      ]);
      res.json({
        practices,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.post(
    '/admin/practices',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = practiceSchema.parse(req.body);
      const practice = await prisma.practice.create({
        data: {
          ...body,
          steps: body.steps as Prisma.InputJsonValue,
          metadata: jsonOrNull(body.metadata)
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'practice.create',
        targetType: 'practice',
        targetId: practice.id,
        summary: `Created practice "${practice.title}".`
      });
      res.status(201).json({ practice });
    })
  );

  router.put(
    '/admin/practices/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = practiceSchema.partial().parse(req.body);
      const practice = await prisma.practice.update({
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
        action: 'practice.update',
        targetType: 'practice',
        targetId: id,
        summary: 'Updated practice.'
      });
      res.json({ practice });
    })
  );

  router.delete(
    '/admin/practices/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.practice.update({ where: { id }, data: { status: PracticeStatus.ARCHIVED } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'practice.archive',
        targetType: 'practice',
        targetId: id,
        summary: 'Archived practice.'
      });
      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/practice-rules',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = ruleSchema.parse(req.body);
      const rule = await prisma.practiceRecommendationRule.create({ data: body });
      res.status(201).json({ rule });
    })
  );

  router.put(
    '/admin/practice-rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = ruleSchema.partial().parse(req.body);
      const rule = await prisma.practiceRecommendationRule.update({ where: { id }, data: body });
      res.json({ rule });
    })
  );

  router.delete(
    '/admin/practice-rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.practiceRecommendationRule.delete({ where: { id } });
      res.json({ ok: true });
    })
  );
}
