import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import {
  BillingPlanType,
  ConsultationStatus,
  DoseEventStatus,
  PaymentStatus,
  PrescriptionOptionType,
  PrescriptionStatus,
  Prisma,
  Role
} from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired, signToken } from './auth.js';
import {
  attachmentUploadMiddleware,
  buildAttachmentStoragePath,
  buildDoctorCredentialStoragePath,
  coerceAttachmentKind,
  hydrateConsultationAttachments,
  hydrateConsultationsAttachments,
  persistConsultationAttachment,
  resolveAttachmentFileUrl,
  serializeAttachmentRecord
} from './consultation-attachments.js';
import { prisma } from './db.js';
import { supabaseAdmin } from './supabase.js';
import { createNotificationService, type NotificationChannel } from './notifications.js';

const app = express();
const port = Number(process.env.PORT || 4000);
function apiPublicBaseUrl() {
  return (process.env.API_PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '');
}
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:4200';
const devOtp = process.env.DEV_OTP || '123456';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const doseOverdueSweepEnabled = (process.env.DOSE_OVERDUE_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';
const doseOverdueSweepIntervalMs = Math.max(60_000, Number(process.env.DOSE_OVERDUE_SWEEP_INTERVAL_MS || 5 * 60_000));
const doseReminderSweepEnabled = (process.env.DOSE_REMINDER_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';
const doseReminderWindowMinutes = Math.max(5, Number(process.env.DOSE_REMINDER_WINDOW_MINUTES || 30));
const enabledNotificationChannels = (process.env.NOTIFICATION_CHANNELS || 'IN_APP')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean) as NotificationChannel[];
const notificationService = createNotificationService(enabledNotificationChannels);
const defaultBillingPlans: Array<{
  code: string;
  name: string;
  description: string;
  planType: BillingPlanType;
  priceInPaise: number;
  consultationsLimit: number | null;
  sortOrder: number;
}> = [
  {
    code: 'ONE_TIME',
    name: 'One-Time Appointment',
    description: 'Single consultation with diagnosis, chat, and prescription follow-up.',
    planType: BillingPlanType.ONE_TIME_APPOINTMENT,
    priceInPaise: 150000,
    consultationsLimit: 1,
    sortOrder: 1
  },
  {
    code: 'STARTER_MONTHLY',
    name: 'Starter Monthly Plan',
    description: 'Monthly care plan with up to 3 consultations and follow-up support.',
    planType: BillingPlanType.STARTER_MONTHLY,
    priceInPaise: 350000,
    consultationsLimit: 3,
    sortOrder: 2
  },
  {
    code: 'CONTINUITY_QUARTERLY',
    name: 'Continuity Quarterly Plan',
    description: 'Quarterly continuity plan with up to 10 consultations and medicine adherence tracking.',
    planType: BillingPlanType.CONTINUITY_QUARTERLY,
    priceInPaise: 900000,
    consultationsLimit: 10,
    sortOrder: 3
  }
];
type ReminderPreference = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};
const defaultReminderPreference: ReminderPreference = {
  inApp: true,
  sms: true,
  whatsapp: false,
  push: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
};

async function ensureBillingPlans() {
  await Promise.all(
    defaultBillingPlans.map((plan) =>
      prisma.billingPlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          planType: plan.planType,
          priceInPaise: plan.priceInPaise,
          consultationsLimit: plan.consultationsLimit,
          isActive: true,
          sortOrder: plan.sortOrder
        },
        create: plan
      })
    )
  );
}

app.use(cors({ origin: webOrigin, credentials: true }));
app.use('/payments/razorpay-webhook', express.raw({ type: 'application/json' }));

const uploadsAttachmentRoot = path.join(process.cwd(), 'uploads', 'consultation-attachments');
void fs.mkdir(uploadsAttachmentRoot, { recursive: true }).catch(() => {});
app.use('/uploads/consultation-attachments', express.static(uploadsAttachmentRoot));

app.use(express.json());

const asyncRoute =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true
} as const;

const doctorProfileApiDbSelect = {
  specialty: true,
  registrationNo: true,
  isAvailable: true,
  bio: true,
  qualifications: true,
  homoeopathyMethods: true,
  clinicalFocus: true,
  languagesSpoken: true,
  yearsExperience: true,
  stateCouncilName: true,
  stateCouncilRegNo: true,
  degreeCertificatePath: true,
  councilRegCertificatePath: true,
  otherCredentialPath: true
} as const;

type DoctorProfileDb = Prisma.DoctorGetPayload<{ select: typeof doctorProfileApiDbSelect }>;

async function serializeDoctorProfileForApi(dp: DoctorProfileDb | null) {
  if (!dp) {
    return null;
  }
  const base = apiPublicBaseUrl();
  const {
    degreeCertificatePath,
    councilRegCertificatePath,
    otherCredentialPath,
    ...rest
  } = dp;
  const [degreeCertificateUrl, councilRegCertificateUrl, otherCredentialUrl] = await Promise.all([
    degreeCertificatePath ? resolveAttachmentFileUrl(degreeCertificatePath, base) : Promise.resolve(null),
    councilRegCertificatePath ? resolveAttachmentFileUrl(councilRegCertificatePath, base) : Promise.resolve(null),
    otherCredentialPath ? resolveAttachmentFileUrl(otherCredentialPath, base) : Promise.resolve(null)
  ]);
  return {
    ...rest,
    degreeCertificateUrl: degreeCertificateUrl || null,
    councilRegCertificateUrl: councilRegCertificateUrl || null,
    otherCredentialUrl: otherCredentialUrl || null
  };
}

const doctorProfileUpdateBody = z.object({
  name: z.string().min(2),
  mobile: z.string().min(8).optional().or(z.literal('')),
  specialty: z.string().min(2),
  registrationNo: z.string().max(120).optional().or(z.literal('')),
  isAvailable: z.boolean().optional().default(true),
  bio: z.string().max(8000).optional().or(z.literal('')),
  qualifications: z.string().max(4000).optional().or(z.literal('')),
  homoeopathyMethods: z.string().max(4000).optional().or(z.literal('')),
  clinicalFocus: z.string().max(4000).optional().or(z.literal('')),
  languagesSpoken: z.string().max(500).optional().or(z.literal('')),
  yearsExperience: z.number().int().min(0).max(80).optional().nullable(),
  stateCouncilName: z.string().max(200).optional().or(z.literal('')),
  stateCouncilRegNo: z.string().max(120).optional().or(z.literal(''))
});

function emptyDoctorText(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  const t = value.trim();
  return t.length ? t : null;
}

function toAuthResponse(user: {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  mobile?: string | null;
}) {
  return {
    token: signToken(user),
    user
  };
}

function includeConsultationRelations() {
  return {
    patient: { select: publicUserSelect },
    assignedDoctor: { select: publicUserSelect },
    disease: true,
    payment: true,
    prescriptions: {
      include: {
        items: { orderBy: { sortOrder: 'asc' as const } },
        methodOption: true,
        diagnosedDiseaseOption: true
      },
      orderBy: { version: 'desc' as const }
    },
    messages: {
      include: { sender: { select: publicUserSelect } },
      orderBy: { createdAt: 'asc' as const }
    },
    attachments: {
      include: { uploadedBy: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' as const }
    }
  };
}

function includePrescriptionRelations() {
  return {
    consultation: {
      select: {
        id: true,
        patientId: true,
        assignedDoctorId: true,
        disease: { select: { id: true, name: true } }
      }
    },
    uploadedBy: { select: publicUserSelect },
    patient: { select: publicUserSelect },
    methodOption: true,
    diagnosedDiseaseOption: true,
    items: { orderBy: { sortOrder: 'asc' as const } }
  };
}

function normalizeOptionLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function fallbackIntakeTimesFromFrequency(frequency?: string | null) {
  const value = (frequency || '').toLowerCase();
  if (value.includes('three') || value.includes('thrice') || value.includes('3')) {
    return ['08:00', '14:00', '20:00'];
  }

  if (value.includes('twice') || value.includes('2')) {
    return ['09:00', '21:00'];
  }

  return ['09:00'];
}

function buildDoseScheduleEvents(input: {
  patientId: string;
  prescriptionId: string;
  prescriptionItems: Array<{ id: string; frequency?: string | null; durationDays?: number | null; intakeTimes?: unknown }>;
}) {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const events: Array<{
    patientId: string;
    prescriptionId: string;
    prescriptionItemId: string;
    scheduledFor: Date;
  }> = [];

  for (const item of input.prescriptionItems) {
    const rawTimes = Array.isArray(item.intakeTimes) ? item.intakeTimes.filter((time) => typeof time === 'string') : [];
    const times = rawTimes.length ? (rawTimes as string[]) : fallbackIntakeTimesFromFrequency(item.frequency);
    const durationDays = Math.min(Math.max(item.durationDays || 1, 1), 120);

    for (let dayOffset = 0; dayOffset < durationDays; dayOffset += 1) {
      for (const time of times) {
        const [hourText, minuteText] = time.split(':');
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
          continue;
        }

        const scheduledFor = new Date(dayStart);
        scheduledFor.setDate(dayStart.getDate() + dayOffset);
        scheduledFor.setHours(hour, minute, 0, 0);

        events.push({
          patientId: input.patientId,
          prescriptionId: input.prescriptionId,
          prescriptionItemId: item.id,
          scheduledFor
        });
      }
    }
  }

  return events;
}

function routeParam(req: express.Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function queryText(req: express.Request, key: string) {
  const value = req.query[key];
  if (Array.isArray(value)) {
    return String(value[0] || '');
  }

  return typeof value === 'string' ? value : '';
}

function queryPositiveInt(req: express.Request, key: string, fallback: number, min = 1, max = 100) {
  const parsed = Number(queryText(req, key));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function logAuthEvent(event: 'staff_login_success' | 'staff_login_failure' | 'supabase_exchange', details: Record<string, unknown>) {
  console.info(`[auth] ${event}`, {
    at: new Date().toISOString(),
    ...details
  });
}

async function writeAuditLog(input: {
  actorId?: string;
  actorRole?: Role;
  action: string;
  targetType: string;
  targetId: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      actorRole: input.actorRole || null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getRazorpayClient() {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}

function verifyRazorpaySignature(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const digest = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(payload.razorpaySignature));
}

async function markOverdueDosesAsMissed() {
  const now = new Date();
  const overdueEvents = await prisma.medicineDoseEvent.findMany({
    where: {
      status: DoseEventStatus.PENDING,
      scheduledFor: { lt: now }
    },
    select: {
      id: true,
      patientId: true,
      scheduledFor: true,
      patient: { select: { name: true, mobile: true, email: true } },
      prescriptionItem: { select: { medicineName: true } }
    },
    take: 1000
  });

  if (!overdueEvents.length) {
    return;
  }

  const result = await prisma.medicineDoseEvent.updateMany({
    where: { id: { in: overdueEvents.map((event) => event.id) } },
    data: { status: DoseEventStatus.MISSED }
  });

  console.info(`[scheduler] Marked ${result.count} overdue dose event(s) as MISSED`);
  await notificationService.sendBatch(
    overdueEvents.flatMap((event) =>
      enabledNotificationChannels.map((channel) => ({
        eventType: 'DOSE_MISSED' as const,
        channel,
        recipientId: event.patientId,
        recipientName: event.patient?.name,
        recipientMobile: event.patient?.mobile,
        recipientEmail: event.patient?.email,
        title: 'Dose marked missed',
        body: `${event.prescriptionItem?.medicineName || 'Medicine'} dose at ${event.scheduledFor.toISOString()} was marked missed.`,
        metadata: { doseEventId: event.id, scheduledFor: event.scheduledFor.toISOString() }
      }))
    )
  );
}

async function emitUpcomingDoseReminders() {
  if (!doseReminderSweepEnabled) {
    return;
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + doseReminderWindowMinutes * 60 * 1000);
  const upcomingEvents = await prisma.medicineDoseEvent.findMany({
    where: {
      status: DoseEventStatus.PENDING,
      scheduledFor: { gte: now, lte: windowEnd }
    },
    select: {
      id: true,
      patientId: true,
      scheduledFor: true,
      patient: { select: { name: true, mobile: true, email: true } },
      prescriptionItem: { select: { medicineName: true } }
    },
    take: 1000
  });

  if (!upcomingEvents.length) {
    return;
  }

  await notificationService.sendBatch(
    upcomingEvents.flatMap((event) =>
      enabledNotificationChannels.map((channel) => ({
        eventType: 'DOSE_REMINDER' as const,
        channel,
        recipientId: event.patientId,
        recipientName: event.patient?.name,
        recipientMobile: event.patient?.mobile,
        recipientEmail: event.patient?.email,
        title: 'Medicine reminder',
        body: `Upcoming dose for ${event.prescriptionItem?.medicineName || 'medicine'} at ${event.scheduledFor.toISOString()}.`,
        metadata: { doseEventId: event.id, scheduledFor: event.scheduledFor.toISOString() }
      }))
    )
  );
}

async function runDoseSchedulers() {
  await Promise.all([markOverdueDosesAsMissed(), emitUpcomingDoseReminders()]);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'clinic-api' });
});

app.post(
  '/auth/request-otp',
  asyncRoute(async (req, res) => {
    const body = z.object({ mobile: z.string().min(8) }).parse(req.body);

    res.json({
      mobile: body.mobile,
      message: 'OTP generated for development.',
      devOtp
    });
  })
);

app.post(
  '/auth/patient-login',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2).default('Patient'),
        mobile: z.string().min(8),
        otp: z.string().min(4)
      })
      .parse(req.body);

    if (body.otp !== devOtp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    const user = await prisma.user.upsert({
      where: { mobile: body.mobile },
      update: { name: body.name },
      create: {
        name: body.name,
        mobile: body.mobile,
        role: Role.PATIENT
      },
      select: publicUserSelect
    });

    res.json(toAuthResponse(user));
  })
);

app.post(
  '/doctor/enroll',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        mobile: z.string().min(8).optional(),
        password: z.string().min(8),
        specialty: z.string().min(2),
        registrationNo: z.string().optional()
      })
      .parse(req.body);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const doctor = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        mobile: body.mobile,
        passwordHash,
        role: Role.DOCTOR,
        isActive: false,
        doctorProfile: {
          create: {
            specialty: body.specialty,
            registrationNo: body.registrationNo
          }
        }
      },
      select: publicUserSelect
    });

    res.status(201).json({
      doctor,
      approvalStatus: 'PENDING',
      message: 'Enrollment submitted. Please wait for admin approval before login.'
    });
  })
);

app.get(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const row = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: {
          select: doctorProfileApiDbSelect
        }
      }
    });

    if (!row) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const { doctorProfile, ...profile } = row;
    res.json({
      profile: {
        ...profile,
        doctorProfile: await serializeDoctorProfileForApi(doctorProfile)
      }
    });
  })
);

app.put(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = doctorProfileUpdateBody.parse(req.body);

    const docCore = {
      specialty: body.specialty,
      registrationNo: emptyDoctorText(body.registrationNo ?? undefined) ?? null,
      isAvailable: body.isAvailable,
      bio: emptyDoctorText(body.bio) ?? null,
      qualifications: emptyDoctorText(body.qualifications) ?? null,
      homoeopathyMethods: emptyDoctorText(body.homoeopathyMethods) ?? null,
      clinicalFocus: emptyDoctorText(body.clinicalFocus) ?? null,
      languagesSpoken: emptyDoctorText(body.languagesSpoken) ?? null,
      stateCouncilName: emptyDoctorText(body.stateCouncilName) ?? null,
      stateCouncilRegNo: emptyDoctorText(body.stateCouncilRegNo) ?? null,
      yearsExperience: body.yearsExperience ?? null
    };

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: body.name,
        mobile: body.mobile || null,
        doctorProfile: {
          upsert: {
            create: docCore,
            update: docCore
          }
        }
      },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: {
          select: doctorProfileApiDbSelect
        }
      }
    });

    const { doctorProfile, ...profile } = updated;
    res.json({
      profile: {
        ...profile,
        doctorProfile: await serializeDoctorProfileForApi(doctorProfile)
      }
    });
  })
);

const doctorCredentialKindSchema = z.enum(['DEGREE', 'COUNCIL_REG', 'OTHER']);

app.post(
  '/doctor/profile/credential',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  attachmentUploadMiddleware,
  asyncRoute(async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ message: 'File is required (JPG, PNG, WebP, or PDF).' });
    }

    let kind: z.infer<typeof doctorCredentialKindSchema>;
    try {
      kind = doctorCredentialKindSchema.parse(
        typeof req.body?.kind === 'string' ? req.body.kind : undefined
      );
    } catch {
      return res.status(400).json({ message: 'kind must be DEGREE, COUNCIL_REG, or OTHER.' });
    }

    const pathField =
      kind === 'DEGREE'
        ? 'degreeCertificatePath'
        : kind === 'COUNCIL_REG'
          ? 'councilRegCertificatePath'
          : 'otherCredentialPath';

    const storagePath = buildDoctorCredentialStoragePath(req.user!.id, kind, file.originalname || 'upload');
    await persistConsultationAttachment(storagePath, file.buffer, file.mimetype);

    const existing = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
      select: { specialty: true }
    });
    const specialty =
      existing?.specialty?.trim() && existing.specialty.trim().length > 0
        ? existing.specialty.trim()
        : 'Registered homoeopathic practitioner';

    await prisma.doctor.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        specialty,
        [pathField]: storagePath
      },
      update: {
        [pathField]: storagePath
      }
    });

    const signed = await resolveAttachmentFileUrl(storagePath, apiPublicBaseUrl());
    const urlPayload =
      kind === 'DEGREE'
        ? { degreeCertificateUrl: signed || null }
        : kind === 'COUNCIL_REG'
          ? { councilRegCertificateUrl: signed || null }
          : { otherCredentialUrl: signed || null };

    res.json({ kind, ...urlPayload });
  })
);

app.post(
  '/auth/staff-login',
  asyncRoute(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { ...publicUserSelect, passwordHash: true, isActive: true }
    });

    if (!user?.passwordHash || user.role === Role.PATIENT) {
      logAuthEvent('staff_login_failure', { email: body.email, reason: 'invalid_credentials' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive && user.role === Role.DOCTOR) {
      logAuthEvent('staff_login_failure', { userId: user.id, role: user.role, reason: 'doctor_pending_approval' });
      return res.status(403).json({ message: 'Doctor account is pending admin approval.' });
    }

    if (!user.isActive) {
      logAuthEvent('staff_login_failure', { userId: user.id, role: user.role, reason: 'inactive_account' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      logAuthEvent('staff_login_failure', { userId: user.id, role: user.role, reason: 'invalid_credentials' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { passwordHash: _passwordHash, isActive: _isActive, ...safeUser } = user;
    logAuthEvent('staff_login_success', { userId: safeUser.id, role: safeUser.role });
    res.json(toAuthResponse(safeUser));
  })
);

app.post(
  '/auth/forgot-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, role: true, email: true, isActive: true }
    });

    if (!user || !user.isActive || user.role === Role.PATIENT) {
      return res.json({ message: 'If the account exists, reset instructions have been generated.' });
    }

    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Password reset token for ${body.email}: ${token}`);
    }

    res.json({ message: 'If the account exists, reset instructions have been sent.' });
  })
);

app.post(
  '/auth/reset-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ token: z.string().min(20), password: z.string().min(8) }).parse(req.body);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
      include: { user: { select: publicUserSelect } }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } })
    ]);

    res.json(toAuthResponse(resetToken.user));
  })
);

app.post(
  '/auth/google',
  asyncRoute(async (req, res) => {
    const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
    if (!googleClient || !googleClientId) {
      return res.status(503).json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: body.idToken,
      audience: googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(401).json({ message: 'Google account email is required' });
    }

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        name: payload.name || payload.email
      },
      create: {
        name: payload.name || payload.email,
        email: payload.email,
        role: Role.PATIENT
      },
      select: publicUserSelect
    });

    res.json(toAuthResponse(user));
  })
);

app.post(
  '/auth/supabase-exchange',
  asyncRoute(async (req, res) => {
    const body = z.object({ supabaseToken: z.string().min(10) }).parse(req.body);

    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Supabase is not configured on the server.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(body.supabaseToken);
    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired Supabase token.' });
    }

    const supabaseUser = data.user;
    const email = supabaseUser.email ?? null;
    const mobile = supabaseUser.phone ?? null;

    const whereClause = email
      ? { email }
      : mobile
        ? { mobile }
        : null;

    if (!whereClause) {
      return res.status(400).json({ message: 'Supabase user has no email or mobile to match.' });
    }

    const user = await prisma.user.upsert({
      where: whereClause,
      update: {},
      create: {
        name: supabaseUser.user_metadata?.['full_name'] || email || mobile || 'Patient',
        email,
        mobile,
        role: Role.PATIENT
      },
      select: publicUserSelect
    });

    logAuthEvent('supabase_exchange', { userId: user.id, role: user.role });
    res.json(toAuthResponse(user));
  })
);

app.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

app.get(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, mobile: true,
        allergies: true, currentMedications: true, chronicConditions: true
      }
    });
    res.json({ profile: user });
  })
);

app.put(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z.object({
      name: z.string().min(1).max(100),
      allergies: z.string().max(1000).optional(),
      currentMedications: z.string().max(2000).optional(),
      chronicConditions: z.string().max(1000).optional()
    }).parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: {
        id: true, name: true, email: true, mobile: true,
        allergies: true, currentMedications: true, chronicConditions: true
      }
    });
    res.json({ profile: updated });
  })
);

app.get(
  '/diseases',
  asyncRoute(async (_req, res) => {
    const diseases = await prisma.disease.findMany({
      where: { isActive: true },
      orderBy: { feeInPaise: 'asc' }
    });

    res.json({ diseases });
  })
);

app.get(
  '/admin/diseases/list',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (_req, res) => {
    const diseases = await prisma.disease.findMany({ orderBy: { name: 'asc' } });
    res.json({ diseases });
  })
);

app.post(
  '/admin/diseases',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        intakeQuestions: z.array(z.string().min(3)).min(1)
      })
      .parse(req.body);

    const disease = await prisma.disease.create({ data: body });
    res.status(201).json({ disease });
  })
);

app.put(
  '/admin/diseases/:id',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        isActive: z.boolean(),
        intakeQuestions: z.array(z.string().min(1)).min(1)
      })
      .parse(req.body);

    const disease = await prisma.disease.update({
      where: { id: routeParam(req, 'id') },
      data: body
    });
    res.json({ disease });
  })
);

app.get(
  '/admin/doctors',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = queryPositiveInt(req, 'pageSize', 10);
    const query = queryText(req, 'q').trim();
    const status = queryText(req, 'status').toUpperCase();
    const sortBy = queryText(req, 'sortBy');
    const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where = {
      role: Role.DOCTOR,
      ...(status === 'ACTIVE' ? { isActive: true } : {}),
      ...(status === 'INACTIVE' ? { isActive: false } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { mobile: { contains: query, mode: 'insensitive' as const } },
              { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
            ]
          }
        : {})
    };

    const orderBy =
      sortBy === 'name'
        ? ({ name: sortDirection } as const)
        : sortBy === 'status'
          ? ({ isActive: sortDirection } as const)
          : ({ createdAt: sortDirection } as const);

    const total = await prisma.user.count({ where });
    const doctors = await prisma.user.findMany({
      where,
      select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    res.json({
      doctors,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

app.get(
  '/admin/doctors/pending',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = queryPositiveInt(req, 'pageSize', 10);
    const query = queryText(req, 'q').trim();

    const where = {
      role: Role.DOCTOR,
      isActive: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { mobile: { contains: query, mode: 'insensitive' as const } },
              { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
            ]
          }
        : {})
    };

    const total = await prisma.user.count({ where });
    const pendingDoctors = await prisma.user.findMany({
      where,
      select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    res.json({
      pendingDoctors,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

app.get(
  '/admin/consumers',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = queryPositiveInt(req, 'pageSize', 10);
    const query = queryText(req, 'q').trim().toLowerCase();
    const sortBy = queryText(req, 'sortBy');
    const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const consultations = await prisma.consultation.findMany({
      select: {
        patient: { select: publicUserSelect }
      }
    });

    const grouped = new Map<string, { id: string; name: string; email: string; mobile: string; consultations: number }>();
    for (const row of consultations) {
      const patient = row.patient;
      if (!patient?.id) {
        continue;
      }

      const existing = grouped.get(patient.id);
      if (existing) {
        existing.consultations += 1;
        continue;
      }

      grouped.set(patient.id, {
        id: patient.id,
        name: patient.name || 'Unknown',
        email: patient.email || '',
        mobile: patient.mobile || '',
        consultations: 1
      });
    }

    const filtered = Array.from(grouped.values()).filter((consumer) => {
      if (!query) {
        return true;
      }

      return [consumer.name, consumer.email, consumer.mobile].join(' ').toLowerCase().includes(query);
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const compare = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? compare : -compare;
      }

      const compare = a.consultations - b.consultations;
      return sortDirection === 'asc' ? compare : -compare;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const consumers = filtered.slice(start, start + pageSize);

    res.json({
      consumers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

app.get(
  '/admin/consumers/:id',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const patient = await prisma.user.findFirst({
      where: { id: patientId, role: Role.PATIENT },
      select: publicUserSelect
    });

    if (!patient) {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      include: includeConsultationRelations(),
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const [totalDoseEvents, takenDoseEvents, skippedDoseEvents, missedDoseEvents] = await Promise.all([
      prisma.medicineDoseEvent.count({ where: { patientId } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.TAKEN } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.SKIPPED } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.MISSED } })
    ]);

    const adherencePercent = totalDoseEvents ? Math.round((takenDoseEvents / totalDoseEvents) * 100) : 0;
    res.json({
      consumer: patient,
      consultations: await hydrateConsultationsAttachments(consultations, apiPublicBaseUrl()),
      adherence: {
        total: totalDoseEvents,
        taken: takenDoseEvents,
        skipped: skippedDoseEvents,
        missed: missedDoseEvents,
        percent: adherencePercent
      }
    });
  })
);

app.post(
  '/admin/doctors/:id/approve',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const doctorId = routeParam(req, 'id');
    const doctor = await prisma.user.update({
      where: { id: doctorId },
      data: { isActive: true },
      select: { ...publicUserSelect, isActive: true, doctorProfile: true }
    });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'doctor.approve',
      targetType: 'doctor',
      targetId: doctor.id,
      summary: 'Doctor approved by admin.'
    });

    res.json({ doctor, message: 'Doctor approved successfully.' });
  })
);

app.post(
  '/admin/doctors/:id/reject',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const doctorId = routeParam(req, 'id');
    const doctor = await prisma.user.update({
      where: { id: doctorId },
      data: { isActive: false },
      select: { ...publicUserSelect, isActive: true, doctorProfile: true }
    });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'doctor.reject',
      targetType: 'doctor',
      targetId: doctor.id,
      summary: 'Doctor marked pending/inactive by admin.'
    });

    res.json({ doctor, message: 'Doctor marked as not approved.' });
  })
);

app.post(
  '/admin/doctors/:id/status',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const doctorId = routeParam(req, 'id');
    const body = z.object({ isActive: z.boolean() }).parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { id: doctorId, role: Role.DOCTOR },
      select: { id: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const doctor = await prisma.user.update({
      where: { id: doctorId },
      data: { isActive: body.isActive },
      select: { ...publicUserSelect, isActive: true, doctorProfile: true }
    });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: body.isActive ? 'doctor.activate' : 'doctor.deactivate',
      targetType: 'doctor',
      targetId: doctor.id,
      summary: body.isActive ? 'Doctor activated by admin.' : 'Doctor deactivated by admin.'
    });

    res.json({
      doctor,
      message: body.isActive ? 'Doctor activated successfully.' : 'Doctor deactivated successfully.'
    });
  })
);

app.post(
  '/admin/doctors',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        mobile: z.string().min(8).optional(),
        password: z.string().min(8),
        specialty: z.string().min(2),
        registrationNo: z.string().optional()
      })
      .parse(req.body);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const doctor = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        mobile: body.mobile,
        passwordHash,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialty: body.specialty,
            registrationNo: body.registrationNo
          }
        }
      },
      select: { ...publicUserSelect, doctorProfile: true }
    });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'doctor.create',
      targetType: 'doctor',
      targetId: doctor.id,
      summary: 'Doctor account created by admin.',
      metadata: { specialty: body.specialty }
    });

    res.status(201).json({ doctor });
  })
);

app.put(
  '/admin/doctors/:id',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const doctorId = routeParam(req, 'id');
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        mobile: z.string().min(8).optional().or(z.literal('')),
        specialty: z.string().min(2),
        registrationNo: z.string().optional().or(z.literal('')),
        isAvailable: z.boolean().optional().default(true)
      })
      .parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: doctorId, role: Role.DOCTOR },
      select: { id: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const doctor = await prisma.user.update({
      where: { id: doctorId },
      data: {
        name: body.name,
        email: body.email,
        mobile: body.mobile || null,
        doctorProfile: {
          upsert: {
            create: {
              specialty: body.specialty,
              registrationNo: body.registrationNo || null,
              isAvailable: body.isAvailable
            },
            update: {
              specialty: body.specialty,
              registrationNo: body.registrationNo || null,
              isAvailable: body.isAvailable
            }
          }
        }
      },
      select: { ...publicUserSelect, isActive: true, doctorProfile: true }
    });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'doctor.update',
      targetType: 'doctor',
      targetId: doctor.id,
      summary: 'Doctor profile updated by admin.',
      metadata: { isAvailable: body.isAvailable, specialty: body.specialty }
    });

    res.json({ doctor, message: 'Doctor profile updated successfully.' });
  })
);

app.get(
  '/admin/audit-logs',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = queryPositiveInt(req, 'pageSize', 20);
    const total = await prisma.auditLog.count();
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    res.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

app.get(
  '/billing/plans',
  asyncRoute(async (_req, res) => {
    await ensureBillingPlans();
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceInPaise: 'asc' }]
    });
    res.json({ plans });
  })
);

app.post(
  '/consultations',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        diseaseId: z.string().min(1),
        intakeAnswers: z.record(z.string(), z.string().min(1)),
        purchaseType: z.enum(['ONE_TIME', 'PLAN']).optional().default('ONE_TIME'),
        planCode: z.string().min(2).optional()
      })
      .parse(req.body);

    await ensureBillingPlans();
    const disease = await prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } });
    const selectedPlan =
      body.purchaseType === 'PLAN'
        ? await prisma.billingPlan.findFirst({
            where: { code: body.planCode || '', isActive: true }
          })
        : await prisma.billingPlan.findFirst({
            where: { code: 'ONE_TIME', isActive: true }
          });
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Selected billing plan is not available.' });
    }

    const amountInPaise = body.purchaseType === 'ONE_TIME' ? disease.feeInPaise : selectedPlan.priceInPaise;
    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        intakeAnswers: body.intakeAnswers,
        billingPlanCode: selectedPlan.code,
        pricingSnapshot: {
          purchaseType: body.purchaseType,
          diseaseFeeInPaise: disease.feeInPaise,
          selectedPlanCode: selectedPlan.code,
          selectedPlanName: selectedPlan.name,
          selectedPlanPriceInPaise: selectedPlan.priceInPaise
        },
        payment: {
          create: {
            amountInPaise,
            billingPlanCode: selectedPlan.code,
            lineItems: {
              purchaseType: body.purchaseType,
              diseaseName: disease.name,
              diseaseFeeInPaise: disease.feeInPaise,
              planCode: selectedPlan.code,
              planName: selectedPlan.name,
              consultationsLimit: selectedPlan.consultationsLimit
            },
            status: PaymentStatus.CREATED
          }
        }
      },
      include: includeConsultationRelations()
    });

    res.status(201).json({
      consultation: await hydrateConsultationAttachments(consultation, apiPublicBaseUrl())
    });
  })
);

app.get(
  '/consultations',
  authRequired,
  asyncRoute(async (req, res) => {
    const where =
      req.user!.role === Role.PATIENT
        ? { patientId: req.user!.id }
        : req.user!.role === Role.DOCTOR
          ? { assignedDoctorId: req.user!.id }
          : {};

    const consultations = await prisma.consultation.findMany({
      where,
      include: includeConsultationRelations(),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      consultations: await hydrateConsultationsAttachments(consultations, apiPublicBaseUrl())
    });
  })
);

app.get(
  '/consultations/:id',
  authRequired,
  asyncRoute(async (req, res) => {
    const consultation = await prisma.consultation.findUnique({
      where: { id: routeParam(req, 'id') },
      include: includeConsultationRelations()
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    const isOwner = consultation.patientId === req.user!.id;
    const isDoctor = consultation.assignedDoctorId === req.user!.id;
    const isAdmin = req.user!.role === Role.ADMIN;
    if (!isOwner && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      consultation: await hydrateConsultationAttachments(consultation, apiPublicBaseUrl())
    });
  })
);

app.post(
  '/consultations/:id/assign',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
    const doctor = await prisma.user.findFirstOrThrow({
      where: { id: body.doctorId, role: Role.DOCTOR, isActive: true }
    });

    const consultation = await prisma.consultation.update({
      where: { id: routeParam(req, 'id') },
      data: {
        assignedDoctorId: doctor.id,
        status: ConsultationStatus.ASSIGNED
      },
      include: {
        ...includeConsultationRelations(),
        patient: { select: { id: true, name: true, mobile: true, email: true } }
      }
    });

    const patient = (consultation as any).patient;
    if (patient) {
      void notificationService.sendBatch(
        enabledNotificationChannels.map((ch) => ({
          eventType: 'DOCTOR_ASSIGNED' as const,
          channel: ch,
          recipientId: patient.id,
          recipientName: patient.name,
          recipientMobile: patient.mobile,
          recipientEmail: patient.email,
          title: 'Doctor assigned — Vitalis Care',
          body: `Dr. ${doctor.name} has been assigned to your consultation. You can now chat with your doctor in the app.`
        }))
      );
    }

    res.json({
      consultation: await hydrateConsultationAttachments(consultation, apiPublicBaseUrl())
    });
  })
);

app.post(
  '/consultations/:id/messages',
  authRequired,
  asyncRoute(async (req, res) => {
    const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
    const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });

    const canChat =
      req.user!.role === Role.ADMIN ||
      consultation.patientId === req.user!.id ||
      consultation.assignedDoctorId === req.user!.id;

    if (!canChat) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        consultationId: consultation.id,
        senderId: req.user!.id,
        body: body.body
      },
      include: { sender: { select: publicUserSelect } }
    });

    if (consultation.status === ConsultationStatus.ASSIGNED) {
      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { status: ConsultationStatus.IN_PROGRESS }
      });
    }

    res.status(201).json({ message });
  })
);

app.post(
  '/consultations/:id/attachments',
  authRequired,
  attachmentUploadMiddleware,
  asyncRoute(async (req, res) => {
    const consultationId = routeParam(req, 'id');
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    const canUpload =
      req.user!.role === Role.ADMIN ||
      consultation.patientId === req.user!.id ||
      consultation.assignedDoctorId === req.user!.id;

    if (!canUpload) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (
      req.user!.role === Role.DOCTOR &&
      consultation.assignedDoctorId &&
      consultation.assignedDoctorId !== req.user!.id
    ) {
      return res.status(403).json({ message: 'Only the assigned doctor can attach files to this consultation.' });
    }

    const file = 'file' in req ? (req as Express.Request & { file?: Express.Multer.File }).file : undefined;
    if (!file?.buffer) {
      return res.status(400).json({ message: 'File required (form field name: file).' });
    }

    const kind = coerceAttachmentKind(req.user!.role, typeof req.body?.kind === 'string' ? req.body.kind : undefined);
    const captionRaw = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
    const caption = captionRaw ? captionRaw.slice(0, 500) : undefined;

    const storagePath = buildAttachmentStoragePath(consultationId, file.originalname || 'upload');
    await persistConsultationAttachment(storagePath, file.buffer, file.mimetype);

    const created = await prisma.consultationAttachment.create({
      data: {
        consultationId,
        uploadedById: req.user!.id,
        kind,
        storagePath,
        fileName: file.originalname || null,
        mimeType: file.mimetype,
        caption: caption || null
      },
      include: { uploadedBy: { select: publicUserSelect } }
    });

    const attachment = await serializeAttachmentRecord(
      created as unknown as Record<string, unknown>,
      apiPublicBaseUrl()
    );
    res.status(201).json({ attachment });
  })
);

app.post(
  '/doctor/prescription-options',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        type: z.nativeEnum(PrescriptionOptionType),
        label: z.string().min(2)
      })
      .parse(req.body);

    const normalizedLabel = normalizeOptionLabel(body.label);

    const option = await prisma.prescriptionOption.upsert({
      where: {
        type_normalizedLabel: {
          type: body.type,
          normalizedLabel
        }
      },
      update: {
        label: body.label.trim()
      },
      create: {
        type: body.type,
        label: body.label.trim(),
        normalizedLabel,
        isSystem: false,
        createdById: req.user!.id
      }
    });

    res.status(201).json({ option });
  })
);

app.get(
  '/doctor/prescription-options',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const query = z
      .object({
        type: z.nativeEnum(PrescriptionOptionType)
      })
      .parse(req.query);

    const options = await prisma.prescriptionOption.findMany({
      where: { type: query.type },
      orderBy: [{ isSystem: 'desc' }, { label: 'asc' }]
    });

    res.json({ options });
  })
);

const templateItemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0)
});

const templateInputSchema = z.object({
  name: z.string().min(1).max(120),
  diagnosis: z.string().max(500).default(''),
  advice: z.string().max(2000).optional(),
  notes: z.string().max(2000).default(''),
  items: z.array(templateItemSchema).min(1)
});

app.get(
  '/doctor/prescription-templates',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const templates = await prisma.prescriptionTemplate.findMany({
      where: { doctorId: req.user!.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ templates });
  })
);

app.post(
  '/doctor/prescription-templates',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = templateInputSchema.parse(req.body);
    const template = await prisma.prescriptionTemplate.create({
      data: {
        doctorId: req.user!.id,
        name: body.name,
        diagnosis: body.diagnosis,
        advice: body.advice,
        notes: body.notes,
        items: {
          create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i }))
        }
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    res.status(201).json({ template });
  })
);

app.put(
  '/doctor/prescription-templates/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = templateInputSchema.parse(req.body);
    const existing = await prisma.prescriptionTemplate.findUnique({ where: { id: routeParam(req, 'id') } });
    if (!existing || existing.doctorId !== req.user!.id) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await prisma.prescriptionTemplateItem.deleteMany({ where: { templateId: existing.id } });
    const template = await prisma.prescriptionTemplate.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        diagnosis: body.diagnosis,
        advice: body.advice,
        notes: body.notes,
        items: {
          create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i }))
        }
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    res.json({ template });
  })
);

app.delete(
  '/doctor/prescription-templates/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const existing = await prisma.prescriptionTemplate.findUnique({ where: { id: routeParam(req, 'id') } });
    if (!existing || existing.doctorId !== req.user!.id) {
      return res.status(404).json({ message: 'Template not found' });
    }
    await prisma.prescriptionTemplate.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

const prescriptionItemInputSchema = z.object({
  medicineName: z.string().min(2),
  strength: z.string().min(1).optional(),
  dose: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  durationDays: z.number().int().min(1).max(120).optional(),
  intakeTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(6).optional()
});

const prescriptionInputSchema = z.object({
  methodOptionId: z.string().min(1),
  diagnosedDiseaseOptionId: z.string().min(1),
  diagnosis: z.string().min(3),
  advice: z.string().min(3).optional(),
  notes: z.string().min(5),
  fileUrl: z.string().url().optional().or(z.literal('')),
  followUpDate: z.coerce.date().optional(),
  status: z.nativeEnum(PrescriptionStatus).default(PrescriptionStatus.DRAFT),
  items: z.array(prescriptionItemInputSchema).min(1)
});

app.get(
  '/doctor/appointments/:id/prescriptions',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const consultation = await prisma.consultation.findUnique({
      where: { id: routeParam(req, 'id') },
      select: { id: true, assignedDoctorId: true, status: true }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { consultationId: consultation.id },
      include: includePrescriptionRelations(),
      orderBy: { version: 'desc' }
    });

    res.json({ prescriptions, consultation: { status: consultation.status } });
  })
);

app.post(
  '/doctor/appointments/:id/prescriptions',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = prescriptionInputSchema.parse(req.body);

    const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });
    if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
      return res.status(403).json({ message: 'Only the assigned doctor can manage prescription' });
    }

    const [methodOption, diagnosedDiseaseOption] = await Promise.all([
      prisma.prescriptionOption.findFirst({
        where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD }
      }),
      prisma.prescriptionOption.findFirst({
        where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE }
      })
    ]);

    if (!methodOption || !diagnosedDiseaseOption) {
      return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const previous = await tx.prescription.findFirst({
        where: { consultationId: consultation.id },
        orderBy: { version: 'desc' }
      });

      const nextVersion = (previous?.version || 0) + 1;
      await tx.prescription.updateMany({
        where: { consultationId: consultation.id, isLatest: true },
        data: { isLatest: false }
      });

      const created = await tx.prescription.create({
        data: {
          consultationId: consultation.id,
          uploadedById: req.user!.id,
          patientId: consultation.patientId,
          version: nextVersion,
          isLatest: true,
          methodOptionId: methodOption.id,
          diagnosedDiseaseOptionId: diagnosedDiseaseOption.id,
          diagnosis: body.diagnosis,
          advice: body.advice || null,
          notes: body.notes,
          fileUrl: body.fileUrl || null,
          followUpDate: body.followUpDate || null,
          status: body.status
        }
      });

      const createdItems = [];
      for (const [index, item] of body.items.entries()) {
        const createdItem = await tx.prescriptionItem.create({
          data: {
            prescriptionId: created.id,
            medicineName: item.medicineName,
            strength: item.strength,
            dose: item.dose,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            durationDays: item.durationDays,
            intakeTimes: item.intakeTimes,
            sortOrder: index
          }
        });

        createdItems.push(createdItem);
      }

      if (body.status === PrescriptionStatus.PUBLISHED) {
        const scheduleEvents = buildDoseScheduleEvents({
          patientId: consultation.patientId,
          prescriptionId: created.id,
          prescriptionItems: createdItems
        });

        if (scheduleEvents.length) {
          await tx.medicineDoseEvent.createMany({
            data: scheduleEvents
          });
        }
      }

      return tx.prescription.findUniqueOrThrow({
        where: { id: created.id },
        include: includePrescriptionRelations()
      });
    });

    await prisma.consultation.update({
      where: { id: consultation.id },
      data: {
        status:
          body.status === PrescriptionStatus.PUBLISHED
            ? ConsultationStatus.PRESCRIPTION_UPLOADED
            : consultation.status
      }
    });

    if (body.status === PrescriptionStatus.PUBLISHED) {
      const rxPatient = (prescription as any).patient;
      if (rxPatient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'PRESCRIPTION_READY' as const,
            channel: ch,
            recipientId: rxPatient.id,
            recipientName: rxPatient.name,
            recipientMobile: rxPatient.mobile,
            recipientEmail: rxPatient.email,
            title: 'Your prescription is ready — Vitalis Care',
            body: `Your doctor has published a new prescription. Open the app to view your medicines and dosage schedule.`
          }))
        );
      }
    }

    res.status(201).json({ prescription });
  })
);

app.put(
  '/doctor/prescriptions/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = prescriptionInputSchema.parse(req.body);
    const prescription = await prisma.prescription.findUnique({
      where: { id: routeParam(req, 'id') },
      include: { consultation: { select: { assignedDoctorId: true } } }
    });

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (!prescription.isLatest) {
      return res.status(400).json({ message: 'Only the latest version can be edited.' });
    }

    if (prescription.status === PrescriptionStatus.PUBLISHED) {
      return res.status(400).json({ message: 'Published prescriptions cannot be edited. Create follow-up version.' });
    }

    if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [methodOption, diagnosedDiseaseOption] = await Promise.all([
      prisma.prescriptionOption.findFirst({
        where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD }
      }),
      prisma.prescriptionOption.findFirst({
        where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE }
      })
    ]);

    if (!methodOption || !diagnosedDiseaseOption) {
      return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPrescription = await tx.prescription.update({
        where: { id: prescription.id },
        data: {
          methodOptionId: methodOption.id,
          diagnosedDiseaseOptionId: diagnosedDiseaseOption.id,
          diagnosis: body.diagnosis,
          advice: body.advice || null,
          notes: body.notes,
          fileUrl: body.fileUrl || null,
          followUpDate: body.followUpDate || null,
          status: body.status,
          uploadedById: req.user!.id
        }
      });

      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: updatedPrescription.id } });

      const createdItems = [];
      for (const [index, item] of body.items.entries()) {
        const createdItem = await tx.prescriptionItem.create({
          data: {
            prescriptionId: updatedPrescription.id,
            medicineName: item.medicineName,
            strength: item.strength,
            dose: item.dose,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            durationDays: item.durationDays,
            intakeTimes: item.intakeTimes,
            sortOrder: index
          }
        });
        createdItems.push(createdItem);
      }

      await tx.medicineDoseEvent.deleteMany({ where: { prescriptionId: updatedPrescription.id } });
      if (body.status === PrescriptionStatus.PUBLISHED) {
        const events = buildDoseScheduleEvents({
          patientId: updatedPrescription.patientId,
          prescriptionId: updatedPrescription.id,
          prescriptionItems: createdItems
        });
        if (events.length) {
          await tx.medicineDoseEvent.createMany({ data: events });
        }
      }

      return tx.prescription.findUniqueOrThrow({
        where: { id: updatedPrescription.id },
        include: includePrescriptionRelations()
      });
    });

    if (body.status === PrescriptionStatus.PUBLISHED) {
      await prisma.consultation.update({
        where: { id: updated.consultation.id },
        data: { status: ConsultationStatus.PRESCRIPTION_UPLOADED }
      });

      const updatedPatient = (updated as any).patient;
      if (updatedPatient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'PRESCRIPTION_READY' as const,
            channel: ch,
            recipientId: updatedPatient.id,
            recipientName: updatedPatient.name,
            recipientMobile: updatedPatient.mobile,
            recipientEmail: updatedPatient.email,
            title: 'Your prescription is ready — Vitalis Care',
            body: `Your doctor has published a new prescription. Open the app to view your medicines and dosage schedule.`
          }))
        );
      }
    }

    res.json({ prescription: updated });
  })
);

app.get(
  '/doctor/prescriptions/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const prescription = await prisma.prescription.findUnique({
      where: { id: routeParam(req, 'id') },
      include: includePrescriptionRelations()
    });

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ prescription });
  })
);

app.get(
  '/patient/prescriptions',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: req.user!.id,
        status: PrescriptionStatus.PUBLISHED
      },
      include: includePrescriptionRelations(),
      orderBy: { createdAt: 'desc' }
    });

    res.json({ prescriptions });
  })
);

app.get(
  '/patient/prescriptions/:id',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const prescription = await prisma.prescription.findUnique({
      where: { id: routeParam(req, 'id') },
      include: includePrescriptionRelations()
    });

    if (!prescription || prescription.patientId !== req.user!.id || prescription.status !== PrescriptionStatus.PUBLISHED) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json({ prescription });
  })
);

app.get(
  '/patient/prescriptions/:id/pdf',
  authRequired,
  asyncRoute(async (req, res) => {
    const prescription = await prisma.prescription.findUnique({
      where: { id: routeParam(req, 'id') },
      include: {
        ...includePrescriptionRelations(),
        patient: { select: { name: true, mobile: true } }
      }
    });

    if (!prescription || prescription.status !== PrescriptionStatus.PUBLISHED) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const isOwner = prescription.patientId === req.user!.id;
    const isDoctor = prescription.consultation.assignedDoctorId === req.user!.id;
    const isAdmin = req.user!.role === Role.ADMIN;
    if (!isOwner && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const rxPatient = (prescription as any).patient;
    const items = prescription.items || [];
    const date = new Date(prescription.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const followUp = prescription.followUpDate
      ? new Date(prescription.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const medicineRows = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${item.medicineName}</strong>${item.strength ? ` <small>(${item.strength})</small>` : ''}</td>
        <td>${item.dose || '—'}</td>
        <td>${item.frequency || '—'}</td>
        <td>${item.duration || '—'}</td>
        <td>${item.instructions || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Prescription — Vitalis Care</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
  .clinic-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .clinic-name { font-size: 18px; font-weight: bold; color: #1d4ed8; }
  .clinic-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .rx-symbol { font-size: 40px; color: #1d4ed8; font-style: italic; line-height: 1; }
  .divider { border: none; border-top: 2px solid #1d4ed8; margin: 8px 0 16px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; margin-bottom: 16px; }
  .meta-item label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: .05em; }
  .meta-item p { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1d4ed8; color: #fff; font-size: 11px; text-align: left; padding: 6px 8px; }
  td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8faff; }
  .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; }
  .footer { margin-top: 32px; display: flex; justify-content: flex-end; }
  .sig-box { text-align: center; border-top: 1px solid #374151; padding-top: 6px; min-width: 180px; font-size: 11px; color: #6b7280; }
  .followup { background: #dbeafe; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-bottom: 16px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="clinic-header">
    <div>
      <div class="clinic-name">Vitalis Care and Research Centre</div>
      <div class="clinic-sub">Doctor-led digital consultations &nbsp;|&nbsp; vitaliscare.in</div>
    </div>
    <div class="rx-symbol">&#x211E;</div>
  </div>
  <hr class="divider" />

  <div class="meta-grid">
    <div class="meta-item"><label>Patient</label><p>${rxPatient?.name || 'Patient'}</p></div>
    <div class="meta-item"><label>Date</label><p>${date}</p></div>
    <div class="meta-item"><label>Diagnosis</label><p>${prescription.diagnosis || '—'}</p></div>
    <div class="meta-item"><label>Doctor</label><p>${prescription.uploadedBy?.name || '—'}</p></div>
    ${prescription.methodOption ? `<div class="meta-item"><label>Method</label><p>${prescription.methodOption.label}</p></div>` : ''}
    ${prescription.diagnosedDiseaseOption ? `<div class="meta-item"><label>Condition</label><p>${prescription.diagnosedDiseaseOption.label}</p></div>` : ''}
  </div>

  <p class="section-title">Medicines</p>
  <table>
    <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
    <tbody>${medicineRows || '<tr><td colspan="6" style="color:#9ca3af">No items</td></tr>'}</tbody>
  </table>

  ${prescription.notes ? `<p class="section-title">Clinical Notes</p><div class="notes-box">${prescription.notes}</div>` : ''}
  ${prescription.advice ? `<p class="section-title">Advice</p><div class="notes-box">${prescription.advice}</div>` : ''}
  ${followUp ? `<div class="followup">&#x1F4C5; <strong>Follow-up due:</strong> ${followUp}</div>` : ''}

  <div class="footer">
    <div class="sig-box">
      ${prescription.uploadedBy?.name || 'Doctor'}<br />Vitalis Care
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="prescription-${prescription.id.slice(0, 8)}.html"`);
    res.send(html);
  })
);

app.get(
  '/patient/today-doses',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const doses = await prisma.medicineDoseEvent.findMany({
      where: {
        patientId: req.user!.id,
        scheduledFor: { gte: start, lt: end }
      },
      include: {
        prescriptionItem: true,
        prescription: {
          include: {
            methodOption: true,
            diagnosedDiseaseOption: true
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });

    res.json({ doses });
  })
);

app.get(
  '/patient/reminder-preferences',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const stored = await prisma.reminderPreference.findUnique({
      where: { userId: req.user!.id },
      select: {
        inApp: true,
        sms: true,
        whatsapp: true,
        push: true,
        quietHoursStart: true,
        quietHoursEnd: true
      }
    });
    const preferences = stored || defaultReminderPreference;
    res.json({ preferences });
  })
);

app.put(
  '/patient/reminder-preferences',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        inApp: z.boolean(),
        sms: z.boolean(),
        whatsapp: z.boolean(),
        push: z.boolean(),
        quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
        quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/)
      })
      .parse(req.body);

    await prisma.reminderPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...body },
      update: body
    });

    res.json({ preferences: body, message: 'Reminder preferences saved.' });
  })
);

app.post(
  '/patient/dose-events/:id/take',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const event = await prisma.medicineDoseEvent.findUnique({
      where: { id: routeParam(req, 'id') }
    });

    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }

    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: {
        status: DoseEventStatus.TAKEN,
        takenAt: new Date()
      }
    });

    res.json({ doseEvent: updated });
  })
);

app.post(
  '/patient/dose-events/:id/snooze',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z.object({ minutes: z.number().int().min(5).max(120).optional() }).parse(req.body);
    const event = await prisma.medicineDoseEvent.findUnique({
      where: { id: routeParam(req, 'id') }
    });

    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }
    if (event.status !== DoseEventStatus.PENDING) {
      return res.status(400).json({ message: 'Only pending doses can be snoozed.' });
    }

    const minutes = body.minutes || 15;
    const scheduledFor = new Date(event.scheduledFor.getTime() + minutes * 60 * 1000);
    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: {
        scheduledFor,
        note: `Snoozed by ${minutes} min at ${new Date().toISOString()}`
      }
    });

    res.json({ doseEvent: updated, message: `Dose snoozed by ${minutes} minutes.` });
  })
);

app.post(
  '/patient/dose-events/:id/skip',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z.object({ note: z.string().max(300).optional() }).parse(req.body);
    const event = await prisma.medicineDoseEvent.findUnique({
      where: { id: routeParam(req, 'id') }
    });

    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }

    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: {
        status: DoseEventStatus.SKIPPED,
        skippedAt: new Date(),
        note: body.note
      }
    });

    res.json({ doseEvent: updated });
  })
);

app.get(
  '/doctor/patients/:id/adherence-summary',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    if (req.user!.role === Role.DOCTOR) {
      const linkedConsultation = await prisma.consultation.findFirst({
        where: { patientId, assignedDoctorId: req.user!.id },
        select: { id: true }
      });

      if (!linkedConsultation) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const [total, taken, skipped, missed] = await Promise.all([
      prisma.medicineDoseEvent.count({ where: { patientId } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.TAKEN } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.SKIPPED } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.MISSED } })
    ]);

    const adherencePercent = total ? Math.round((taken / total) * 100) : 0;
    res.json({
      patientId,
      totals: { total, taken, skipped, missed },
      adherencePercent
    });
  })
);

app.get(
  '/doctor/patients/:id/adherence-trend',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const days = queryPositiveInt(req, 'days', 7, 1, 30);
    if (req.user!.role === Role.DOCTOR) {
      const linkedConsultation = await prisma.consultation.findFirst({
        where: { patientId, assignedDoctorId: req.user!.id },
        select: { id: true }
      });

      if (!linkedConsultation) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const events = await prisma.medicineDoseEvent.findMany({
      where: {
        patientId,
        scheduledFor: { gte: start, lte: end }
      },
      select: { scheduledFor: true, status: true }
    });

    const trendMap = new Map<
      string,
      { date: string; total: number; taken: number; skipped: number; missed: number; pending: number; adherencePercent: number }
    >();
    for (let index = 0; index < days; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      trendMap.set(key, {
        date: key,
        total: 0,
        taken: 0,
        skipped: 0,
        missed: 0,
        pending: 0,
        adherencePercent: 0
      });
    }

    for (const event of events) {
      const key = event.scheduledFor.toISOString().slice(0, 10);
      const day = trendMap.get(key);
      if (!day) {
        continue;
      }

      day.total += 1;
      if (event.status === DoseEventStatus.TAKEN) day.taken += 1;
      else if (event.status === DoseEventStatus.SKIPPED) day.skipped += 1;
      else if (event.status === DoseEventStatus.MISSED) day.missed += 1;
      else day.pending += 1;
    }

    const trend = Array.from(trendMap.values()).map((day) => ({
      ...day,
      adherencePercent: day.total ? Math.round((day.taken / day.total) * 100) : 0
    }));
    const totals = trend.reduce(
      (acc, day) => {
        acc.total += day.total;
        acc.taken += day.taken;
        acc.skipped += day.skipped;
        acc.missed += day.missed;
        acc.pending += day.pending;
        return acc;
      },
      { total: 0, taken: 0, skipped: 0, missed: 0, pending: 0 }
    );

    res.json({
      patientId,
      days,
      totals,
      adherencePercent: totals.total ? Math.round((totals.taken / totals.total) * 100) : 0,
      trend
    });
  })
);

app.get(
  '/doctor/patients/:id/dose-events',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const days = queryPositiveInt(req, 'days', 7, 1, 30);

    if (req.user!.role === Role.DOCTOR) {
      const linkedConsultation = await prisma.consultation.findFirst({
        where: { patientId, assignedDoctorId: req.user!.id },
        select: { id: true }
      });
      if (!linkedConsultation) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const events = await prisma.medicineDoseEvent.findMany({
      where: {
        patientId,
        status: { in: [DoseEventStatus.SKIPPED, DoseEventStatus.MISSED] },
        scheduledFor: { gte: since }
      },
      select: {
        id: true,
        status: true,
        scheduledFor: true,
        skippedAt: true,
        note: true,
        prescriptionItem: { select: { medicineName: true } }
      },
      orderBy: { scheduledFor: 'desc' },
      take: 50
    });

    res.json({
      patientId,
      days,
      events: events.map((e) => ({
        id: e.id,
        status: e.status,
        scheduledFor: e.scheduledFor,
        interactedAt: e.skippedAt ?? null,
        note: e.note ?? null,
        medicineName: e.prescriptionItem.medicineName
      }))
    });
  })
);

app.post(
  '/consultations/:id/complete',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });
    if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
      return res.status(403).json({ message: 'Only the assigned doctor can complete consultation' });
    }

    const updated = await prisma.consultation.update({
      where: { id: consultation.id },
      data: { status: ConsultationStatus.COMPLETED },
      include: includeConsultationRelations()
    });

    res.json({
      consultation: await hydrateConsultationAttachments(updated, apiPublicBaseUrl())
    });
  })
);

app.post(
  '/payments/:consultationId/create-order',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const consultationId = routeParam(req, 'consultationId');
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { payment: true }
    });
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }
    if (consultation.patientId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const payment = consultation.payment;
    if (!payment) {
      return res.status(400).json({ message: 'Payment record is missing for this consultation.' });
    }
    if (payment.status === PaymentStatus.PAID) {
      return res.status(400).json({ message: 'Payment is already completed.' });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: payment.amountInPaise,
      currency: 'INR',
      receipt: consultationId,
      notes: {
        consultationId,
        patientId: req.user!.id,
        billingPlanCode: payment.billingPlanCode || consultation.billingPlanCode || 'ONE_TIME'
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: order.id, status: PaymentStatus.CREATED }
    });

    res.json({
      orderId: order.id,
      amountInPaise: payment.amountInPaise,
      currency: 'INR',
      razorpayKeyId
    });
  })
);

app.post(
  '/payments/:consultationId/verify',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1)
      })
      .parse(req.body);
    const consultationId = routeParam(req, 'consultationId');
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        payment: true,
        patient: { select: { id: true, name: true, mobile: true, email: true } },
        disease: { select: { name: true } }
      }
    });
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }
    if (consultation.patientId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const payment = consultation.payment;
    if (!payment || payment.providerOrderId !== body.razorpayOrderId) {
      return res.status(400).json({ message: 'Payment order does not match consultation.' });
    }

    if (!verifyRazorpaySignature(body)) {
      return res.status(400).json({ message: 'Invalid Razorpay signature.' });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        providerPaymentId: body.razorpayPaymentId
      }
    });
    await prisma.consultation.update({
      where: { id: consultation.id },
      data: { status: ConsultationStatus.PAID }
    });

    const patient = consultation.patient;
    if (patient) {
      void notificationService.sendBatch(
        enabledNotificationChannels.map((channel) => ({
          eventType: 'BOOKING_CONFIRMED' as const,
          channel,
          recipientId: patient.id,
          recipientName: patient.name,
          recipientMobile: patient.mobile,
          recipientEmail: patient.email,
          title: 'Booking confirmed — Vitalis Care',
          body: `Your consultation for ${consultation.disease?.name || 'your concern'} has been booked and payment received. A doctor will be assigned shortly.`
        }))
      );
    }

    res.json({ ok: true });
  })
);

app.post(
  '/payments/razorpay-webhook',
  asyncRoute(async (req, res) => {
    if (!razorpayWebhookSecret) {
      return res.status(503).json({ message: 'Razorpay webhook secret is not configured.' });
    }

    const signature = req.header('x-razorpay-signature') || '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto.createHmac('sha256', razorpayWebhookSecret).update(rawBody).digest('hex');

    if (
      expectedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    ) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id: string;
            order_id: string;
          };
        };
      };
    };

    if (event.event !== 'payment.captured') {
      return res.json({ ok: true, ignored: true });
    }

    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity?.order_id) {
      return res.status(400).json({ message: 'Webhook payment payload is missing order id.' });
    }

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: paymentEntity.order_id },
      select: { id: true, consultationId: true }
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found for Razorpay order.' });
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: paymentEntity.id
      }
    });
    await prisma.consultation.update({
      where: { id: payment.consultationId },
      data: { status: ConsultationStatus.PAID }
    });

    const consultationForNotif = await prisma.consultation.findUnique({
      where: { id: payment.consultationId },
      select: {
        patient: { select: { id: true, name: true, mobile: true, email: true } },
        disease: { select: { name: true } }
      }
    });
    const webhookPatient = consultationForNotif?.patient;
    if (webhookPatient) {
      void notificationService.sendBatch(
        enabledNotificationChannels.map((channel) => ({
          eventType: 'BOOKING_CONFIRMED' as const,
          channel,
          recipientId: webhookPatient.id,
          recipientName: webhookPatient.name,
          recipientMobile: webhookPatient.mobile,
          recipientEmail: webhookPatient.email,
          title: 'Booking confirmed — Vitalis Care',
          body: `Your consultation for ${consultationForNotif?.disease?.name || 'your concern'} has been booked and payment received. A doctor will be assigned shortly.`
        }))
      );
    }

    res.json({ ok: true });
  })
);

app.get(
  '/admin/payments',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
    const status = queryText(req, 'status').toUpperCase();
    const from = queryText(req, 'from');
    const to = queryText(req, 'to');
    const exportType = queryText(req, 'export').toLowerCase();

    const where: Prisma.PaymentWhereInput = {
      ...(status === 'PAID' || status === 'FAILED' || status === 'CREATED' ? { status: status as PaymentStatus } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {})
            }
          }
        : {})
    };

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          consultation: {
            select: {
              id: true,
              status: true,
              patient: { select: { id: true, name: true } },
              assignedDoctor: { select: { id: true, name: true } },
              disease: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    if (exportType === 'csv') {
      const lines = [
        'paymentId,consultationId,patientName,doctorName,disease,billingPlanCode,amountInPaise,status,providerOrderId,providerPaymentId,createdAt'
      ];
      for (const payment of payments) {
        lines.push(
          [
            payment.id,
            payment.consultationId,
            payment.consultation.patient?.name || '',
            payment.consultation.assignedDoctor?.name || '',
            payment.consultation.disease?.name || '',
            payment.billingPlanCode || '',
            String(payment.amountInPaise),
            payment.status,
            payment.providerOrderId || '',
            payment.providerPaymentId || '',
            payment.createdAt.toISOString()
          ]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(',')
        );
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="admin-payments-page-${page}.csv"`);
      return res.send(lines.join('\n'));
    }

    const summary = payments.reduce(
      (acc, payment) => {
        acc.total += payment.amountInPaise;
        if (payment.status === PaymentStatus.PAID) acc.paid += payment.amountInPaise;
        if (payment.status === PaymentStatus.FAILED) acc.failedCount += 1;
        if (payment.status === PaymentStatus.CREATED) acc.pendingCount += 1;
        return acc;
      },
      { total: 0, paid: 0, failedCount: 0, pendingCount: 0 }
    );

    res.json({
      payments,
      summary,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

app.get(
  '/doctor/payments/summary',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const doctorSharePercent = 60;
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        consultation: { assignedDoctorId: req.user!.id }
      },
      include: {
        consultation: {
          select: {
            id: true,
            status: true,
            disease: { select: { name: true } },
            patient: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const totals = payments.reduce(
      (acc, payment) => {
        acc.gross += payment.amountInPaise;
        acc.estimatedDoctorEarnings += Math.round((payment.amountInPaise * doctorSharePercent) / 100);
        return acc;
      },
      { gross: 0, estimatedDoctorEarnings: 0 }
    );

    res.json({
      doctorSharePercent,
      totals: {
        paidConsultations: payments.length,
        grossInPaise: totals.gross,
        estimatedDoctorEarningsInPaise: totals.estimatedDoctorEarnings
      },
      payments
    });
  })
);

app.get(
  '/admin/reports',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (_req, res) => {
    const [consultations, revenue, doctors] = await Promise.all([
      prisma.consultation.groupBy({ by: ['status'], _count: true }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amountInPaise: true }
      }),
      prisma.user.count({ where: { role: Role.DOCTOR, isActive: true } })
    ]);

    res.json({
      revenueInPaise: revenue._sum.amountInPaise || 0,
      activeDoctors: doctors,
      consultations
    });
  })
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: error.issues });
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Clinic API running on http://localhost:${port}`);
  void ensureBillingPlans().catch((error) => {
    console.error('[billing] Failed to ensure billing plans', error);
  });
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
  void runDoseSchedulers().catch((error) => {
    console.error('[scheduler] Initial dose scheduler run failed', error);
  });

  const timer = setInterval(() => {
    void runDoseSchedulers().catch((error) => {
      console.error('[scheduler] Dose scheduler run failed', error);
    });
  }, doseOverdueSweepIntervalMs);
  timer.unref();
});
