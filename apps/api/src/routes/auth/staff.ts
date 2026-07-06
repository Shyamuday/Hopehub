import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db.js';
import { getMailTransporter, smtpFrom } from '../../services/mail.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent, hashToken, randomToken } from '../../utils/helpers.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';
import { sessionPayloadForStoreStaff, sessionPayloadForUser } from '../../constants/rbac-helpers.js';
import { attachStaffProfile } from '../../staff-profile.js';
import { signStoreToken } from '../store/shared.js';
import { STORE_ROLES } from '../../constants/store-api-routes.constants.js';
import { webOrigin } from './shared.js';

export function registerAuthStaffRoutes(router: Router) {
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

}
