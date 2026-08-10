import { Router, type Request } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db.js';
import { getMailTransporter, smtpFrom } from '../../services/mail.js';
import {
  asyncRoute,
  publicUserSelect,
  logAuthEvent,
  hashToken,
  randomToken
} from '../../utils/helpers.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';
import {
  sessionPayloadForStoreStaff,
  sessionPayloadForUser
} from '../../constants/rbac-helpers.js';
import { attachStaffProfile } from '../../staff-profile.js';
import { signStoreToken } from '../store/shared.js';
import { STORE_ROLES } from '../../constants/store-api-routes.constants.js';
import { webOrigin } from './shared.js';
import {
  generateOtp,
  isProduction,
  sendOtpEmail,
  storeOtp,
  verifyOtp
} from '../../services/otp.js';
import { googleClient, googleClientId } from './shared.js';
import { recordAuthProcess } from '../../services/auth-process-log.js';
import { issueAuthSession, revokeAllAuthSessionsForUser } from '../../services/auth-sessions.js';

const staffOtpKey = (email: string) => `staff:${email.trim().toLowerCase()}`;
const googleStaffUserSelect = { ...publicUserSelect, isActive: true, authProvider: true } as const;
type GoogleStaffPayload = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  hd?: string;
  iss?: string;
};
type ActiveStaffAccount =
  | {
      kind: 'user';
      user: Prisma.UserGetPayload<{ select: typeof staffUserSelect }>;
    }
  | {
      kind: 'storeStaff';
      staff: Prisma.StoreStaffGetPayload<{
        include: { store: { select: { id: true; name: true } } };
      }>;
    };

const staffUserSelect = { ...publicUserSelect, isActive: true } as const;

async function findActiveStaffAccount(email: string): Promise<ActiveStaffAccount | null> {
  const user = await prisma.user.findFirst({
    where: { email, role: { not: Role.PATIENT } },
    select: staffUserSelect
  });

  if (user && user.role !== Role.PATIENT) {
    return { kind: 'user', user };
  }

  const staff = await prisma.storeStaff.findFirst({
    where: { email, isActive: true },
    include: { store: { select: { id: true, name: true } } }
  });

  return staff ? { kind: 'storeStaff', staff } : null;
}

async function buildStaffLoginResponse(email: string, req?: Request) {
  const account = await findActiveStaffAccount(email);
  if (!account) return null;

  if (account.kind === 'storeStaff') {
    const staff = account.staff;
    const token = signStoreToken({
      staffId: staff.id,
      storeId: staff.storeId,
      role: staff.role as typeof STORE_ROLES.MANAGER | typeof STORE_ROLES.STAFF,
      name: staff.name
    });

    const session = sessionPayloadForStoreStaff({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      staffCode: staff.staffCode,
      storeId: staff.storeId,
      storeName: staff.store.name
    });

    logAuthEvent('staff_login_success', {
      storeStaffId: staff.id,
      role: staff.role,
      method: 'email_otp'
    });
    return { token, ...session };
  }

  const user = account.user;
  if (!user.isActive && user.role === Role.DOCTOR) {
    return { errorStatus: 403 as const, message: 'Doctor account is pending admin approval.' };
  }
  if (!user.isActive) {
    return { errorStatus: 401 as const, message: 'Invalid credentials' };
  }

  logAuthEvent('staff_login_success', { userId: user.id, role: user.role, method: 'email_otp' });
  if (user.role === Role.DOCTOR) {
    void trackProductEvent({
      name: PRODUCT_EVENTS.DOCTOR_LOGIN,
      actorId: user.id,
      actorRole: Role.DOCTOR,
      properties: { method: 'email_otp' }
    });
  }
  const withProfile = await attachStaffProfile(user);
  return { ...(await issueAuthSession(withProfile, req)), ...sessionPayloadForUser(withProfile) };
}

async function buildGoogleStaffLoginResponse(payload: GoogleStaffPayload, req?: Request) {
  if (!payload.email || !payload.sub) return null;
  if (payload.email_verified !== true) {
    return { errorStatus: 401 as const, message: 'Google email is not verified.' };
  }

  const now = new Date();
  const email = payload.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email, role: { not: Role.PATIENT } },
    select: googleStaffUserSelect
  });

  if (!user || user.role === Role.PATIENT) {
    return {
      errorStatus: 401 as const,
      message: 'No approved provider/admin account found for this Google email.'
    };
  }
  if (!user.isActive && user.role === Role.DOCTOR) {
    return { errorStatus: 403 as const, message: 'Doctor account is pending admin approval.' };
  }
  if (!user.isActive) {
    return { errorStatus: 401 as const, message: 'Invalid credentials' };
  }

  const existingIdentity = await prisma.userIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'GOOGLE',
        providerUserId: payload.sub
      }
    },
    select: { userId: true }
  });
  if (existingIdentity && existingIdentity.userId !== user.id) {
    return {
      errorStatus: 409 as const,
      message: 'This Google account is already linked to another Hope Hub account.'
    };
  }

  const rawProfile = {
    sub: payload.sub,
    email,
    emailVerified: payload.email_verified === true,
    name: payload.name || null,
    givenName: payload.given_name || null,
    familyName: payload.family_name || null,
    picture: payload.picture || null,
    hostedDomain: payload.hd || null,
    issuer: payload.iss || null
  } satisfies Prisma.InputJsonObject;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      authProvider: user.authProvider || 'GOOGLE',
      lastLoginAt: now,
      lastLoginMethod: 'GOOGLE',
      externalAvatarUrl: payload.picture || null
    },
    select: publicUserSelect
  });

  await prisma.userIdentity.upsert({
    where: {
      provider_providerUserId: {
        provider: 'GOOGLE',
        providerUserId: payload.sub
      }
    },
    create: {
      userId: updated.id,
      provider: 'GOOGLE',
      providerUserId: payload.sub,
      email,
      emailVerified: true,
      displayName: payload.name || updated.name,
      avatarUrl: payload.picture || null,
      rawProfile,
      lastLoginAt: now
    },
    update: {
      userId: updated.id,
      email,
      emailVerified: true,
      displayName: payload.name || updated.name,
      avatarUrl: payload.picture || null,
      rawProfile,
      lastLoginAt: now
    }
  });

  logAuthEvent('staff_login_success', { userId: updated.id, role: updated.role, method: 'google' });
  if (updated.role === Role.DOCTOR) {
    void trackProductEvent({
      name: PRODUCT_EVENTS.DOCTOR_LOGIN,
      actorId: updated.id,
      actorRole: Role.DOCTOR,
      properties: { method: 'google' }
    });
  }

  const withProfile = await attachStaffProfile(updated);
  return { ...(await issueAuthSession(withProfile, req)), ...sessionPayloadForUser(withProfile) };
}

export function registerAuthStaffRoutes(router: Router) {
  // ─── Staff login ───────────────────────────────────────────────────────────────

  router.post(
    '/auth/request-staff-otp',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email() }).parse(req.body);
      const email = body.email.trim().toLowerCase();
      const account = await findActiveStaffAccount(email);

      if (!account) {
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'request',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'generic_no_account' }
        });
        return res.json({ message: 'If the staff account exists, an OTP has been sent.' });
      }

      if (account.kind === 'user' && !account.user.isActive) {
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'request',
          status: account.user.role === Role.DOCTOR ? 'blocked' : 'failure',
          identifier: email,
          reason:
            account.user.role === Role.DOCTOR ? 'doctor_pending_approval' : 'inactive_account',
          req,
          metadata: { role: account.user.role, userId: account.user.id }
        });
        return res.status(account.user.role === Role.DOCTOR ? 403 : 401).json({
          message:
            account.user.role === Role.DOCTOR
              ? 'Doctor account is pending admin approval.'
              : 'Invalid credentials'
        });
      }

      if (isProduction && !getMailTransporter()) {
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'request',
          status: 'blocked',
          identifier: email,
          reason: 'email_delivery_not_configured',
          req
        });
        return res.status(503).json({ message: 'Email delivery is not configured.' });
      }

      const otp = isProduction ? generateOtp() : process.env.DEV_OTP || '123456';
      await storeOtp(staffOtpKey(email), otp);
      if (isProduction) {
        await sendOtpEmail(email, otp);
      } else {
        console.info(`[otp] DEV — Staff OTP for ${email}: ${otp}`);
      }

      await recordAuthProcess({
        processType: 'staff_email_otp',
        step: 'request',
        status: 'success',
        identifier: email,
        req,
        metadata: { delivery: isProduction ? 'email' : 'dev', kind: account.kind }
      });
      res.json({ message: 'OTP sent.', ...(!isProduction ? { devOtp: otp } : {}) });
    })
  );

  router.post(
    '/auth/staff-login-otp',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email(), otp: z.string().min(4) }).parse(req.body);
      const email = body.email.trim().toLowerCase();

      if (!(await verifyOtp(staffOtpKey(email), body.otp))) {
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'verify',
          status: 'failure',
          identifier: email,
          reason: 'invalid_or_expired_otp',
          req
        });
        return res.status(401).json({ message: 'Invalid or expired OTP.' });
      }

      const response = await buildStaffLoginResponse(email, req);
      if (!response) {
        logAuthEvent('staff_login_failure', {
          email,
          reason: 'invalid_credentials',
          method: 'email_otp'
        });
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'verify',
          status: 'failure',
          identifier: email,
          reason: 'invalid_credentials',
          req
        });
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if ('errorStatus' in response) {
        const status = response.errorStatus ?? 401;
        await recordAuthProcess({
          processType: 'staff_email_otp',
          step: 'verify',
          status: status === 403 ? 'blocked' : 'failure',
          identifier: email,
          reason: response.message,
          req
        });
        return res.status(status).json({ message: response.message });
      }

      await recordAuthProcess({
        processType: 'staff_email_otp',
        step: 'verify',
        status: 'success',
        identifier: email,
        req
      });
      res.json(response);
    })
  );

  router.post(
    '/auth/staff-login-google',
    asyncRoute(async (req, res) => {
      const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
      if (!googleClient || !googleClientId) {
        await recordAuthProcess({
          processType: 'staff_google',
          step: 'login',
          status: 'blocked',
          identifier: 'unknown',
          reason: 'google_not_configured',
          req
        });
        return res
          .status(503)
          .json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
      }

      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: body.idToken,
          audience: googleClientId
        });
      } catch {
        await recordAuthProcess({
          processType: 'staff_google',
          step: 'login',
          status: 'failure',
          identifier: 'unknown',
          reason: 'invalid_google_token',
          req
        });
        return res.status(401).json({ message: 'Invalid Google sign-in token.' });
      }
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        await recordAuthProcess({
          processType: 'staff_google',
          step: 'login',
          status: 'failure',
          identifier: payload?.email || 'unknown',
          reason: 'missing_google_email_or_subject',
          req
        });
        return res.status(401).json({ message: 'Google account email is required' });
      }

      const response = await buildGoogleStaffLoginResponse(payload as GoogleStaffPayload, req);
      if (!response) {
        logAuthEvent('staff_login_failure', {
          email: payload.email,
          reason: 'google_payload_missing_email',
          method: 'google'
        });
        await recordAuthProcess({
          processType: 'staff_google',
          step: 'login',
          status: 'failure',
          identifier: payload.email,
          reason: 'google_payload_missing_email',
          req
        });
        return res.status(401).json({ message: 'Google account email is required' });
      }
      if ('errorStatus' in response) {
        const status = response.errorStatus ?? 401;
        logAuthEvent('staff_login_failure', {
          email: payload.email,
          reason: response.message,
          method: 'google'
        });
        await recordAuthProcess({
          processType: 'staff_google',
          step: 'login',
          status: status === 403 ? 'blocked' : 'failure',
          identifier: payload.email,
          reason: response.message,
          req
        });
        return res.status(status).json({ message: response.message });
      }

      await recordAuthProcess({
        processType: 'staff_google',
        step: 'login',
        status: 'success',
        identifier: payload.email,
        req,
        metadata: { googleSubject: payload.sub }
      });
      res.json(response);
    })
  );

  router.post(
    '/auth/staff-login',
    asyncRoute(async (req, res) => {
      const body = z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .parse(req.body);
      const email = body.email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email, role: { not: Role.PATIENT } },
        select: { ...publicUserSelect, passwordHash: true, isActive: true }
      });

      if (!user?.passwordHash || user.role === Role.PATIENT) {
        const staff = await prisma.storeStaff.findFirst({
          where: { email, isActive: true },
          include: { store: { select: { id: true, name: true } } }
        });

        if (!staff) {
          logAuthEvent('staff_login_failure', { email, reason: 'invalid_credentials' });
          await recordAuthProcess({
            processType: 'staff_password',
            step: 'login',
            status: 'failure',
            identifier: email,
            reason: 'invalid_credentials',
            req
          });
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const staffValid = await bcrypt.compare(body.password, staff.pinHash);
        if (!staffValid) {
          logAuthEvent('staff_login_failure', { email, reason: 'invalid_credentials' });
          await recordAuthProcess({
            processType: 'staff_password',
            step: 'login',
            status: 'failure',
            identifier: email,
            reason: 'invalid_credentials',
            req,
            metadata: { kind: 'storeStaff' }
          });
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = signStoreToken({
          staffId: staff.id,
          storeId: staff.storeId,
          role: staff.role as typeof STORE_ROLES.MANAGER | typeof STORE_ROLES.STAFF,
          name: staff.name
        });

        const session = sessionPayloadForStoreStaff({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          staffCode: staff.staffCode,
          storeId: staff.storeId,
          storeName: staff.store.name
        });

        logAuthEvent('staff_login_success', { storeStaffId: staff.id, role: staff.role });
        await recordAuthProcess({
          processType: 'staff_password',
          step: 'login',
          status: 'success',
          identifier: email,
          req,
          metadata: { kind: 'storeStaff', storeStaffId: staff.id, role: staff.role }
        });
        return res.json({ token, ...session });
      }

      const isValid = await bcrypt.compare(body.password, user.passwordHash);
      if (!isValid) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'invalid_credentials'
        });
        await recordAuthProcess({
          processType: 'staff_password',
          step: 'login',
          status: 'failure',
          identifier: email,
          reason: 'invalid_credentials',
          req,
          metadata: { userId: user.id, role: user.role }
        });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.isActive && user.role === Role.DOCTOR) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'doctor_pending_approval'
        });
        await recordAuthProcess({
          processType: 'staff_password',
          step: 'login',
          status: 'blocked',
          identifier: email,
          reason: 'doctor_pending_approval',
          req,
          metadata: { userId: user.id, role: user.role }
        });
        return res.status(403).json({ message: 'Doctor account is pending admin approval.' });
      }

      if (!user.isActive) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'inactive_account'
        });
        await recordAuthProcess({
          processType: 'staff_password',
          step: 'login',
          status: 'failure',
          identifier: email,
          reason: 'inactive_account',
          req,
          metadata: { userId: user.id, role: user.role }
        });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { passwordHash: _ph, isActive: _ia, ...safeUser } = user;
      logAuthEvent('staff_login_success', { userId: safeUser.id, role: safeUser.role });
      if (safeUser.role === Role.DOCTOR) {
        void trackProductEvent({
          name: PRODUCT_EVENTS.DOCTOR_LOGIN,
          actorId: safeUser.id,
          actorRole: Role.DOCTOR,
          properties: { method: 'password' }
        });
      }
      const withProfile = await attachStaffProfile(safeUser);
      await recordAuthProcess({
        processType: 'staff_password',
        step: 'login',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: safeUser.id, role: safeUser.role }
      });
      res.json({
        ...(await issueAuthSession(withProfile, req)),
        ...sessionPayloadForUser(withProfile)
      });
    })
  );

  // ─── Forgot / reset password (staff) ──────────────────────────────────────────

  router.post(
    '/auth/forgot-password',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email() }).parse(req.body);
      const email = body.email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email, role: { not: Role.PATIENT } },
        select: { id: true, role: true, email: true, isActive: true }
      });

      if (!user || !user.isActive || user.role === Role.PATIENT) {
        await recordAuthProcess({
          processType: 'staff_password_reset',
          step: 'request',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'generic_no_active_staff' }
        });
        return res.json({
          message: 'If the account exists, reset instructions have been generated.'
        });
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

      await recordAuthProcess({
        processType: 'staff_password_reset',
        step: 'request',
        status: 'success',
        identifier: email,
        req,
        metadata: { userId: user.id, role: user.role }
      });
      res.json({ message: 'If the account exists, reset instructions have been sent.' });
    })
  );

  router.post(
    '/auth/reset-password',
    asyncRoute(async (req, res) => {
      const body = z
        .object({ token: z.string().min(20), password: z.string().min(8) })
        .parse(req.body);
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(body.token) },
        include: { user: { select: publicUserSelect } }
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        await recordAuthProcess({
          processType: 'staff_password_reset',
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
        return res.status(400).json({ message: 'Invalid or expired reset token' });
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

      await recordAuthProcess({
        processType: 'staff_password_reset',
        step: 'reset',
        status: 'success',
        identifier: resetToken.user.email || resetToken.userId,
        req,
        metadata: { userId: resetToken.userId, role: resetToken.user.role }
      });
      res.json(await issueAuthSession(resetToken.user, req));
    })
  );
}
