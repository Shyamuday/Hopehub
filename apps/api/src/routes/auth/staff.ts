import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db.js';
import { getMailTransporter, smtpFrom } from '../../services/mail.js';
import {
  asyncRoute,
  publicUserSelect,
  toAuthResponse,
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
  const user = await prisma.user.findUnique({
    where: { email },
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

async function buildStaffLoginResponse(email: string) {
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
  return { ...toAuthResponse(withProfile), ...sessionPayloadForUser(withProfile) };
}

async function buildGoogleStaffLoginResponse(payload: GoogleStaffPayload) {
  if (!payload.email || !payload.sub) return null;
  if (payload.email_verified !== true) {
    return { errorStatus: 401 as const, message: 'Google email is not verified.' };
  }

  const now = new Date();
  const email = payload.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
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
  return { ...toAuthResponse(withProfile), ...sessionPayloadForUser(withProfile) };
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
        return res.json({ message: 'If the staff account exists, an OTP has been sent.' });
      }

      if (account.kind === 'user' && !account.user.isActive) {
        return res.status(account.user.role === Role.DOCTOR ? 403 : 401).json({
          message:
            account.user.role === Role.DOCTOR
              ? 'Doctor account is pending admin approval.'
              : 'Invalid credentials'
        });
      }

      if (isProduction && !getMailTransporter()) {
        return res.status(503).json({ message: 'Email delivery is not configured.' });
      }

      const otp = isProduction ? generateOtp() : process.env.DEV_OTP || '123456';
      await storeOtp(staffOtpKey(email), otp);
      if (isProduction) {
        await sendOtpEmail(email, otp);
      } else {
        console.info(`[otp] DEV — Staff OTP for ${email}: ${otp}`);
      }

      res.json({ message: 'OTP sent.', ...(!isProduction ? { devOtp: otp } : {}) });
    })
  );

  router.post(
    '/auth/staff-login-otp',
    asyncRoute(async (req, res) => {
      const body = z.object({ email: z.string().email(), otp: z.string().min(4) }).parse(req.body);
      const email = body.email.trim().toLowerCase();

      if (!(await verifyOtp(staffOtpKey(email), body.otp))) {
        return res.status(401).json({ message: 'Invalid or expired OTP.' });
      }

      const response = await buildStaffLoginResponse(email);
      if (!response) {
        logAuthEvent('staff_login_failure', {
          email,
          reason: 'invalid_credentials',
          method: 'email_otp'
        });
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if ('errorStatus' in response) {
        const status = response.errorStatus ?? 401;
        return res.status(status).json({ message: response.message });
      }

      res.json(response);
    })
  );

  router.post(
    '/auth/staff-login-google',
    asyncRoute(async (req, res) => {
      const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
      if (!googleClient || !googleClientId) {
        return res
          .status(503)
          .json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: body.idToken,
        audience: googleClientId
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        return res.status(401).json({ message: 'Google account email is required' });
      }

      const response = await buildGoogleStaffLoginResponse(payload as GoogleStaffPayload);
      if (!response) {
        logAuthEvent('staff_login_failure', {
          email: payload.email,
          reason: 'google_payload_missing_email',
          method: 'google'
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
        return res.status(status).json({ message: response.message });
      }

      res.json(response);
    })
  );

  router.post(
    '/auth/staff-login',
    asyncRoute(async (req, res) => {
      const body = z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: { ...publicUserSelect, passwordHash: true, isActive: true }
      });

      if (!user?.passwordHash || user.role === Role.PATIENT) {
        const staff = await prisma.storeStaff.findFirst({
          where: { email: body.email, isActive: true },
          include: { store: { select: { id: true, name: true } } }
        });

        if (!staff) {
          logAuthEvent('staff_login_failure', { email: body.email, reason: 'invalid_credentials' });
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const staffValid = await bcrypt.compare(body.password, staff.pinHash);
        if (!staffValid) {
          logAuthEvent('staff_login_failure', { email: body.email, reason: 'invalid_credentials' });
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
        return res.json({ token, ...session });
      }

      if (!user.isActive && user.role === Role.DOCTOR) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'doctor_pending_approval'
        });
        return res.status(403).json({ message: 'Doctor account is pending admin approval.' });
      }

      if (!user.isActive) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'inactive_account'
        });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(body.password, user.passwordHash);
      if (!isValid) {
        logAuthEvent('staff_login_failure', {
          userId: user.id,
          role: user.role,
          reason: 'invalid_credentials'
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
      res.json({ ...toAuthResponse(withProfile), ...sessionPayloadForUser(withProfile) });
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

      res.json(toAuthResponse(resetToken.user));
    })
  );
}
