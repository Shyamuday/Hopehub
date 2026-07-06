import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AUTH_MESSAGES, DEFAULT_JWT_SECRET, JWT_EXPIRY } from './constants/auth.constants.js';
import { prisma } from './db.js';
import type { StaffProfileSummary } from './permission-capabilities.js';
import { loadStaffProfileForUser } from './staff-profile.js';

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  staffProfile?: StaffProfileSummary | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (jwtSecret === DEFAULT_JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
    process.exit(1);
  } else {
    console.warn('[auth] WARNING: JWT_SECRET is not set — using insecure dev-only secret. Set JWT_SECRET before deploying.');
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, jwtSecret, { expiresIn: JWT_EXPIRY });
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: AUTH_MESSAGES.REQUIRED });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser & { userId?: string };
    const userId = decoded.id ?? decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: AUTH_MESSAGES.INVALID_TOKEN });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, email: true, mobile: true, patientCode: true, isActive: true }
    });

    if (!user?.isActive) {
      return res.status(401).json({ message: AUTH_MESSAGES.INACTIVE_USER });
    }

    const staffProfile = await loadStaffProfileForUser(user.id, user.role);
    req.user =
      staffProfile === undefined
        ? user
        : { ...user, staffProfile: staffProfile as StaffProfileSummary | null };

    next();
  } catch {
    return res.status(401).json({ message: AUTH_MESSAGES.INVALID_TOKEN });
  }
}

export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: AUTH_MESSAGES.FORBIDDEN });
    }

    if (roles.includes(Role.ADMIN) && req.user.role === Role.HR) {
      const path = req.originalUrl.split('?')[0] ?? '';
      if (path.startsWith('/admin')) {
        return next();
      }
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: AUTH_MESSAGES.FORBIDDEN });
    }

    next();
  };
}
