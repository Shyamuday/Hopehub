import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import type { AuthUser } from './auth.js';

/** Granular admin capabilities. Use `isSuperAdmin` on profile for full access without listing every code. */
export const PERMISSIONS = {
  FULL: 'admin.full',
  REPORTS_VIEW: 'admin.reports.view',
  DOCTORS_READ: 'admin.doctors.read',
  DOCTORS_WRITE: 'admin.doctors.write',
  DISEASES_READ: 'admin.diseases.read',
  DISEASES_WRITE: 'admin.diseases.write',
  CONSUMERS_READ: 'admin.consumers.read',
  AUDIT_READ: 'admin.audit.read',
  PAYMENTS_READ: 'admin.payments.read',
  PAYMENTS_EXPORT: 'admin.payments.export',
  LOCATIONS_READ: 'admin.locations.read',
  LOCATIONS_WRITE: 'admin.locations.write',
  CONSULTATIONS_READ: 'admin.consultations.read',
  ASSIGNMENTS_WRITE: 'admin.assignments.write',
  STAFF_READ: 'admin.staff.read',
  STAFF_WRITE: 'admin.staff.write'
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

/**
 * Legacy: ADMIN with no StaffProfile row = full access (backward compatible).
 * Profile with isSuperAdmin or admin.full = full access.
 */
export function staffHasAllPermissions(user: AuthUser | undefined, ...required: string[]): boolean {
  if (!user || user.role !== Role.ADMIN) {
    return false;
  }
  const sp = user.staffProfile;
  if (sp === undefined) {
    return false;
  }
  if (sp === null) {
    return true;
  }
  if (sp.isSuperAdmin) {
    return true;
  }
  if (sp.permissionCodes.includes(PERMISSIONS.FULL)) {
    return true;
  }
  return required.every((p) => sp.permissionCodes.includes(p));
}

export function requirePermissions(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!staffHasAllPermissions(req.user, ...required)) {
      return res.status(403).json({
        message: 'Insufficient permissions for this action.',
        required
      });
    }
    next();
  };
}

/** For routes shared by patients/doctors/admins — enforce codes only when `role` is ADMIN. */
export function requirePermissionsIfAdmin(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== Role.ADMIN) {
      return next();
    }
    if (!staffHasAllPermissions(req.user, ...required)) {
      return res.status(403).json({
        message: 'Insufficient permissions for this action.',
        required
      });
    }
    next();
  };
}
