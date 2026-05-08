import type express from 'express';
import { registerAdminRoutes } from './admin/index.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerCatalogRoutes } from './catalog.routes.js';
import { registerConsultationRoutes } from './consultations.routes.js';
import { registerDoctorAccountRoutes } from './doctor-account.routes.js';
import { registerDoctorAdherenceRoutes } from './doctor-adherence.routes.js';
import { registerDoctorPrescriptionRoutes } from './doctor-prescriptions.routes.js';
import { registerHealthRoutes } from './health.js';
import { registerPatientCareRoutes } from './patient-care.routes.js';
import { registerPatientProfileRoutes } from './patient-profile.routes.js';
import { registerPatientSelfDiagnosisRoutes } from './patient-self-diagnosis.routes.js';
import { registerPaymentRoutes } from './payments.routes.js';

export function registerAllRoutes(app: express.Application) {
  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerDoctorAccountRoutes(app);
  registerPatientProfileRoutes(app);
  registerCatalogRoutes(app);
  registerAdminRoutes(app);
  registerConsultationRoutes(app);
  registerDoctorPrescriptionRoutes(app);
  registerPatientCareRoutes(app);
  registerPatientSelfDiagnosisRoutes(app);
  registerDoctorAdherenceRoutes(app);
  registerPaymentRoutes(app);
}
