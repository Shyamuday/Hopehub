import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { getMailTransporter, smtpFrom, supportReplyTo } from '../../services/mail.js';
import { createPatientRecord } from '../../services/patient-identity.js';
import {
  asyncRoute,
  publicUserSelect,
  logAuthEvent,
  hashToken,
  randomToken
} from '../../utils/helpers.js';
import { webOrigin } from './shared.js';
import { issueAuthSession, revokeAllAuthSessionsForUser } from '../../services/auth-sessions.js';
import { recordAuthProcess } from '../../services/auth-process-log.js';
import { createEmailVerificationToken } from '../../services/email-verification.js';
import {
  attachReferralOnSignup,
  isActivePatientReferralCode
} from '../../services/referral-codes.js';

export function registerAuthPatientRoutes(router: Router) {
  // ─── Patient register / login-password / forgot ────────────────────────────────

  router.post(
    '/auth/patient-register',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2).optional(),
          email: z.string().email(),
          password: z.string().min(8),
          referralCode: z.string().min(3).max(32).optional()
        })
        .parse(req.body);

      const email = body.email.trim().toLowerCase();
      const name = body.name?.trim() || 'Patient';
      const existingUser = await prisma.user.findFirst({
        where: { email, role: Role.PATIENT },
        select: { id: true, role: true, passwordHash: true }
      });
      if (existingUser?.passwordHash) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'signup',
          status: 'failure',
          identifier: email,
          reason: 'patient_account_exists',
          req
        });
        return res.status(409).json({
          code: 'PATIENT_ACCOUNT_EXISTS',
          message: 'This email is already registered. Please log in instead.'
        });
      }

      if (
        !existingUser &&
        body.referralCode &&
        !(await isActivePatientReferralCode(body.referralCode))
      ) {
        return res.status(400).json({
          code: 'INVALID_REFERRAL_CODE',
          message: 'This referral code is not valid or is no longer active.'
        });
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      let user;
      try {
        user = existingUser
          ? await prisma.user.update({
              where: { id: existingUser.id },
              data: { name, passwordHash },
              select: publicUserSelect
            })
          : await createPatientRecord({ name, email, passwordHash });
      } catch (error) {
        if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
          await recordAuthProcess({
            processType: 'patient_password',
            step: 'signup',
            status: 'failure',
            identifier: email,
            reason: 'patient_account_exists',
            req
          });
          return res.status(409).json({
            code: 'PATIENT_ACCOUNT_EXISTS',
            message: 'This email is already registered. Please log in instead.'
          });
        }
        if (error instanceof Error && error.message === 'EMAIL_USED_BY_OTHER_ROLE') {
          await recordAuthProcess({
            processType: 'patient_password',
            step: 'signup',
            status: 'failure',
            identifier: email,
            reason: 'email_used_by_other_role',
            req
          });
          return res.status(409).json({
            code: 'EMAIL_REGISTERED_WITH_DIFFERENT_ROLE',
            message: 'This email is already registered with another Hope Hub role.'
          });
        }
        throw error;
      }

      if (!existingUser && body.referralCode) {
        await attachReferralOnSignup(user.id, body.referralCode);
      }

      logAuthEvent('patient_login', { userId: user.id, event: 'register' });
      const verification = await createEmailVerificationToken({
        userId: user.id,
        email,
        portal: 'patient',
        req
      });
      await recordAuthProcess({
        processType: 'patient_password',
        step: 'signup',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: user.id, emailVerificationSent: verification.sent }
      });
      res.status(201).json({
        ...(await issueAuthSession({ ...user, role: Role.PATIENT }, req)),
        emailVerificationRequired: true,
        emailVerificationSent: verification.sent,
        ...(verification.devVerifyUrl ? { devVerifyUrl: verification.devVerifyUrl } : {})
      });
    })
  );

  router.post(
    '/auth/patient-login-password',
    asyncRoute(async (req, res) => {
      const body = z
        .object({ identifier: z.string().email(), password: z.string().min(1) })
        .parse(req.body);
      const email = body.identifier.trim().toLowerCase();
      const candidates = await prisma.user.findMany({
        where: { email, role: Role.PATIENT },
        select: { ...publicUserSelect, passwordHash: true, isActive: true, role: true }
      });

      const activePatients = candidates.filter((user) => user.isActive);
      if (activePatients.length && activePatients.every((user) => !user.passwordHash)) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'login',
          status: 'blocked',
          identifier: email,
          reason: 'password_not_set',
          req
        });
        return res.status(409).json({
          code: 'PATIENT_PASSWORD_NOT_SET',
          message: 'Password is not set for this account. Use email code or reset password.'
        });
      }

      const matches = [];
      for (const user of candidates) {
        if (!user.passwordHash || !user.isActive) continue;
        const isValid = await bcrypt.compare(body.password, user.passwordHash);
        if (isValid) matches.push(user);
      }

      if (!matches.length) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'login',
          status: 'failure',
          identifier: email,
          reason: 'invalid_credentials',
          req
        });
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      if (matches.length > 1) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'login',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'patient_selection_required', patientCount: matches.length }
        });
        return res.json({
          requiresPatientSelection: true,
          patients: matches.map(({ passwordHash: _ph, isActive: _ia, role: _r, ...safe }) => safe)
        });
      }

      const { passwordHash: _ph, isActive: _ia, ...safeUser } = matches[0];
      logAuthEvent('patient_login', { userId: safeUser.id, event: 'password_login' });
      await recordAuthProcess({
        processType: 'patient_password',
        step: 'login',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: safeUser.id }
      });
      res.json(await issueAuthSession(safeUser, req));
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

      const email = z.string().email().parse(body.identifier).trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: {
          id: body.patientId,
          role: Role.PATIENT,
          email
        },
        select: { ...publicUserSelect, passwordHash: true, isActive: true }
      });

      if (user?.isActive && !user.passwordHash) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'select',
          status: 'blocked',
          identifier: email,
          reason: 'password_not_set',
          req,
          metadata: { patientId: body.patientId }
        });
        return res.status(409).json({
          code: 'PATIENT_PASSWORD_NOT_SET',
          message: 'Password is not set for this account. Use email code or reset password.'
        });
      }

      if (!user?.passwordHash || !user.isActive) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'select',
          status: 'failure',
          identifier: email,
          reason: 'invalid_credentials',
          req,
          metadata: { patientId: body.patientId }
        });
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isValid = await bcrypt.compare(body.password, user.passwordHash);
      if (!isValid) {
        await recordAuthProcess({
          processType: 'patient_password',
          step: 'select',
          status: 'failure',
          identifier: email,
          reason: 'invalid_credentials',
          req,
          metadata: { patientId: body.patientId }
        });
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const { passwordHash: _ph, isActive: _ia, ...safeUser } = user;
      logAuthEvent('patient_login', { userId: safeUser.id, event: 'password_select' });
      await recordAuthProcess({
        processType: 'patient_password',
        step: 'select',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: safeUser.id }
      });
      res.json(await issueAuthSession(safeUser, req));
    })
  );

  router.post(
    '/auth/patient-forgot-password',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email() }).parse(req.body);
      const email = body.email.trim().toLowerCase();
      const mailer = getMailTransporter();
      if (!mailer && process.env.NODE_ENV === 'production') {
        await recordAuthProcess({
          processType: 'patient_password_reset',
          step: 'request',
          status: 'blocked',
          identifier: email,
          reason: 'email_delivery_not_configured',
          req
        });
        return res.status(503).json({ message: 'Email delivery is not configured.' });
      }

      const user = await prisma.user.findFirst({
        where: { email, role: Role.PATIENT },
        select: { id: true, role: true, email: true, isActive: true }
      });

      if (!user || !user.isActive || user.role !== Role.PATIENT) {
        await recordAuthProcess({
          processType: 'patient_password_reset',
          step: 'request',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'generic_no_active_patient' }
        });
        return res.json({ message: 'If the account exists, a reset link has been sent.' });
      }

      const token = randomToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        }
      });

      const resetUrl = `${webOrigin}/auth/reset?token=${token}`;
      if (mailer) {
        await mailer.sendMail({
          from: smtpFrom,
          replyTo: supportReplyTo,
          to: email,
          subject: 'Reset your HopeHub Care password',
          html: `<p>Click the link below to reset your password. It expires in 30 minutes.</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`
        });
      } else if (process.env.NODE_ENV !== 'production') {
        console.log(`[dev] Patient password reset token for ${email}: ${token}`);
        console.log(`[dev] Reset URL: ${resetUrl}`);
      }

      await recordAuthProcess({
        processType: 'patient_password_reset',
        step: 'request',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: user.id, delivery: mailer ? 'email' : 'dev' }
      });
      res.json({ message: 'If the account exists, a reset link has been sent.' });
    })
  );

  router.post(
    '/auth/patient-reset-password',
    asyncRoute(async (req, res) => {
      const body = z
        .object({ token: z.string().min(20), password: z.string().min(8) })
        .parse(req.body);
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(body.token) },
        include: { user: { select: { ...publicUserSelect, role: true } } }
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        await recordAuthProcess({
          processType: 'patient_password_reset',
          step: 'reset',
          status: 'failure',
          identifier: 'unknown',
          reason: !resetToken
            ? 'token_not_found'
            : resetToken.usedAt
              ? 'token_used'
              : 'token_expired',
          req
        });
        return res.status(400).json({ message: 'Invalid or expired reset token.' });
      }

      if (resetToken.user.role !== Role.PATIENT) {
        await recordAuthProcess({
          processType: 'patient_password_reset',
          step: 'reset',
          status: 'failure',
          identifier: resetToken.user.email || resetToken.userId,
          reason: 'wrong_role',
          req
        });
        return res.status(400).json({ message: 'Invalid reset token.' });
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      await prisma.$transaction([
        prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() }
        })
      ]);
      await revokeAllAuthSessionsForUser(resetToken.userId);

      const { role: _r, ...safeUser } = resetToken.user;
      await recordAuthProcess({
        processType: 'patient_password_reset',
        step: 'reset',
        status: 'success',
        identifier: resetToken.user.email || resetToken.userId,
        req,
        metadata: { userId: resetToken.userId }
      });
      res.json(await issueAuthSession({ ...safeUser, role: resetToken.user.role }, req));
    })
  );
}
