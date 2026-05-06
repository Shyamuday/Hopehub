import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  ConsultationStatus,
  DoseEventStatus,
  PaymentStatus,
  PrescriptionOptionType,
  PrescriptionStatus,
  Role
} from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired, signToken } from './auth.js';
import { prisma } from './db.js';
import { supabaseAdmin } from './supabase.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:4200';
const devOtp = process.env.DEV_OTP || '123456';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const doseOverdueSweepEnabled = (process.env.DOSE_OVERDUE_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';
const doseOverdueSweepIntervalMs = Math.max(60_000, Number(process.env.DOSE_OVERDUE_SWEEP_INTERVAL_MS || 5 * 60_000));

app.use(cors({ origin: webOrigin, credentials: true }));
app.use('/payments/razorpay-webhook', express.raw({ type: 'application/json' }));
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

function logAuthEvent(event: 'staff_login_success' | 'staff_login_failure', details: Record<string, unknown>) {
  console.info(`[auth] ${event}`, {
    at: new Date().toISOString(),
    ...details
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
  const result = await prisma.medicineDoseEvent.updateMany({
    where: {
      status: DoseEventStatus.PENDING,
      scheduledFor: { lt: now }
    },
    data: {
      status: DoseEventStatus.MISSED
    }
  });

  if (result.count > 0) {
    console.info(`[scheduler] Marked ${result.count} overdue dose event(s) as MISSED`);
  }
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
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: {
          select: {
            specialty: true,
            registrationNo: true,
            isAvailable: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    res.json({ profile });
  })
);

app.put(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        mobile: z.string().min(8).optional().or(z.literal('')),
        specialty: z.string().min(2),
        registrationNo: z.string().optional().or(z.literal('')),
        isAvailable: z.boolean().optional().default(true)
      })
      .parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: body.name,
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
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: {
          select: {
            specialty: true,
            registrationNo: true,
            isAvailable: true
          }
        }
      }
    });

    res.json({ profile: updated });
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

    res.json({
      message: 'Development reset token generated.',
      resetToken: token
    });
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

app.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

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
      consultations,
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

    res.status(201).json({ doctor });
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
        intakeAnswers: z.record(z.string(), z.string().min(1))
      })
      .parse(req.body);

    const disease = await prisma.disease.findUniqueOrThrow({ where: { id: body.diseaseId } });
    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        intakeAnswers: body.intakeAnswers,
        payment: {
          create: {
            amountInPaise: disease.feeInPaise,
            status: PaymentStatus.CREATED
          }
        }
      },
      include: includeConsultationRelations()
    });

    res.status(201).json({ consultation });
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

    res.json({ consultations });
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

    res.json({ consultation });
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
      include: includeConsultationRelations()
    });

    res.json({ consultation });
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
      select: { id: true, assignedDoctorId: true }
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

    res.json({ prescriptions });
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

    res.json({ consultation: updated });
  })
);

app.post(
  '/payments/:consultationId/create-order',
  asyncRoute(async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Supabase service role is not configured.' });
    }

    const body = z.object({ patientId: z.string().uuid() }).parse(req.body);
    const consultationId = routeParam(req, 'consultationId');

    const { data: consultation, error: consultationError } = await supabaseAdmin
      .from('consultations')
      .select('id, patient_id, payments(id, amount_in_paise, status)')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    if (consultation.patient_id !== body.patientId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const payment = Array.isArray(consultation.payments) ? consultation.payments[0] : consultation.payments;
    if (!payment) {
      return res.status(400).json({ message: 'Payment record is missing for this consultation.' });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({ message: 'Payment is already completed.' });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: payment.amount_in_paise,
      currency: 'INR',
      receipt: consultation.id,
      notes: {
        consultationId: consultation.id,
        patientId: body.patientId
      }
    });

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({ provider_order_id: order.id, status: 'CREATED' })
      .eq('id', payment.id);

    if (paymentError) {
      return res.status(500).json({ message: paymentError.message });
    }

    res.json({
      orderId: order.id,
      amountInPaise: payment.amount_in_paise,
      currency: 'INR',
      razorpayKeyId
    });
  })
);

app.post(
  '/payments/:consultationId/verify',
  asyncRoute(async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Supabase service role is not configured.' });
    }

    const body = z
      .object({
        patientId: z.string().uuid(),
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1)
      })
      .parse(req.body);
    const consultationId = routeParam(req, 'consultationId');

    const { data: consultation, error: consultationError } = await supabaseAdmin
      .from('consultations')
      .select('id, patient_id, payments(id, provider_order_id)')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    if (consultation.patient_id !== body.patientId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const payment = Array.isArray(consultation.payments) ? consultation.payments[0] : consultation.payments;
    if (!payment || payment.provider_order_id !== body.razorpayOrderId) {
      return res.status(400).json({ message: 'Payment order does not match consultation.' });
    }

    if (!verifyRazorpaySignature(body)) {
      return res.status(400).json({ message: 'Invalid Razorpay signature.' });
    }

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'PAID',
        provider_payment_id: body.razorpayPaymentId
      })
      .eq('id', payment.id);

    if (paymentError) {
      return res.status(500).json({ message: paymentError.message });
    }

    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({ status: 'PAID' })
      .eq('id', consultation.id);

    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    res.json({ ok: true });
  })
);

app.post(
  '/payments/razorpay-webhook',
  asyncRoute(async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Supabase service role is not configured.' });
    }

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

    const { data: payment, error: paymentLookupError } = await supabaseAdmin
      .from('payments')
      .select('id, consultation_id')
      .eq('provider_order_id', paymentEntity.order_id)
      .single();

    if (paymentLookupError || !payment) {
      return res.status(404).json({ message: 'Payment record not found for Razorpay order.' });
    }

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'PAID',
        provider_payment_id: paymentEntity.id
      })
      .eq('id', payment.id);

    if (paymentError) {
      return res.status(500).json({ message: paymentError.message });
    }

    const { error: consultationError } = await supabaseAdmin
      .from('consultations')
      .update({ status: 'PAID' })
      .eq('id', payment.consultation_id);

    if (consultationError) {
      return res.status(500).json({ message: consultationError.message });
    }

    res.json({ ok: true });
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
  if (!doseOverdueSweepEnabled) {
    console.log('[scheduler] Overdue dose sweep disabled');
    return;
  }

  console.log(`[scheduler] Overdue dose sweep enabled (interval: ${doseOverdueSweepIntervalMs}ms)`);
  void markOverdueDosesAsMissed().catch((error) => {
    console.error('[scheduler] Initial overdue sweep failed', error);
  });

  const timer = setInterval(() => {
    void markOverdueDosesAsMissed().catch((error) => {
      console.error('[scheduler] Overdue sweep failed', error);
    });
  }, doseOverdueSweepIntervalMs);
  timer.unref();
});
