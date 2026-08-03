import { Router, type Request } from 'express';
import { PracticeStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptional, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../utils/helpers.js';

export const practicesRouter = Router();

const sessionSchema = z.object({
  durationMinutes: z.number().int().min(1).max(240).optional(),
  helpfulRating: z.number().int().min(1).max(5).optional(),
  moodBefore: z.string().trim().max(80).optional(),
  moodAfter: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

function recommendationWhere(params: {
  assessmentType?: string;
  concern?: string;
  score?: number | null;
}): Prisma.PracticeRecommendationRuleWhereInput {
  return {
    isActive: true,
    ...(params.assessmentType ? { assessmentType: params.assessmentType } : {}),
    ...(params.concern ? { concernSlug: params.concern } : {}),
    ...(params.score != null && Number.isFinite(params.score)
      ? {
          OR: [
            { minScore: null, maxScore: null },
            { minScore: { lte: params.score }, maxScore: { gte: params.score } }
          ]
        }
      : {}),
    practice: { status: PracticeStatus.PUBLISHED }
  };
}

function publicPracticeWhere(params: {
  q?: string;
  type?: string;
  concern?: string;
  category?: string;
}): Prisma.PracticeWhereInput {
  return {
    status: PracticeStatus.PUBLISHED,
    ...(params.type ? { type: params.type as any } : {}),
    ...(params.concern ? { concernSlugs: { has: params.concern } } : {}),
    ...(params.category ? { categories: { has: params.category } } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: 'insensitive' } },
            { shortDescription: { contains: params.q, mode: 'insensitive' } },
            { description: { contains: params.q, mode: 'insensitive' } },
            { tags: { has: params.q } }
          ]
        }
      : {})
  };
}

function recommendationParams(req: Request) {
  const assessmentType = queryText(req, 'assessmentType').trim();
  const concern = queryText(req, 'concern').trim();
  const scoreText = queryText(req, 'score').trim();
  const score = scoreText ? Number(scoreText) : null;
  return { assessmentType, concern, score };
}

practicesRouter.get(
  '/practices',
  authOptional,
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1, 1, 1000);
    const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
    const where = publicPracticeWhere({
      q: queryText(req, 'q').trim(),
      type: queryText(req, 'type').trim(),
      concern: queryText(req, 'concern').trim(),
      category: queryText(req, 'category').trim()
    });
    const [practices, total] = await Promise.all([
      prisma.practice.findMany({
        where,
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

practicesRouter.get(
  '/practices/page-data',
  authOptional,
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1, 1, 1000);
    const pageSize = queryPositiveInt(req, 'pageSize', 100, 1, 100);
    const where = publicPracticeWhere({
      q: queryText(req, 'q').trim(),
      type: queryText(req, 'type').trim(),
      concern: queryText(req, 'concern').trim(),
      category: queryText(req, 'category').trim()
    });
    const recommendationInput = recommendationParams(req);
    const shouldLoadRecommendations =
      Boolean(recommendationInput.assessmentType || recommendationInput.concern) &&
      (recommendationInput.score == null || Number.isFinite(recommendationInput.score));
    const [practices, total, recommendationRules] = await Promise.all([
      prisma.practice.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.practice.count({ where }),
      shouldLoadRecommendations
        ? prisma.practiceRecommendationRule.findMany({
            where: recommendationWhere(recommendationInput),
            include: { practice: true },
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
            take: 12
          })
        : Promise.resolve([])
    ]);
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      practices,
      recommendations: recommendationRules.map((rule) => ({ ...rule, practice: rule.practice })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    });
  })
);

practicesRouter.get(
  '/practices/recommendations',
  authOptional,
  asyncRoute(async (req, res) => {
    const params = recommendationParams(req);
    const rules = await prisma.practiceRecommendationRule.findMany({
      where: recommendationWhere(params),
      include: { practice: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 12
    });
    res.json({ recommendations: rules.map((rule) => ({ ...rule, practice: rule.practice })) });
  })
);

practicesRouter.get(
  '/practices/:slug',
  authOptional,
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug');
    const practice = await prisma.practice.findFirst({
      where: { slug, status: PracticeStatus.PUBLISHED }
    });
    if (!practice) return res.status(404).json({ message: 'Practice not found.' });
    res.json({ practice });
  })
);

practicesRouter.post(
  '/practices/:id/sessions',
  authRequired,
  asyncRoute(async (req, res) => {
    const practiceId = routeParam(req, 'id');
    const body = sessionSchema.parse(req.body);
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, status: PracticeStatus.PUBLISHED },
      select: { id: true }
    });
    if (!practice) return res.status(404).json({ message: 'Practice not found.' });
    const session = await prisma.userPracticeSession.create({
      data: {
        userId: req.user!.id,
        practiceId,
        durationMinutes: body.durationMinutes,
        helpfulRating: body.helpfulRating,
        moodBefore: body.moodBefore,
        moodAfter: body.moodAfter,
        notes: body.notes,
        source: body.source,
        metadata:
          body.metadata == null ? Prisma.JsonNull : (body.metadata as Prisma.InputJsonObject)
      }
    });
    res.status(201).json({ session });
  })
);
