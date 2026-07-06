import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, publicUserSelect, routeParam, writeAuditLog } from '../../utils/helpers.js';
import {
  ALL_PERMISSION_CODES,
  PERMISSIONS,
  PERMISSION_LABELS,
  STAFF_ASSIGNABLE_ROLES,
  allowStaffManagers,
  requirePermissions
} from '../../staff-permissions.js';

const allowedPermissionCodes = new Set<string>(ALL_PERMISSION_CODES);

export function registerAdminStaffRoutes(router: Router) {
  router.get(
    '/admin/staff/permissions-catalog',
    authRequired,
    allowStaffManagers,
    asyncRoute(async (_req, res) => {
      res.json({
        permissions: ALL_PERMISSION_CODES.map((code) => ({
          code,
          label: PERMISSION_LABELS[code as keyof typeof PERMISSION_LABELS] ?? code
        }))
      });
    })
  );

  router.get(
    '/admin/staff',
    authRequired,
    allowStaffManagers,
    asyncRoute(async (_req, res) => {
      const staff = await prisma.user.findMany({
        where: { role: { in: STAFF_ASSIGNABLE_ROLES } },
        select: {
          ...publicUserSelect,
          role: true,
          isActive: true,
          createdAt: true,
          staffProfile: {
            select: { isSuperAdmin: true, permissionCodes: true, updatedAt: true }
          }
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }]
      });
      res.json({ staff });
    })
  );

  router.put(
    '/admin/staff/:userId',
    authRequired,
    allowStaffManagers,
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
        where: { id: userId, role: { in: STAFF_ASSIGNABLE_ROLES } },
        select: { id: true, email: true, role: true }
      });
      if (!target) {
        return res.status(404).json({ message: 'Staff user not found.' });
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

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'staff.permissions.update',
        targetType: 'user',
        targetId: target.id,
        summary: `Updated permissions for ${target.email ?? target.id}`,
        metadata: { permissionCodes: updated.permissionCodes, isSuperAdmin: updated.isSuperAdmin }
      });

      res.json({ staffProfile: updated });
    })
  );
}
