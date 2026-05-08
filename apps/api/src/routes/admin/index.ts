import type express from 'express';
import { registerAdminAuditRoutes } from './admin-audit.routes.js';
import { registerAdminConsumerRoutes } from './admin-consumers.routes.js';
import { registerAdminDiseaseRoutes } from './admin-diseases.routes.js';
import { registerAdminDoctorListRoutes } from './admin-doctors-list.routes.js';
import { registerAdminDoctorMutationRoutes } from './admin-doctors-mutations.routes.js';
import { registerAdminLocationRoutes } from './admin-locations.routes.js';
import { registerAdminPaymentRoutes } from './admin-payments.routes.js';
import { registerAdminReportsRoutes } from './admin-reports.routes.js';
import { registerAdminStaffRoutes } from './admin-staff.routes.js';

/** Admin API: one register function per feature area. */
export function registerAdminRoutes(app: express.Application) {
  registerAdminStaffRoutes(app);
  registerAdminDiseaseRoutes(app);
  registerAdminLocationRoutes(app);
  registerAdminDoctorListRoutes(app);
  registerAdminDoctorMutationRoutes(app);
  registerAdminConsumerRoutes(app);
  registerAdminAuditRoutes(app);
  registerAdminPaymentRoutes(app);
  registerAdminReportsRoutes(app);
}
