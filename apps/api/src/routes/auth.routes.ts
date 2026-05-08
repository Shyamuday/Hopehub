import bcrypt from 'bcryptjs';
import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired } from '../auth.js';
import { asyncRoute } from '../middleware/async-route.js';
import { prisma } from '../db.js';
import { supabaseAdmin } from '../supabase.js';
import { devOtp, googleClient, googleClientId } from '../server/config.js';
import { publicUserSelect } from '../db/prisma-includes.js';
import { logAuthEvent } from '../lib/auth-log.js';
import { hashToken, randomToken } from '../lib/crypto-tokens.js';
import { toAuthResponse } from '../domain/auth-response.js';

export function registerAuthRoutes(app: express.Application) {
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
    '/auth/staff-login',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: {
          ...publicUserSelect,
          passwordHash: true,
          isActive: true,
          staffProfile: { select: { isSuperAdmin: true, permissionCodes: true } }
        }
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

      const { passwordHash, isActive, staffProfile, ...rest } = user;
      void passwordHash;
      void isActive;
      const staffSummary =
        rest.role === Role.ADMIN
          ? staffProfile
            ? {
                isSuperAdmin: staffProfile.isSuperAdmin,
                permissionCodes: staffProfile.permissionCodes
              }
            : null
          : undefined;
      const safeUser =
        rest.role === Role.ADMIN ? { ...rest, staffProfile: staffSummary ?? null } : rest;
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

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: resetToken.userId },
        select: {
          ...publicUserSelect,
          staffProfile: { select: { isSuperAdmin: true, permissionCodes: true } }
        }
      });
      const { staffProfile, ...rest } = user;
      const responseUser =
        rest.role === Role.ADMIN
          ? {
              ...rest,
              staffProfile: staffProfile
                ? {
                    isSuperAdmin: staffProfile.isSuperAdmin,
                    permissionCodes: staffProfile.permissionCodes
                  }
                : null
            }
          : rest;

      res.json(toAuthResponse(responseUser));
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

      const whereClause = email ? { email } : mobile ? { mobile } : null;

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
    const u = req.user!;
    if (u.role === Role.ADMIN) {
      res.json({
        user: {
          id: u.id,
          name: u.name,
          role: u.role,
          email: u.email,
          mobile: u.mobile,
          staffProfile: u.staffProfile ?? null
        }
      });
      return;
    }
    res.json({
      user: {
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        mobile: u.mobile
      }
    });
  });
}
