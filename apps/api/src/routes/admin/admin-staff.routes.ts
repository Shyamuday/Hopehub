import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { publicUserSelect } from '../../db/prisma-includes.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { routeParam } from '../../lib/http-params.js';
import { ALL_PERMISSION_CODES, PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

const allowedPermissionCodes = new Set<string>(ALL_PERMISSION_CODES);

export function registerAdminStaffRoutes(app: express.Application) {
  app.get(
    '/admin/staff',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.STAFF_READ),
    asyncRoute(async (_req, res) => {
      const staff = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: {
          ...publicUserSelect,
          isActive: true,
          createdAt: true,
          staffProfile: {
            select: { isSuperAdmin: true, permissionCodes: true, updatedAt: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ staff });
    })
  );

  app.put(
    '/admin/staff/:userId',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.STAFF_WRITE),
    asyncRoute(async (req, res) => {
      const userId = routeParam(req, 'userId');
      const body = z
        .object({
          isSuperAdmin: z.boolean().optional(),
          permissionCodes: z.array(z.string()).optional()
        })
        .strict()
        .parse(req.body);

      if (body.isSuperAdmin === undefined && body.permissionCodes === undefined) {
        return res.status(400).json({ message: 'Provide isSuperAdmin and/or permissionCodes.' });
      }

      if (body.permissionCodes) {
        const invalid = body.permissionCodes.filter((c) => !allowedPermissionCodes.has(c));
        if (invalid.length) {
          return res.status(400).json({ message: 'Invalid permission code(s).', invalid });
        }
      }

      const target = await prisma.user.findFirst({
        where: { id: userId, role: Role.ADMIN },
        select: { id: true }
      });
      if (!target) {
        return res.status(404).json({ message: 'Admin user not found.' });
      }

      const permissionCodes = body.permissionCodes ?? undefined;
      const updated = await prisma.staffProfile.upsert({
        where: { userId: target.id },
        create: {
          userId: target.id,
          isSuperAdmin: body.isSuperAdmin ?? false,
          permissionCodes: permissionCodes ?? []
        },
        update: {
          ...(body.isSuperAdmin !== undefined ? { isSuperAdmin: body.isSuperAdmin } : {}),
          ...(permissionCodes !== undefined ? { permissionCodes } : {})
        },
        select: { userId: true, isSuperAdmin: true, permissionCodes: true }
      });

      res.json({ staffProfile: updated });
    })
  );
}
