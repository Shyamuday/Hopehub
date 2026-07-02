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
import { router as authRouter } from './routes/auth.js';
import { router as catalogRouter } from './routes/catalog.js';
import { router as slotsRouter } from './routes/slots.js';
import { router as dosesRouter } from './routes/doses.js';
import { createAdminRouter } from './routes/admin.js';
import { createConsultationsRouter } from './routes/consultations.js';
import { createPrescriptionsRouter } from './routes/prescriptions.js';
import { createPaymentsRouter } from './routes/payments.js';
import { financeRouter } from './routes/finance.js';
import { patientsRouter } from './routes/patients.js';
import { scanRouter } from './routes/scan.js';
import { doctorWorklistRouter } from './routes/doctor-worklist.js';
import { analyticsRouter } from './routes/analytics.js';
import { devRouter } from './routes/dev.js';

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

// ── App & HTTP server ──────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || SERVER_CONFIG.DEFAULT_PORT);

const {
  WEB: webOrigin,
  ADMIN: adminOrigin,
  DOCTOR: doctorOrigin,
  STORE: storeOrigin,
  STORE_MANAGER: storeManagerOrigin,
  HR: hrOrigin
} = SERVER_CONFIG.ORIGINS;

// ── Socket.IO ──────────────────────────────────────────────────────────────────

const io = new SocketIoServer(httpServer, {
  cors: { origin: webOrigin, credentials: true }
});

io.use((socket, next) => {
  const token = socket.handshake.auth['token'] as string | undefined;
  if (!token) return next(new Error('Unauthorized'));

  const socketJwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const decoded = jwt.verify(token, socketJwtSecret) as AuthUser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).userId = decoded.id;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (socket as any).userId as string;
  void socket.join(`${SOCKET_ROOM_PREFIXES.USER}${userId}`);
  socket.on(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, (consultationId: unknown) => {
    if (typeof consultationId === 'string') {
      void socket.join(`${SOCKET_ROOM_PREFIXES.CONSULTATION}${consultationId}`);
    }
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(cors({
  origin: [webOrigin, adminOrigin, doctorOrigin, storeOrigin, storeManagerOrigin, hrOrigin],
  credentials: true
}));
app.use('/payments/razorpay-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use(devRouter);

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
app.use(catalogRouter);
app.use(slotsRouter);
app.use(dosesRouter);
app.use(createAdminRouter(io));
app.use(createConsultationsRouter(io));
app.use(createPrescriptionsRouter(io));
app.use(createPaymentsRouter(io));
app.use(financeRouter);
app.use(patientsRouter);
app.use(doctorWorklistRouter);
app.use(analyticsRouter);
app.use(scanRouter);
app.use('/store', storeRouter);
app.use('/hr', hrRouter);

// ── Global error handler ───────────────────────────────────────────────────────

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: error.issues });
  }
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Startup ────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`Clinic API running on http://localhost:${port}`);

  if (!doseOverdueSweepEnabled) {
    console.log('[scheduler] Overdue dose sweep disabled');
  } else {
    console.log(`[scheduler] Overdue dose sweep enabled (interval: ${doseOverdueSweepIntervalMs}ms)`);
  }
  if (!doseReminderSweepEnabled) {
    console.log('[scheduler] Dose reminder sweep disabled');
  } else {
    console.log(`[scheduler] Dose reminder sweep enabled (window: ${doseReminderWindowMinutes} minutes)`);
  }
  console.log(`[scheduler] Notification channels: ${enabledNotificationChannels.join(', ') || 'none'}`);

  void runDoseSchedulers().catch((e) => console.error('[scheduler] Initial dose scheduler run failed', e));

  const doseTimer = setInterval(() => {
    void runDoseSchedulers().catch((e) => console.error('[scheduler] Dose scheduler run failed', e));
  }, doseOverdueSweepIntervalMs);
  doseTimer.unref();

  void restoreEmployeesFromLeave().catch((e) => console.error('[scheduler] Leave restore failed', e));
  const leaveTimer = setInterval(() => {
    void restoreEmployeesFromLeave().catch((e) => console.error('[scheduler] Leave restore failed', e));
  }, SCHEDULER_CONFIG.LEAVE_RESTORE_MS);
  leaveTimer.unref();
});
