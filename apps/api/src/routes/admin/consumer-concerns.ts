import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const supportPaths = ['PROFESSIONAL_CARE', 'COACH_MENTOR', 'EMOTIONAL_LISTENER'] as const;
const concernSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][A-Za-z0-9]*$/),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(2).max(100),
  shortLabel: z.string().min(2).max(60),
  description: z.string().min(10).max(1000),
  searchTerms: z.array(z.string().min(1).max(80)).max(40).default([]),
  serviceSearchTerms: z.array(z.string().min(1).max(80)).max(40).default([]),
  assessmentId: z.string().min(1).max(100),
  assessmentLabel: z.string().min(2).max(120),
  supportPath: z.enum(supportPaths),
  isActive: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  showInResourceHub: z.boolean().default(true),
  showInSupportGuide: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});

export function registerAdminConsumerConcernRoutes(router: Router) {
  router.get(
    '/admin/consumer-concerns',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const [concerns, practices, lifestyleTips, articles] = await Promise.all([
        prisma.consumerConcern.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] }),
        prisma.practice.findMany({ select: { concernSlugs: true } }),
        prisma.lifestyleTip.findMany({ select: { concernSlugs: true } }),
        prisma.blogPost.findMany({ select: { concernSlugs: true } })
      ]);
      const countFor = (key: string, items: Array<{ concernSlugs: string[] }>) =>
        items.filter((item) => item.concernSlugs.includes(key)).length;
      res.json({
        concerns: concerns.map((concern) => ({
          ...concern,
          resourceCounts: {
            practices: countFor(concern.key, practices),
            lifestyleTips: countFor(concern.key, lifestyleTips),
            articles: countFor(concern.key, articles)
          }
        })),
        supportPaths
      });
    })
  );

  router.post(
    '/admin/consumer-concerns',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const data = concernSchema.parse(req.body);
      const concern = await prisma.consumerConcern.create({ data });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consumer_concern.create',
        targetType: 'consumer_concern',
        targetId: concern.id,
        summary: `Consumer concern "${concern.label}" created.`
      });
      res.status(201).json({ concern });
    })
  );

  router.patch(
    '/admin/consumer-concerns/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const data = concernSchema.partial().parse(req.body);
      const concern = await prisma.consumerConcern.update({ where: { id }, data });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consumer_concern.update',
        targetType: 'consumer_concern',
        targetId: concern.id,
        summary: `Consumer concern "${concern.label}" updated.`
      });
      res.json({ concern });
    })
  );
}
