import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import {
  PERMISSIONS,
  PERMISSION_MANAGEMENT_ROLES,
  staffHasAllPermissions,
  staffHasAnyPermission
} from './staff-permissions.js';

export type AdminPermissionMatch = 'all' | 'any';
export type AdminRouteRequirement = {
  permissions: string[];
  match: AdminPermissionMatch;
};
type RouteRule = AdminRouteRequirement & { method?: string };

const all = (permissions: string[], method?: string): RouteRule => ({
  method,
  permissions,
  match: 'all'
});
const any = (permissions: string[], method?: string): RouteRule => ({
  method,
  permissions,
  match: 'any'
});

/** Admin API paths → required permission codes (ADMIN / HR with profile). */
const ADMIN_ROUTE_RULES: Array<{ pattern: RegExp; rules: RouteRule[] }> = [
  {
    pattern: /^\/admin\/telegram-bots\/group-help/,
    rules: [all([PERMISSIONS.NOTIFICATIONS_WRITE])]
  },
  {
    pattern: /^\/admin\/staff/,
    rules: [all([PERMISSIONS.STAFF_READ])]
  },
  {
    pattern: /^\/admin\/users/,
    rules: [all([PERMISSIONS.STAFF_READ], 'GET'), all([PERMISSIONS.STAFF_WRITE])]
  },
  {
    pattern: /^\/admin\/telegram-bots/,
    rules: [
      any([PERMISSIONS.STAFF_READ, PERMISSIONS.NOTIFICATIONS_WRITE], 'GET'),
      all([PERMISSIONS.NOTIFICATIONS_WRITE])
    ]
  },
  {
    pattern: /^\/admin\/doctors/,
    rules: [all([PERMISSIONS.DOCTORS_READ], 'GET'), all([PERMISSIONS.DOCTORS_WRITE])]
  },
  {
    pattern: /^\/admin\/diseases/,
    rules: [
      any([PERMISSIONS.DISEASES_READ, PERMISSIONS.CATALOG_READ], 'GET'),
      any([PERMISSIONS.DISEASES_WRITE, PERMISSIONS.CATALOG_WRITE])
    ]
  },
  {
    pattern: /^\/admin\/consumers|^\/admin\/patients/,
    rules: [all([PERMISSIONS.CONSUMERS_READ])]
  },
  {
    pattern: /^\/admin\/(prescriptions|case-analyses|clinical-records)/,
    rules: [all([PERMISSIONS.CONSUMERS_READ])]
  },
  {
    pattern: /^\/admin\/(consultations|safety-flags)/,
    rules: [
      all([PERMISSIONS.CONSULTATIONS_READ], 'GET'),
      all([PERMISSIONS.ASSIGNMENTS_WRITE, PERMISSIONS.CONSULTATIONS_READ])
    ]
  },
  {
    pattern: /^\/admin\/(payments|finance|salary)/,
    rules: [all([PERMISSIONS.PAYMENTS_READ], 'GET'), all([PERMISSIONS.PAYMENTS_READ])]
  },
  {
    pattern: /^\/admin\/audit/,
    rules: [all([PERMISSIONS.AUDIT_READ])]
  },
  {
    pattern: /^\/admin\/inventory|^\/admin\/purchase-orders/,
    rules: [all([PERMISSIONS.INVENTORY_READ])]
  },
  {
    pattern: /^\/admin\/(suppliers|medicines|catalog)/,
    rules: [all([PERMISSIONS.CATALOG_READ], 'GET'), all([PERMISSIONS.CATALOG_WRITE])]
  },
  {
    pattern: /^\/admin\/hope-hub/,
    rules: [all([PERMISSIONS.CATALOG_READ], 'GET'), all([PERMISSIONS.CATALOG_WRITE])]
  },
  {
    pattern: /^\/admin\/notifications/,
    rules: [all([PERMISSIONS.NOTIFICATIONS_WRITE])]
  },
  {
    pattern: /^\/admin\/contact-mail/,
    rules: [all([PERMISSIONS.CONTACT_MAIL_WRITE])]
  },
  {
    pattern: /^\/admin\/ecosystem-users/,
    rules: [all([PERMISSIONS.ECOSYSTEM_USERS_WRITE])]
  },
  {
    pattern: /^\/admin\/portal-users/,
    rules: [all([PERMISSIONS.PORTAL_USERS_WRITE])]
  },
  {
    pattern: /^\/admin\/(reports|analytics|adherence)/,
    rules: [all([PERMISSIONS.REPORTS_VIEW])]
  },
  {
    pattern: /^\/admin\/admins/,
    rules: [all([PERMISSIONS.STAFF_WRITE])]
  },
  {
    pattern:
      /^\/admin\/(assessment-definitions|listener-screening|practices|practice-rules|lifestyle-tips|lifestyle-tip-rules)/,
    rules: [all([PERMISSIONS.CATALOG_READ], 'GET'), all([PERMISSIONS.CATALOG_WRITE])]
  },
  {
    pattern: /^\/admin\/(blog|faq|testimonials|site-config)/,
    rules: [
      any([PERMISSIONS.CATALOG_READ, PERMISSIONS.HR_WRITE], 'GET'),
      any([PERMISSIONS.CATALOG_WRITE, PERMISSIONS.HR_WRITE])
    ]
  },
  {
    pattern: /^\/admin\/(auth-process-logs|auth-sessions)/,
    rules: [all([PERMISSIONS.AUDIT_READ])]
  },
  {
    pattern: /^\/admin\/(chat-sessions|visitor-leads|follow-ups|call-health)/,
    rules: [
      any([PERMISSIONS.CONSULTATIONS_READ, PERMISSIONS.HR_WRITE], 'GET'),
      any([PERMISSIONS.ASSIGNMENTS_WRITE, PERMISSIONS.HR_WRITE])
    ]
  },
  {
    pattern: /^\/admin\/(counsellor-applications|care-contributors|online-doctors|provider-roles)/,
    rules: [all([PERMISSIONS.DOCTORS_READ], 'GET'), all([PERMISSIONS.DOCTORS_WRITE])]
  },
  {
    pattern: /^\/admin\/(lab-referrals)/,
    rules: [all([PERMISSIONS.CONSUMERS_READ], 'GET'), all([PERMISSIONS.ASSIGNMENTS_WRITE])]
  },
  {
    pattern: /^\/admin\/(pricing|billing)/,
    rules: [
      any([PERMISSIONS.DISEASES_READ, PERMISSIONS.PAYMENTS_READ], 'GET'),
      any([PERMISSIONS.DISEASES_WRITE, PERMISSIONS.PAYMENTS_READ])
    ]
  },
  {
    pattern: /^\/admin\/(rewards)/,
    rules: [
      any([PERMISSIONS.PAYMENTS_READ, PERMISSIONS.CATALOG_READ], 'GET'),
      any([PERMISSIONS.PAYMENTS_READ, PERMISSIONS.CATALOG_WRITE])
    ]
  },
  {
    pattern: /^\/admin\/(vacancies)/,
    rules: [all([PERMISSIONS.HR_WRITE])]
  },
  {
    pattern: /^\/admin\/(donations)/,
    rules: [all([PERMISSIONS.PAYMENTS_READ])]
  }
];

export function resolveAdminRouteRequirement(
  method: string,
  path: string
): AdminRouteRequirement | null {
  for (const entry of ADMIN_ROUTE_RULES) {
    if (!entry.pattern.test(path)) continue;
    const match =
      entry.rules.find((r) => !r.method || r.method === method) ??
      entry.rules[entry.rules.length - 1];
    return { permissions: match.permissions, match: match.match };
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

  const requirement = resolveAdminRouteRequirement(req.method, path);
  if (!requirement?.permissions.length) {
    return next();
  }

  const permitted =
    requirement.match === 'any'
      ? staffHasAnyPermission(user, ...requirement.permissions)
      : staffHasAllPermissions(user, ...requirement.permissions);
  if (!permitted) {
    return res.status(403).json({
      message: 'Insufficient permissions for this action.',
      required: requirement.permissions,
      match: requirement.match
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
