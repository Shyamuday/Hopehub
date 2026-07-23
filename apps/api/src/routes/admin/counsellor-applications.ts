import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const statusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ONBOARDED']),
  adminNote: z.string().trim().max(3000).optional().or(z.literal(''))
});

export function registerAdminCounsellorApplicationRoutes(router: Router) {
  router.get(
    '/admin/counsellor-applications',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const { status } = req.query as { status?: string };
      const applications = await prisma.counsellorApplication.findMany({
        where: status ? { status: status as any } : {},
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } }
        }
      });

      const counts = await prisma.counsellorApplication.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      const summary = { NEW: 0, REVIEWING: 0, SHORTLISTED: 0, REJECTED: 0, ONBOARDED: 0 };
      for (const row of counts) {
        summary[row.status as keyof typeof summary] = row._count.id;
      }

      res.json({ applications, summary });
    })
  );

  router.patch(
    '/admin/counsellor-applications/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = statusSchema.parse(req.body);
      const application = await prisma.counsellorApplication.update({
        where: { id },
        data: {
          status: body.status,
          adminNote: body.adminNote || null,
          reviewedById: req.user?.id || null,
          reviewedAt: new Date()
        }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'COUNSELLOR_APPLICATION_STATUS_UPDATED',
        targetType: 'CounsellorApplication',
        targetId: application.id,
        summary: `Updated counsellor application ${application.fullName} to ${application.status}`
      });

      res.json({ application });
    })
  );
}
