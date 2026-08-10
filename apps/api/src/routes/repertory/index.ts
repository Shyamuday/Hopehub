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
    '/clinical-media',
    authRequired,
    allowRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.HR),
    requireDoctorCapability(
      'scan',
      'Clinical media tools are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/repertory',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'caseAnalysis',
      'Repertory and case analysis are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/consultations/:consultationId/case-analyses',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'caseAnalysis',
      'Repertory and case analysis are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/case-analyses',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'caseAnalysis',
      'Repertory and case analysis are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/patients/:patientId/case-history',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'caseAnalysis',
      'Repertory and case analysis are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'scan',
      'Clinical media tools are available only for homeopathy providers.'
    )
  );
  router.use(
    '/doctor/patients/:patientId/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'scan',
      'Clinical media tools are available only for homeopathy providers.'
    )
  );
  registerRepertoryCatalogRoutes(router);
  registerCaseAnalysisRoutes(router);
  registerClinicalMediaRoutes(router);
  return router;
}
