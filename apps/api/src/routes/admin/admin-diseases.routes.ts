import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { routeParam } from '../../lib/http-params.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminDiseaseRoutes(app: express.Application) {
  app.get(
    '/admin/diseases/list',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DISEASES_READ),
    asyncRoute(async (_req, res) => {
      const diseases = await prisma.disease.findMany({ orderBy: { name: 'asc' } });
      res.json({ diseases });
    })
  );

  app.post(
    '/admin/diseases',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DISEASES_WRITE),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(3),
          description: z.string().min(3),
          feeInPaise: z.number().int().positive(),
          intakeQuestions: z.array(z.string().min(3)).min(1)
        })
        .parse(req.body);

      const disease = await prisma.disease.create({ data: body });
      res.status(201).json({ disease });
    })
  );

  app.put(
    '/admin/diseases/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DISEASES_WRITE),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(3),
          description: z.string().min(3),
          feeInPaise: z.number().int().positive(),
          isActive: z.boolean(),
          intakeQuestions: z.array(z.string().min(1)).min(1)
        })
        .parse(req.body);

      const disease = await prisma.disease.update({
        where: { id: routeParam(req, 'id') },
        data: body
      });
      res.json({ disease });
    })
  );
}
