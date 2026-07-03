import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText } from '../../utils/helpers.js';
import { buildAdminAdherenceRiskReport } from '../../services/admin-adherence.js';

const roles = [Role.PATIENT_COORDINATOR, Role.ADMIN] as const;

export function createCoordinatorRouter() {
  const router = Router();

  router.get(
    '/coordinator/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.patientCoordinatorProfile.findUnique({
        where: { userId: req.user!.id },
        include: { store: { select: { id: true, name: true, code: true } } }
      });
      res.json({ user: req.user, profile, store: profile?.store ?? null });
    })
  );

  router.get(
    '/coordinator/follow-ups',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 7, 7, 30);
      const minDoses = queryPositiveInt(req, 'minDoses', 5, 3, 30);
      const report = await buildAdminAdherenceRiskReport(days, minDoses);
      const profile = await prisma.patientCoordinatorProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (!profile || req.user!.role === Role.ADMIN) {
        return res.json(report);
      }
      const storeId = profile.storeId;
      const storePatientIds = new Set(
        (
          await prisma.user.findMany({
            where: { role: Role.PATIENT, homeClinicStoreId: storeId },
            select: { id: true }
          })
        ).map((row) => row.id)
      );
      const filterCohort = <T extends { patientId: string }>(cohort: T[]) =>
        cohort.filter((row) => storePatientIds.has(row.patientId));
      res.json({
        ...report,
        cohorts: {
          HIGH_RISK: filterCohort(report.cohorts.HIGH_RISK),
          MEDIUM_RISK: filterCohort(report.cohorts.MEDIUM_RISK),
          ON_TRACK: filterCohort(report.cohorts.ON_TRACK)
        },
        alerts: report.alerts.filter((alert) => storePatientIds.has(alert.patientId)),
        scopedToStoreId: storeId
      });
    })
  );

  return router;
}
