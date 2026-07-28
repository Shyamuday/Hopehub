import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { requireDoctorCapability } from '../../doctor-capabilities.js';
import { registerRepertoryCatalogRoutes } from './catalog.js';
import { registerCaseAnalysisRoutes } from './case-analyses.js';
import { registerClinicalMediaRoutes } from './clinical-media.js';

export function createRepertoryRouter() {
  const router = Router();
  router.use(
    '/doctor/repertory',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'caseAnalysis',
      'Repertory and case analysis are not available for your doctor role.'
    )
  );
  registerRepertoryCatalogRoutes(router);
  registerCaseAnalysisRoutes(router);
  registerClinicalMediaRoutes(router);
  return router;
}
