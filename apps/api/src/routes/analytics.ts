import { Router } from 'express';
import { ProductEventCategory, Role } from '@prisma/client';
import { z } from 'zod';
import { authOptional, authRequired, allowRoles } from '../auth.js';
import { asyncRoute, queryPositiveInt } from '../utils/helpers.js';
import {
  buildHopeHubAnalyticsReport,
  buildProductFunnelReport,
  trackProductEvent
} from '../services/product-analytics.js';

const clientEventSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(['FUNNEL', 'ENGAGEMENT', 'SYSTEM']).optional(),
  sessionId: z.string().max(120).optional(),
  properties: z.record(z.string(), z.unknown()).optional()
});

export const analyticsRouter = Router();

analyticsRouter.post(
  '/analytics/events',
  authOptional,
  asyncRoute(async (req, res) => {
    const body = clientEventSchema.parse(req.body);
    await trackProductEvent({
      name: body.name,
      category:
        (body.category as ProductEventCategory | undefined) ?? ProductEventCategory.ENGAGEMENT,
      actorId: req.user?.id,
      actorRole: req.user?.role,
      sessionId: body.sessionId,
      properties: body.properties
    });
    res.status(201).json({ ok: true });
  })
);

export function registerAdminAnalyticsRoutes(router: Router) {
  router.get(
    '/admin/analytics/funnels',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 30, 7, 90);
      const report = await buildProductFunnelReport(days);
      res.json(report);
    })
  );

  router.get(
    '/admin/analytics/hope-hub',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 30, 1, 90);
      const report = await buildHopeHubAnalyticsReport(days);
      res.json(report);
    })
  );
}
