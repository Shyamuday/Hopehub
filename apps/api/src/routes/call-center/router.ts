import { Router } from 'express';
import { Role, Prisma } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText } from '../../utils/helpers.js';

const roles = [Role.CALL_CENTER, Role.ADMIN] as const;

export function createCallCenterRouter() {
  const router = Router();

  router.get(
    '/call-center/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.callCenterProfile.findUnique({
        where: { userId: req.user!.id }
      });
      res.json({ user: req.user, profile });
    })
  );

  router.get(
    '/call-center/patients/search',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      if (q.length < 2) {
        return res.json({ patients: [] });
      }
      const patients = await prisma.user.findMany({
        where: {
          role: Role.PATIENT,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
            { patientCode: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          patientCode: true,
          homeClinicStore: { select: { name: true, code: true } }
        },
        take: 25,
        orderBy: { name: 'asc' }
      });
      res.json({ patients });
    })
  );

  router.get(
    '/call-center/consultations/recent',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 50);
      const consultations = await prisma.consultation.findMany({
        include: {
          patient: { select: { id: true, name: true, mobile: true, patientCode: true } },
          disease: { select: { name: true } },
          assignedDoctor: { select: { name: true } },
          clinicStore: { select: { name: true, code: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize
      });
      res.json({ consultations });
    })
  );

  return router;
}
