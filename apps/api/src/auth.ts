import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { Role as PrismaRole } from '@prisma/client';
import { prisma } from './db.js';

export type StaffProfileSummary = {
  isSuperAdmin: boolean;
  permissionCodes: string[];
};

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  email?: string | null;
  mobile?: string | null;
  /**
   * Present only for ADMIN. `null` = no profile row yet (legacy full access).
   */
  staffProfile?: StaffProfileSummary | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const DEFAULT_SECRET = 'dev-only-secret';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_SECRET;

if (jwtSecret === DEFAULT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
    process.exit(1);
  } else {
    console.warn('[auth] WARNING: JWT_SECRET is not set — using insecure dev-only secret. Set JWT_SECRET before deploying.');
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email ?? null,
      mobile: user.mobile ?? null
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        mobile: true,
        isActive: true,
        staffProfile: {
          select: {
            isSuperAdmin: true,
            permissionCodes: true
          }
        }
      }
    });

    if (!user?.isActive) {
      return res.status(401).json({ message: 'User is inactive or missing' });
    }

    const staffProfile =
      user.role === PrismaRole.ADMIN
        ? user.staffProfile
          ? {
              isSuperAdmin: user.staffProfile.isSuperAdmin,
              permissionCodes: user.staffProfile.permissionCodes
            }
          : null
        : undefined;

    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      staffProfile
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    next();
  };
}
