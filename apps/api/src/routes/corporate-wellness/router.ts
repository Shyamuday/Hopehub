import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';

const roles = [Role.CORPORATE_WELLNESS, Role.ADMIN] as const;

export function createCorporateWellnessRouter() {
  const router = Router();

  router.get(
    '/corporate-wellness/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.corporateWellnessProfile.findUnique({
        where: { userId: req.user!.id },
        include: { corporate: true }
      });
      res.json({ user: req.user, profile, corporate: profile?.corporate ?? null });
    })
  );

  router.get(
    '/corporate-wellness/accounts',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.corporateWellnessProfile.findUnique({
        where: { userId: req.user!.id }
      });
      const where =
        req.user!.role === Role.ADMIN
          ? { isActive: true }
          : { id: profile?.corporateId ?? '', isActive: true };
      const accounts = await prisma.corporateAccount.findMany({
        where,
        include: { _count: { select: { enrollments: true } } },
        orderBy: { name: 'asc' }
      });
      res.json({
        accounts: accounts.map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          contactEmail: account.contactEmail,
          enrollmentCount: account._count.enrollments
        }))
      });
    })
  );

  router.get(
    '/corporate-wellness/accounts/:id/enrollments',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const profile = await prisma.corporateWellnessProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (req.user!.role !== Role.ADMIN && profile?.corporateId !== id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const enrollments = await prisma.corporateEnrollment.findMany({
        where: { corporateId: id },
        include: {
          patient: {
            select: { id: true, name: true, email: true, mobile: true, patientCode: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ enrollments });
    })
  );

  return router;
}
