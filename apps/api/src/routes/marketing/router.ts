import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt } from '../../utils/helpers.js';
import { buildProductFunnelReport } from '../../services/product-analytics.js';

const roles = [Role.MARKETING, Role.ADMIN] as const;

export function createMarketingRouter() {
  const router = Router();

  router.get(
    '/marketing/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.marketingProfile.findUnique({
        where: { userId: req.user!.id }
      });
      res.json({ user: req.user, profile });
    })
  );

  router.get(
    '/marketing/funnels',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 30, 7, 90);
      res.json(await buildProductFunnelReport(days));
    })
  );

  return router;
}
