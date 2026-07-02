import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { generateOtp, storeOtp, verifyOtp, sendOtpSms, devOtp, isProduction } from '../services/otp.js';
import { getMailTransporter, smtpFrom } from '../services/mail.js';
import {
  asyncRoute,
  publicUserSelect,
  toAuthResponse,
  logAuthEvent,
  hashToken,
  randomToken
} from '../utils/helpers.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const webOrigin = SERVER_CONFIG.ORIGINS.WEB;

export const router = Router();

// ─── Health check ──────────────────────────────────────────────────────────────

router.get(
  '/health',
  asyncRoute(async (_req, res) => {
    let dbOk = false;
    let dbLatencyMs: number | undefined;
    try {
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
      dbOk = true;
    } catch { /* DB unreachable */ }

    const status = dbOk ? 200 : 503;
    res.status(status).json({
      ok: dbOk,
      service: 'clinic-api',
      database: dbOk ? 'connected' : 'unreachable',
      dbLatencyMs,
      timestamp: new Date().toISOString()
    });
  })
);

// ─── OTP auth ──────────────────────────────────────────────────────────────────

router.post(
  '/auth/request-otp',
  asyncRoute(async (req, res) => {
    const body = z.object({ mobile: z.string().min(8) }).parse(req.body);
    const otp = isProduction ? generateOtp() : devOtp;
    storeOtp(body.mobile, otp);
    if (isProduction) {
      await sendOtpSms(body.mobile, otp);
    } else {
      console.info(`[otp] DEV — OTP for ${body.mobile}: ${otp}`);
    }
    res.json({ message: 'OTP sent.' });
  })
);

router.post(
  '/auth/patient-login',
  asyncRoute(async (req, res) => {
    const body = z.object({ mobile: z.string().min(8), otp: z.string().min(4) }).parse(req.body);

    if (!verifyOtp(body.mobile, body.otp)) {
      return res.status(401).json({ message: 'Invalid or expired OTP.' });
    }

    let user = await prisma.user.findFirst({
      where: { mobile: body.mobile },
      select: publicUserSelect
    });

    if (!user) {
      user = await prisma.user.create({
        data: { name: body.mobile, mobile: body.mobile, role: Role.PATIENT },
        select: publicUserSelect
      });
    }

    logAuthEvent('patient_login', { userId: user.id, mobile: body.mobile });
    res.json(toAuthResponse(user));
  })
);

// ─── Doctor enrollment & profile ───────────────────────────────────────────────

router.post(
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
        doctorProfile: { create: { specialty: body.specialty, registrationNo: body.registrationNo } }
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

router.get(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: { select: { specialty: true, registrationNo: true, isAvailable: true } }
      }
    });

    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });
    res.json({ profile });
  })
);

router.put(
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
            create: { specialty: body.specialty, registrationNo: body.registrationNo || null, isAvailable: body.isAvailable },
            update: { specialty: body.specialty, registrationNo: body.registrationNo || null, isAvailable: body.isAvailable }
          }
        }
      },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: { select: { specialty: true, registrationNo: true, isAvailable: true } }
      }
    });

    res.json({ profile: updated });
  })
);

// ─── Staff login ───────────────────────────────────────────────────────────────

router.post(
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

    const { passwordHash: _ph, isActive: _ia, ...safeUser } = user;
    logAuthEvent('staff_login_success', { userId: safeUser.id, role: safeUser.role });
    res.json(toAuthResponse(safeUser));
  })
);

// ─── Forgot / reset password (staff) ──────────────────────────────────────────

router.post(
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
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Password reset token for ${body.email}: ${token}`);
    }

    res.json({ message: 'If the account exists, reset instructions have been sent.' });
  })
);

router.post(
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

// ─── Google OAuth ──────────────────────────────────────────────────────────────

router.post(
  '/auth/google',
  asyncRoute(async (req, res) => {
    const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
    if (!googleClient || !googleClientId) {
      return res.status(503).json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: body.idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: 'Google account email is required' });
    }

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name || payload.email },
      create: { name: payload.name || payload.email, email: payload.email, role: Role.PATIENT },
      select: publicUserSelect
    });

    res.json(toAuthResponse(user));
  })
);

// ─── Patient register / login-password / forgot ────────────────────────────────

router.post(
  '/auth/patient-register',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email().optional().or(z.literal('')),
        mobile: z.string().min(8).optional().or(z.literal('')),
        password: z.string().min(8)
      })
      .parse(req.body);

    const email = body.email || null;
    const mobile = body.mobile || null;
    if (!email && !mobile) {
      return res.status(400).json({ message: 'Email or mobile is required.' });
    }

    const existing = await prisma.user.findFirst({
      where: email ? { email } : { mobile: mobile! },
      select: { id: true, passwordHash: true }
    });

    if (existing?.passwordHash) {
      return res.status(409).json({ message: 'Account already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { name: body.name, passwordHash }, select: publicUserSelect })
      : await prisma.user.create({
          data: { name: body.name, email, mobile, passwordHash, role: Role.PATIENT },
          select: publicUserSelect
        });

    logAuthEvent('patient_login', { userId: user.id, event: 'register' });
    res.status(201).json(toAuthResponse(user));
  })
);

router.post(
  '/auth/patient-login-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ identifier: z.string().min(3), password: z.string().min(1) }).parse(req.body);
    const isEmail = body.identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: body.identifier } : { mobile: body.identifier },
      select: { ...publicUserSelect, passwordHash: true, isActive: true, role: true }
    });

    if (!user || !user.passwordHash || user.role !== Role.PATIENT) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials.' });

    const { passwordHash: _ph, isActive: _ia, ...safeUser } = user;
    logAuthEvent('patient_login', { userId: safeUser.id, event: 'password_login' });
    res.json(toAuthResponse(safeUser));
  })
);

router.post(
  '/auth/patient-forgot-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, role: true, email: true, isActive: true }
    });

    if (!user || !user.isActive || user.role !== Role.PATIENT) {
      return res.json({ message: 'If the account exists, a reset link has been sent.' });
    }

    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
    });

    const resetUrl = `${webOrigin}/auth/reset?token=${token}`;
    const mailer = getMailTransporter();
    if (mailer) {
      await mailer.sendMail({
        from: smtpFrom,
        to: body.email,
        subject: 'Reset your Vitalis Care password',
        html: `<p>Click the link below to reset your password. It expires in 30 minutes.</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Patient password reset token for ${body.email}: ${token}`);
      console.log(`[dev] Reset URL: ${resetUrl}`);
    }

    res.json({ message: 'If the account exists, a reset link has been sent.' });
  })
);

router.post(
  '/auth/patient-reset-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ token: z.string().min(20), password: z.string().min(8) }).parse(req.body);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
      include: { user: { select: { ...publicUserSelect, role: true } } }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    if (resetToken.user.role !== Role.PATIENT) {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } })
    ]);

    const { role: _r, ...safeUser } = resetToken.user;
    res.json(toAuthResponse({ ...safeUser, role: resetToken.user.role }));
  })
);

// ─── Patient profile ───────────────────────────────────────────────────────────

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

router.get(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        allergies: true,
        currentMedications: true,
        chronicConditions: true
      }
    });
    res.json({ profile: user });
  })
);

router.put(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(100),
        allergies: z.string().max(1000).optional(),
        currentMedications: z.string().max(1000).optional(),
        chronicConditions: z.string().max(1000).optional()
      })
      .parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: { id: true, name: true, email: true, mobile: true, allergies: true, currentMedications: true, chronicConditions: true }
    });

    res.json({ profile: updated });
  })
);
