import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  deleteDiseaseLocationFee,
  listDiseaseLocationFees,
  ONLINE_LOCATION_KEY,
  upsertDiseaseLocationFee
} from '../../services/consultation-pricing.js';

export function registerAdminPricingRoutes(router: Router) {
  router.get(
    '/admin/pricing/location-fees',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const diseaseId = typeof req.query['diseaseId'] === 'string' ? req.query['diseaseId'] : undefined;
      const fees = await listDiseaseLocationFees(diseaseId);
      res.json({ fees, onlineKey: ONLINE_LOCATION_KEY });
    })
  );

  router.put(
    '/admin/pricing/location-fees',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          diseaseId: z.string().min(1),
          locationKey: z.string().min(1),
          feeInPaise: z.number().int().positive()
        })
        .parse(req.body);

      if (body.locationKey !== ONLINE_LOCATION_KEY) {
        const store = await prisma.store.findUnique({ where: { id: body.locationKey } });
        if (!store) return res.status(400).json({ message: 'Invalid store for location fee.' });
      }

      const fee = await upsertDiseaseLocationFee(body);
      res.json({ fee });
    })
  );

  router.delete(
    '/admin/pricing/location-fees/:diseaseId/:locationKey',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const diseaseId = routeParam(req, 'diseaseId');
      const locationKey = routeParam(req, 'locationKey');
      await deleteDiseaseLocationFee(diseaseId, locationKey);
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/billing/plans',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const plans = await prisma.billingPlan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { priceInPaise: 'asc' }]
      });
      res.json({ plans });
    })
  );

  router.put(
    '/admin/billing/plans/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2).optional(),
          description: z.string().optional().nullable(),
          priceInPaise: z.number().int().positive().optional(),
          consultationsLimit: z.number().int().positive().nullable().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().int().optional()
        })
        .parse(req.body);

      const plan = await prisma.billingPlan.update({
        where: { id: routeParam(req, 'id') },
        data: body
      });
      res.json({ plan });
    })
  );
}
