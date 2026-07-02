import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { getMailTransporter, smtpFrom } from '../../services/mail.js';
import { createPatientRecord, normalizeMobile } from '../../services/patient-identity.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent, hashToken, randomToken } from '../../utils/helpers.js';
import { webOrigin } from './shared.js';

export function registerAuthPatientRoutes(router: Router) {
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
    const mobile = normalizeMobile(body.mobile);
    if (!email && !mobile) {
      return res.status(400).json({ message: 'Email or mobile is required.' });
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email, role: Role.PATIENT },
        select: { id: true, passwordHash: true }
      });
      if (existingEmail?.passwordHash) {
        return res.status(409).json({ message: 'Account already exists. Please log in.' });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    let user;
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email, role: Role.PATIENT },
        select: { id: true }
      });
      user = existingEmail
        ? await prisma.user.update({
            where: { id: existingEmail.id },
            data: { name: body.name, passwordHash, mobile: mobile ?? undefined },
            select: publicUserSelect
          })
        : await createPatientRecord({ name: body.name, email, mobile, passwordHash });
    } else {
      user = await createPatientRecord({ name: body.name, mobile, passwordHash });
    }

    logAuthEvent('patient_login', { userId: user.id, event: 'register' });
    res.status(201).json(toAuthResponse({ ...user, role: Role.PATIENT }));
  })
);

router.post(
  '/auth/patient-login-password',
  asyncRoute(async (req, res) => {
    const body = z.object({ identifier: z.string().min(3), password: z.string().min(1) }).parse(req.body);
    const isEmail = body.identifier.includes('@');
    const candidates = await prisma.user.findMany({
      where: isEmail
        ? { email: body.identifier, role: Role.PATIENT }
        : { mobile: normalizeMobile(body.identifier) ?? body.identifier, role: Role.PATIENT },
      select: { ...publicUserSelect, passwordHash: true, isActive: true, role: true }
    });

    const matches = [];
    for (const user of candidates) {
      if (!user.passwordHash || !user.isActive) continue;
      const isValid = await bcrypt.compare(body.password, user.passwordHash);
      if (isValid) matches.push(user);
    }

    if (!matches.length) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (matches.length > 1) {
      return res.json({
        requiresPatientSelection: true,
        patients: matches.map(({ passwordHash: _ph, isActive: _ia, role: _r, ...safe }) => safe)
      });
    }

    const { passwordHash: _ph, isActive: _ia, ...safeUser } = matches[0];
    logAuthEvent('patient_login', { userId: safeUser.id, event: 'password_login' });
    res.json(toAuthResponse(safeUser));
  })
);

router.post(
  '/auth/patient-login/password-select',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        identifier: z.string().min(3),
        password: z.string().min(1),
        patientId: z.string().min(1)
      })
      .parse(req.body);

    const isEmail = body.identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: {
        id: body.patientId,
        role: Role.PATIENT,
        ...(isEmail
          ? { email: body.identifier }
          : { mobile: normalizeMobile(body.identifier) ?? body.identifier })
      },
      select: { ...publicUserSelect, passwordHash: true, isActive: true }
    });

    if (!user?.passwordHash || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const { passwordHash: _ph, isActive: _ia, ...safeUser } = user;
    logAuthEvent('patient_login', { userId: safeUser.id, event: 'password_select' });
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

}
