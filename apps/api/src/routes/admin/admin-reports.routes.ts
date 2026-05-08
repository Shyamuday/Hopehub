import type express from 'express';
import { PaymentStatus, Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminReportsRoutes(app: express.Application) {
  app.get(
    '/admin/reports',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.REPORTS_VIEW),
    asyncRoute(async (_req, res) => {
      const [consultations, revenue, doctors] = await Promise.all([
        prisma.consultation.groupBy({ by: ['status'], _count: true }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.PAID },
          _sum: { amountInPaise: true }
        }),
        prisma.user.count({ where: { role: Role.DOCTOR, isActive: true } })
      ]);

      res.json({
        revenueInPaise: revenue._sum.amountInPaise || 0,
        activeDoctors: doctors,
        consultations
      });
    })
  );
}
