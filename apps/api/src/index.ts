/**
 * index.ts — Application bootstrap only.
 *
 * To add new routes: create a file in src/routes/ and mount it here.
 * Do NOT add business logic or route handlers directly in this file.
 */
import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Server as SocketIoServer } from 'socket.io';
import { z } from 'zod';

import { type AuthUser } from './auth.js';
import { DEFAULT_JWT_SECRET } from './constants/auth.constants.js';
import { SERVER_CONFIG, SCHEDULER_CONFIG } from './constants/config.constants.js';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from './constants/socket.constants.js';

import { storeRouter } from './routes/store/index.js';
import { hrRouter } from './routes/hr/index.js';

// ── Route modules ──────────────────────────────────────────────────────────────
import { router as authRouter } from './routes/auth/index.js';
import { router as catalogRouter } from './routes/catalog.js';
import { router as slotsRouter } from './routes/slots.js';
import { router as dosesRouter } from './routes/doses.js';
import { createAdminRouter } from './routes/admin/index.js';
import { createConsultationsRouter } from './routes/consultations.js';
import { createPrescriptionsRouter } from './routes/prescriptions/index.js';
import { createPaymentsRouter } from './routes/payments.js';
import { financeRouter } from './routes/finance/index.js';
import { patientsRouter } from './routes/patients.js';
import { scanRouter } from './routes/scan.js';
import { doctorWorklistRouter } from './routes/doctor-worklist.js';
import { doctorDiseasesRouter } from './routes/doctor-diseases.js';
import { analyticsRouter } from './routes/analytics.js';
import { createReceptionRouter } from './routes/reception/router.js';
import { createClinicManagerRouter } from './routes/clinic-manager/router.js';
import { createAccountantRouter } from './routes/accountant/router.js';
import { createSupplierRouter } from './routes/supplier/router.js';
import { createWarehouseRouter } from './routes/warehouse/router.js';
import { createDeliveryRouter } from './routes/delivery/router.js';
import { createDiagnosticRouter } from './routes/diagnostic/router.js';
import { createBranchOwnerRouter } from './routes/branch-owner/router.js';
import { createCoordinatorRouter } from './routes/coordinator/router.js';
import { createCallCenterRouter } from './routes/call-center/router.js';
import { createMarketingRouter } from './routes/marketing/router.js';
import { blogRouter } from './routes/blog.js';
import { registerDoctorBlogRoutes } from './routes/doctor-blog.js';
import { createOnlineDoctorsRouter } from './routes/online-doctors.js';
import { registerOnlineDoctorSockets } from './sockets/online-doctor-sockets.js';
import { createCorporateWellnessRouter } from './routes/corporate-wellness/router.js';
import { createInsuranceRouter } from './routes/insurance/router.js';
import { labReferralsRouter } from './routes/lab-referrals.js';
import { notificationsRouter } from './routes/notifications.js';
import { vacanciesRouter } from './routes/vacancies.js';
import { chatRouter } from './routes/chat.js';
import { websiteLeadsRouter } from './routes/website-leads.js';
import { counsellorApplicationsRouter } from './routes/counsellor-applications.js';
import { publicPaymentsRouter } from './routes/public-payments.js';
import { hopeHubRouter } from './routes/hope-hub.js';
import { rtcRouter } from './routes/rtc.js';
import { createRepertoryRouter } from './routes/repertory/index.js';
import { roleGuidesRouter } from './routes/role-guides.js';
import { ReceptionScopeError } from './routes/reception/shared.js';
import { ClinicManagerScopeError } from './services/clinic-manager-hub.js';
import { PurchaseOrderError } from './services/purchase-orders.js';
import { StockTransferError } from './services/stock-transfers.js';
import { MedicineDeliveryError } from './services/medicine-deliveries.js';
import { LabReferralError } from './services/lab-referrals.js';

// ── Schedulers ─────────────────────────────────────────────────────────────────
import {
  runDoseSchedulers,
  restoreEmployeesFromLeave,
  doseOverdueSweepEnabled,
  doseOverdueSweepIntervalMs,
  doseReminderSweepEnabled,
  doseReminderWindowMinutes
} from './schedulers.js';
import { enabledNotificationChannels } from './services/notification-service.js';
import { setNotificationSocket } from './services/in-app-notifications.js';

// ── App & HTTP server ──────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const port = Number(process.env.PORT || SERVER_CONFIG.DEFAULT_PORT);

const {
  WEB: webOrigin,
  ADMIN: adminOrigin,
  DOCTOR: doctorOrigin,
  OPERATIONS: operationsOrigin
} = SERVER_CONFIG.ORIGINS;

// ── Socket.IO ──────────────────────────────────────────────────────────────────

const socketOrigins = SERVER_CONFIG.CORS_ORIGINS;

const io = new SocketIoServer(httpServer, {
  cors: { origin: socketOrigins, credentials: true }
});

setNotificationSocket(io);

io.use((socket, next) => {
  const token = socket.handshake.auth['token'] as string | undefined;
  if (!token) return next(new Error('Unauthorized'));

  const socketJwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const decoded = jwt.verify(token, socketJwtSecret) as {
      id?: string;
      userId?: string;
      staffId?: string;
    };
    const userId = decoded.id ?? decoded.userId;
    if (userId) {
      (socket as any).userId = userId;
      return next();
    }
    if (decoded.staffId) {
      (socket as any).storeStaffId = decoded.staffId;
      return next();
    }
    return next(new Error('Unauthorized'));
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string | undefined;

  const storeStaffId = (socket as any).storeStaffId as string | undefined;
  if (userId) {
    void socket.join(`${SOCKET_ROOM_PREFIXES.USER}${userId}`);
  }
  if (storeStaffId) {
    void socket.join(`${SOCKET_ROOM_PREFIXES.STORE_STAFF}${storeStaffId}`);
  }
  socket.on(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, (consultationId: unknown) => {
    if (typeof consultationId === 'string') {
      void socket.join(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultationId}`);
    }
  });

  registerOnlineDoctorSockets(io, socket, userId);
});

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: SERVER_CONFIG.CORS_ORIGINS,
    credentials: true
  })
);
app.use('/payments/razorpay-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '8mb' }));

// Rate limiting
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth/request-otp', otpLimiter);
app.use('/auth/patient-login', authLimiter);
app.use('/auth/patient-login/select', authLimiter);
app.use('/auth/patient-login/password-select', authLimiter);
app.use('/auth/staff-login', authLimiter);
app.use('/hr/auth/login', authLimiter);
app.use('/store/auth/manager-login', authLimiter);

// ── Route mounting ─────────────────────────────────────────────────────────────
//
// To add a new feature domain:
//   1. Create src/routes/my-feature.ts exporting a Router (or factory)
//   2. Import it here and call app.use(router)
//

app.use(authRouter);
app.use('/role-guides', roleGuidesRouter);
app.use(blogRouter);
app.use(createOnlineDoctorsRouter(io));
app.use(rtcRouter);
app.use(catalogRouter);
app.use(slotsRouter);
app.use(dosesRouter);
app.use(createAdminRouter(io));
app.use(createConsultationsRouter(io));
app.use(createPrescriptionsRouter(io));
app.use(createRepertoryRouter());
app.use(createPaymentsRouter(io));
app.use(financeRouter);
app.use(patientsRouter);
app.use(doctorWorklistRouter);
app.use(doctorDiseasesRouter);
registerDoctorBlogRoutes(app);
app.use(analyticsRouter);
app.use(scanRouter);
app.use('/store', storeRouter);
app.use('/hr', hrRouter);
app.use(createReceptionRouter(io));
app.use(createClinicManagerRouter(io));
app.use(createAccountantRouter());
app.use(createSupplierRouter());
app.use(createWarehouseRouter());
app.use(createDeliveryRouter());
app.use(createDiagnosticRouter());
app.use(createBranchOwnerRouter());
app.use(createCoordinatorRouter());
app.use(createCallCenterRouter());
app.use(createMarketingRouter());
app.use(createCorporateWellnessRouter());
app.use(createInsuranceRouter());
app.use(labReferralsRouter);
app.use(notificationsRouter);
app.use(vacanciesRouter);
app.use(chatRouter);
app.use(websiteLeadsRouter);
app.use(counsellorApplicationsRouter);
app.use(publicPaymentsRouter);
app.use(hopeHubRouter);

// ── Global error handler ───────────────────────────────────────────────────────

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ReceptionScopeError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof ClinicManagerScopeError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof PurchaseOrderError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof StockTransferError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof MedicineDeliveryError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof LabReferralError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', issues: error.issues });
    }
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
);

// ── Startup ────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`Clinic API running on http://localhost:${port}`);

  if (!doseOverdueSweepEnabled) {
    console.log('[scheduler] Overdue dose sweep disabled');
  } else {
    console.log(
      `[scheduler] Overdue dose sweep enabled (interval: ${doseOverdueSweepIntervalMs}ms)`
    );
  }
  if (!doseReminderSweepEnabled) {
    console.log('[scheduler] Dose reminder sweep disabled');
  } else {
    console.log(
      `[scheduler] Dose reminder sweep enabled (window: ${doseReminderWindowMinutes} minutes)`
    );
  }
  console.log(
    `[scheduler] Notification channels: ${enabledNotificationChannels.join(', ') || 'none'}`
  );

  void runDoseSchedulers().catch((e) =>
    console.error('[scheduler] Initial dose scheduler run failed', e)
  );

  const doseTimer = setInterval(() => {
    void runDoseSchedulers().catch((e) =>
      console.error('[scheduler] Dose scheduler run failed', e)
    );
  }, doseOverdueSweepIntervalMs);
  doseTimer.unref();

  void restoreEmployeesFromLeave().catch((e) =>
    console.error('[scheduler] Leave restore failed', e)
  );
  const leaveTimer = setInterval(() => {
    void restoreEmployeesFromLeave().catch((e) =>
      console.error('[scheduler] Leave restore failed', e)
    );
  }, SCHEDULER_CONFIG.LEAVE_RESTORE_MS);
  leaveTimer.unref();
});
