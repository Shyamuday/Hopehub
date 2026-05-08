import type express from 'express';
import { Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { queryPositiveInt } from '../../lib/http-params.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminAuditRoutes(app: express.Application) {
  app.get(
    '/admin/audit-logs',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.AUDIT_READ),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const total = await prisma.auditLog.count();
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );
}
