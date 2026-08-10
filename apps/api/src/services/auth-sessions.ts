import type { Request } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { signToken, type AuthUser } from '../auth.js';
import { attachStaffProfile } from '../staff-profile.js';
import { hashToken, publicUserSelect, randomToken } from '../utils/helpers.js';
import { sessionPayloadForUser } from '../constants/rbac-helpers.js';
import { recordAuthProcess } from './auth-process-log.js';

const REFRESH_TOKEN_TTL_MS =
  Number(process.env.AUTH_REFRESH_TOKEN_TTL_MS || '') || 30 * 24 * 60 * 60 * 1000;

type SessionUser = {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  staffProfile?: { isSuperAdmin: boolean; permissionCodes: string[] } | null;
};

function authCore(user: SessionUser): AuthUser {
  const { staffProfile: _staffProfile, ...core } = user;
  return core;
}

export async function issueAuthSession(user: SessionUser, req?: Request) {
  const refreshToken = randomToken();
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: req?.get('user-agent') || null,
      ipAddress: req?.ip || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      lastUsedAt: new Date()
    },
    select: { id: true, expiresAt: true }
  });

  return {
    token: signToken(authCore(user)),
    refreshToken,
    sessionId: session.id,
    refreshTokenExpiresAt: session.expiresAt,
    user
  };
}

export async function refreshAuthSession(refreshToken: string, req?: Request) {
  const session = await prisma.authSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: { user: { select: { ...publicUserSelect, isActive: true } } }
  });

  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
    await recordAuthProcess({
      processType: 'refresh_token',
      step: 'refresh',
      status: 'failure',
      identifier: session?.user.email || session?.userId || 'unknown',
      reason: !session
        ? 'session_not_found'
        : session.revokedAt
          ? 'session_revoked'
          : session.expiresAt < new Date()
            ? 'session_expired'
            : 'inactive_user',
      req
    });
    return null;
  }

  const nextRefreshToken = randomToken();
  const updated = await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(nextRefreshToken),
      userAgent: req?.get('user-agent') || session.userAgent,
      ipAddress: req?.ip || session.ipAddress,
      lastUsedAt: new Date()
    },
    select: { id: true, expiresAt: true }
  });
  const withProfile = await attachStaffProfile(session.user);
  const user = withProfile as SessionUser;

  await recordAuthProcess({
    processType: 'refresh_token',
    step: 'refresh',
    status: 'success',
    identifier: user.email || user.id,
    req,
    metadata: { sessionId: session.id, role: user.role }
  });

  return {
    token: signToken(authCore(user)),
    refreshToken: nextRefreshToken,
    sessionId: updated.id,
    refreshTokenExpiresAt: updated.expiresAt,
    ...sessionPayloadForUser(user),
    user
  };
}

export async function revokeAuthSession(refreshToken: string, req?: Request) {
  const session = await prisma.authSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    select: { id: true, userId: true, revokedAt: true, user: { select: { email: true } } }
  });
  if (!session || session.revokedAt) return false;

  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });
  await recordAuthProcess({
    processType: 'refresh_token',
    step: 'logout',
    status: 'success',
    identifier: session.user.email || session.userId,
    req,
    metadata: { sessionId: session.id }
  });
  return true;
}

export async function revokeAllAuthSessionsForUser(userId: string) {
  return prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
