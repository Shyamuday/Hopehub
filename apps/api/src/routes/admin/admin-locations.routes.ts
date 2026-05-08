import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { routeParam } from '../../lib/http-params.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

const locationBody = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/).optional().nullable(),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  timezone: z.string().min(3).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export function registerAdminLocationRoutes(app: express.Application) {
  app.get(
    '/admin/locations',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.LOCATIONS_READ),
    asyncRoute(async (_req, res) => {
      const locations = await prisma.clinicLocation.findMany({
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
      });
      res.json({ locations });
    })
  );

  app.post(
    '/admin/locations',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.LOCATIONS_WRITE),
    asyncRoute(async (req, res) => {
      const body = locationBody.parse(req.body);
      const loc = await prisma.clinicLocation.create({
        data: {
          name: body.name,
          slug: body.slug?.trim() || null,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2?.trim() || null,
          city: body.city?.trim() || null,
          state: body.state?.trim() || null,
          pincode: body.pincode?.trim() || null,
          phone: body.phone?.trim() || null,
          timezone: body.timezone || 'Asia/Kolkata',
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? 0
        }
      });
      res.status(201).json({ location: loc });
    })
  );

  app.put(
    '/admin/locations/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.LOCATIONS_WRITE),
    asyncRoute(async (req, res) => {
      const body = locationBody.parse(req.body);
      const loc = await prisma.clinicLocation.update({
        where: { id: routeParam(req, 'id') },
        data: {
          name: body.name,
          slug: body.slug?.trim() || null,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2?.trim() || null,
          city: body.city?.trim() || null,
          state: body.state?.trim() || null,
          pincode: body.pincode?.trim() || null,
          phone: body.phone?.trim() || null,
          timezone: body.timezone || 'Asia/Kolkata',
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? 0
        }
      });
      res.json({ location: loc });
    })
  );
}
