import { Router } from 'express';
import type { Server as SocketIoServer } from 'socket.io';
import { registerAdminAuditRoutes } from './audit.js';
import { registerAdminConsultationRoutes } from './consultations.js';
import { registerAdminConsumerRoutes } from './consumers.js';
import { registerAdminDoctorRoutes } from './doctors.js';
import { registerAdminPaymentRoutes } from './payments.js';
import { registerAdminReportRoutes } from './reports.js';
import { registerAdminPatientLookupRoutes } from '../store/patients.js';

export function createAdminRouter(io: SocketIoServer) {
  const router = Router();

  registerAdminDoctorRoutes(router);
  registerAdminConsumerRoutes(router);
  registerAdminAuditRoutes(router);
  registerAdminConsultationRoutes(router, io);
  registerAdminPaymentRoutes(router);
  registerAdminReportRoutes(router);
  registerAdminPatientLookupRoutes(router);

  return router;
}
