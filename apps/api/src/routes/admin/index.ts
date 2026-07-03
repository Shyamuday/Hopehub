import { Router } from 'express';
import type { Server as SocketIoServer } from 'socket.io';
import { registerAdminAuditRoutes } from './audit.js';
import { registerAdminConsultationRoutes } from './consultations.js';
import { registerAdminConsumerRoutes } from './consumers.js';
import { registerAdminDoctorRoutes } from './doctors.js';
import { registerAdminPaymentRoutes } from './payments.js';
import { registerAdminReportRoutes } from './reports.js';
import { registerAdminPatientLookupRoutes } from '../store/patients.js';
import { registerAdminSupportRoutes } from './support.js';
import { registerAdminAdherenceRoutes } from './adherence.js';
import { registerAdminAnalyticsRoutes } from '../analytics.js';
import { registerAdminPurchaseOrderRoutes } from './purchase-orders.js';
import { registerAdminLabReferralRoutes } from './lab-referrals.js';

export function createAdminRouter(io: SocketIoServer) {
  const router = Router();

  registerAdminDoctorRoutes(router);
  registerAdminConsumerRoutes(router);
  registerAdminSupportRoutes(router);
  registerAdminAdherenceRoutes(router);
  registerAdminAnalyticsRoutes(router);
  registerAdminAuditRoutes(router);
  registerAdminConsultationRoutes(router, io);
  registerAdminPaymentRoutes(router);
  registerAdminReportRoutes(router);
  registerAdminPatientLookupRoutes(router);
  registerAdminPurchaseOrderRoutes(router);
  registerAdminLabReferralRoutes(router);

  return router;
}
