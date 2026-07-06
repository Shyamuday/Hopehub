import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { PERMISSIONS, PERMISSION_MANAGEMENT_ROLES, staffHasAllPermissions } from './staff-permissions.js';

type RouteRule = { method?: string; permissions: string[] };

/** Admin API paths → required permission codes (ADMIN / HR with profile). */
const ADMIN_ROUTE_RULES: Array<{ pattern: RegExp; rules: RouteRule[] }> = [
  {
    pattern: /^\/admin\/staff/,
    rules: [{ permissions: [PERMISSIONS.STAFF_READ] }]
  },
  {
    pattern: /^\/admin\/doctors/,
    rules: [
      { method: 'GET', permissions: [PERMISSIONS.DOCTORS_READ] },
      { permissions: [PERMISSIONS.DOCTORS_WRITE] }
    ]
  },
  {
    pattern: /^\/admin\/diseases/,
    rules: [
      { method: 'GET', permissions: [PERMISSIONS.DISEASES_READ, PERMISSIONS.CATALOG_READ] },
      { permissions: [PERMISSIONS.DISEASES_WRITE, PERMISSIONS.CATALOG_WRITE] }
    ]
  },
  {
    pattern: /^\/admin\/consumers|^\/admin\/patients/,
    rules: [{ permissions: [PERMISSIONS.CONSUMERS_READ] }]
  },
  {
    pattern: /^\/admin\/consultations/,
    rules: [
      { method: 'GET', permissions: [PERMISSIONS.CONSULTATIONS_READ] },
      { permissions: [PERMISSIONS.ASSIGNMENTS_WRITE, PERMISSIONS.CONSULTATIONS_READ] }
    ]
  },
  {
    pattern: /^\/admin\/payments|^\/admin\/finance/,
    rules: [
      { method: 'GET', permissions: [PERMISSIONS.PAYMENTS_READ, PERMISSIONS.REPORTS_VIEW] },
      { permissions: [PERMISSIONS.PAYMENTS_READ] }
    ]
  },
  {
    pattern: /^\/admin\/audit/,
    rules: [{ permissions: [PERMISSIONS.AUDIT_READ] }]
  },
  {
    pattern: /^\/admin\/inventory|^\/admin\/purchase-orders/,
    rules: [{ permissions: [PERMISSIONS.INVENTORY_READ] }]
  },
  {
    pattern: /^\/admin\/(suppliers|medicines|catalog)/,
    rules: [
      { method: 'GET', permissions: [PERMISSIONS.CATALOG_READ] },
      { permissions: [PERMISSIONS.CATALOG_WRITE] }
    ]
  },
  {
    pattern: /^\/admin\/notifications/,
    rules: [{ permissions: [PERMISSIONS.NOTIFICATIONS_WRITE] }]
  },
  {
    pattern: /^\/admin\/ecosystem-users/,
    rules: [{ permissions: [PERMISSIONS.ECOSYSTEM_USERS_WRITE] }]
  },
  {
    pattern: /^\/admin\/portal-users/,
    rules: [{ permissions: [PERMISSIONS.PORTAL_USERS_WRITE] }]
  },
  {
    pattern: /^\/admin\/(reports|analytics|adherence)/,
    rules: [{ permissions: [PERMISSIONS.REPORTS_VIEW] }]
  },
  {
    pattern: /^\/admin\/admins/,
    rules: [{ permissions: [PERMISSIONS.STAFF_WRITE] }]
  }
];

function resolveRequiredPermissions(method: string, path: string): string[] | null {
  for (const entry of ADMIN_ROUTE_RULES) {
    if (!entry.pattern.test(path)) continue;
    const match =
      entry.rules.find((r) => !r.method || r.method === method) ?? entry.rules[entry.rules.length - 1];
    return match.permissions;
  }
  return null;
}

/** Enforce granular permissions for ADMIN and HR on /admin/* routes. */
export function adminPermissionMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user || !PERMISSION_MANAGEMENT_ROLES.includes(user.role)) {
    return next();
  }

  const path = req.path;
  if (!path.startsWith('/admin')) {
    return next();
  }

  if (path === '/admin/rbac/matrix' || path === '/admin/permission-presets') {
    return next();
  }

  const required = resolveRequiredPermissions(req.method, path);
  if (!required?.length) {
    return next();
  }

  if (!staffHasAllPermissions(user, ...required)) {
    return res.status(403).json({
      message: 'Insufficient permissions for this action.',
      required
    });
  }

  next();
}

export function allowAdminOrHr(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !PERMISSION_MANAGEMENT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or HR access required.' });
  }
  next();
}
