import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryPositiveInt } from '../../utils/helpers.js';
import { buildAdminAdherenceRiskReport } from '../../services/admin-adherence.js';

export function registerAdminAdherenceRoutes(router: Router) {
  router.get(
    '/admin/adherence/risk-cohorts',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 7, 7, 30);
      const minDoses = queryPositiveInt(req, 'minDoses', 5, 3, 30);
      const report = await buildAdminAdherenceRiskReport(days, minDoses);
      res.json(report);
    })
  );
}
