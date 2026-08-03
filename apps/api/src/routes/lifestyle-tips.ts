import { Router, type Request } from 'express';
import { LifestyleTipStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptional, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../utils/helpers.js';

export const lifestyleTipsRouter = Router();

const sessionSchema = z.object({
  helpfulRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

function publicTipWhere(params: {
  q?: string;
  type?: string;
  concern?: string;
  category?: string;
}): Prisma.LifestyleTipWhereInput {
  return {
    status: LifestyleTipStatus.PUBLISHED,
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

function recommendationWhere(params: {
  assessmentType?: string;
  concern?: string;
  score?: number | null;
}): Prisma.LifestyleTipRecommendationRuleWhereInput {
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
    lifestyleTip: { status: LifestyleTipStatus.PUBLISHED }
  };
}

lifestyleTipsRouter.get(
  '/lifestyle-tips',
  authOptional,
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1, 1, 1000);
    const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
    const where = publicTipWhere({
      q: queryText(req, 'q').trim(),
      type: queryText(req, 'type').trim(),
      concern: queryText(req, 'concern').trim(),
      category: queryText(req, 'category').trim()
    });
    const [tips, total] = await Promise.all([
      prisma.lifestyleTip.findMany({
        where,
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

lifestyleTipsRouter.get(
  '/lifestyle-tips/page-data',
  authOptional,
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1, 1, 1000);
    const pageSize = queryPositiveInt(req, 'pageSize', 100, 1, 100);
    const where = publicTipWhere({
      q: queryText(req, 'q').trim(),
      type: queryText(req, 'type').trim(),
      concern: queryText(req, 'concern').trim(),
      category: queryText(req, 'category').trim()
    });
    const recommendationInput = recommendationParams(req);
    const shouldLoadRecommendations =
      Boolean(recommendationInput.assessmentType || recommendationInput.concern) &&
      (recommendationInput.score == null || Number.isFinite(recommendationInput.score));
    const [tips, total, recommendationRules] = await Promise.all([
      prisma.lifestyleTip.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.lifestyleTip.count({ where }),
      shouldLoadRecommendations
        ? prisma.lifestyleTipRecommendationRule.findMany({
            where: recommendationWhere(recommendationInput),
            include: { lifestyleTip: true },
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
            take: 12
          })
        : Promise.resolve([])
    ]);
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      tips,
      recommendations: recommendationRules.map((rule) => ({ ...rule, tip: rule.lifestyleTip })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    });
  })
);

lifestyleTipsRouter.get(
  '/lifestyle-tips/recommendations',
  authOptional,
  asyncRoute(async (req, res) => {
    const params = recommendationParams(req);
    const rules = await prisma.lifestyleTipRecommendationRule.findMany({
      where: recommendationWhere(params),
      include: { lifestyleTip: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 12
    });
    res.json({ recommendations: rules.map((rule) => ({ ...rule, tip: rule.lifestyleTip })) });
  })
);

lifestyleTipsRouter.get(
  '/lifestyle-tips/:slug',
  authOptional,
  asyncRoute(async (req, res) => {
    const tip = await prisma.lifestyleTip.findFirst({
      where: { slug: routeParam(req, 'slug'), status: LifestyleTipStatus.PUBLISHED }
    });
    if (!tip) return res.status(404).json({ message: 'Lifestyle tip not found.' });
    res.json({ tip });
  })
);

lifestyleTipsRouter.post(
  '/lifestyle-tips/:id/sessions',
  authRequired,
  asyncRoute(async (req, res) => {
    const lifestyleTipId = routeParam(req, 'id');
    const body = sessionSchema.parse(req.body);
    const tip = await prisma.lifestyleTip.findFirst({
      where: { id: lifestyleTipId, status: LifestyleTipStatus.PUBLISHED },
      select: { id: true }
    });
    if (!tip) return res.status(404).json({ message: 'Lifestyle tip not found.' });
    const session = await prisma.userLifestyleTipSession.create({
      data: {
        userId: req.user!.id,
        lifestyleTipId,
        helpfulRating: body.helpfulRating,
        notes: body.notes,
        source: body.source,
        metadata:
          body.metadata == null ? Prisma.JsonNull : (body.metadata as Prisma.InputJsonObject)
      }
    });
    res.status(201).json({ session });
  })
);
