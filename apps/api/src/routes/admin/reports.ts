import { Router } from 'express';
import { Role, PaymentStatus, HomeopathicDoctorType, Prisma } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { getAuthorizedAdminWorkspace } from '../../admin-workspace-access.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';

function consultationWorkspaceWhere(workspace: string): Prisma.ConsultationWhereInput {
  const hopeHubSources: Prisma.ConsultationWhereInput[] = [
    { pricingSnapshot: { path: ['source'], equals: 'hope-hub' } },
    { pricingSnapshot: { path: ['source'], equals: 'hope-hub-quick-talk' } }
  ];
  if (workspace === 'hope-hub') return { OR: hopeHubSources };
  if (workspace === 'homeopathy') return { NOT: hopeHubSources };
  return {};
}

function doctorWorkspaceWhere(workspace: string): Prisma.UserWhereInput {
  if (workspace === 'hope-hub') {
    return { doctorProfile: { is: { doctorType: HomeopathicDoctorType.PSYCHOLOGIST } } };
  }
  if (workspace === 'homeopathy') {
    return {
      doctorProfile: { is: { doctorType: { not: HomeopathicDoctorType.PSYCHOLOGIST } } }
    };
  }
  return {};
}

export function registerAdminReportRoutes(router: Router) {
  // ─── Reports ──────────────────────────────────────────────────────────────────

  router.get(
    '/admin/reports',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const consultationWhere = consultationWorkspaceWhere(workspace);
      const [consultations, revenue, doctors] = await Promise.all([
        prisma.consultation.groupBy({ by: ['status'], where: consultationWhere, _count: true }),
        prisma.payment.aggregate({
          where: {
            status: PaymentStatus.PAID,
            ...(Object.keys(consultationWhere).length
              ? { consultation: { is: consultationWhere } }
              : {})
          },
          _sum: { amountInPaise: true }
        }),
        prisma.user.count({
          where: { role: Role.DOCTOR, isActive: true, ...doctorWorkspaceWhere(workspace) }
        })
      ]);
      res.json({
        revenueInPaise: revenue._sum.amountInPaise || 0,
        activeDoctors: doctors,
        consultations
      });
    })
  );
}
