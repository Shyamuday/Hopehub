import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { AUTH_MESSAGES, DEFAULT_JWT_SECRET, JWT_EXPIRY } from './constants/auth.constants.js';
import { prisma } from './db.js';

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
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
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, role: true, email: true, mobile: true, patientCode: true, isActive: true }
    });

    if (!user?.isActive) {
      return res.status(401).json({ message: AUTH_MESSAGES.INACTIVE_USER });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: AUTH_MESSAGES.INVALID_TOKEN });
  }
}

export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: AUTH_MESSAGES.FORBIDDEN });
    }

    next();
  };
}
