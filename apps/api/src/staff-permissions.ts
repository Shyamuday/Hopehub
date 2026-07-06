import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import type { AuthUser } from './auth.js';

/** Granular admin + ops capabilities. Super-admin / `admin.full` grants everything. */
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
  STAFF_WRITE: 'admin.staff.write',
  INVENTORY_READ: 'admin.inventory.read',
  CATALOG_READ: 'admin.catalog.read',
  CATALOG_WRITE: 'admin.catalog.write',
  NOTIFICATIONS_WRITE: 'admin.notifications.write',
  ECOSYSTEM_USERS_WRITE: 'admin.ecosystem_users.write',
  PORTAL_USERS_WRITE: 'admin.portal_users.write',
  /** Ops portal sections (assign beyond default role) */
  OPS_HR: 'ops.hr.portal',
  OPS_RECEPTIONIST: 'ops.receptionist.portal',
  OPS_CLINIC_MANAGER: 'ops.clinic_manager.portal',
  OPS_ACCOUNTANT: 'ops.accountant.portal',
  OPS_CALL_CENTER: 'ops.call_center.portal',
  OPS_MARKETING: 'ops.marketing.portal',
  OPS_WAREHOUSE: 'ops.warehouse.portal',
  OPS_STORE_COUNTER: 'ops.store_counter.portal',
  OPS_STORE_MANAGER: 'ops.store_manager.portal'
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  [PERMISSIONS.FULL]: 'Full platform access',
  [PERMISSIONS.REPORTS_VIEW]: 'View reports & analytics',
  [PERMISSIONS.DOCTORS_READ]: 'View doctors',
  [PERMISSIONS.DOCTORS_WRITE]: 'Manage doctors',
  [PERMISSIONS.DISEASES_READ]: 'View disease catalog',
  [PERMISSIONS.DISEASES_WRITE]: 'Edit disease catalog',
  [PERMISSIONS.CONSUMERS_READ]: 'View patients / consumers',
  [PERMISSIONS.AUDIT_READ]: 'View audit trail',
  [PERMISSIONS.PAYMENTS_READ]: 'View payments',
  [PERMISSIONS.PAYMENTS_EXPORT]: 'Export payments (CSV)',
  [PERMISSIONS.LOCATIONS_READ]: 'View clinic locations',
  [PERMISSIONS.LOCATIONS_WRITE]: 'Manage clinic locations',
  [PERMISSIONS.CONSULTATIONS_READ]: 'View consultations',
  [PERMISSIONS.ASSIGNMENTS_WRITE]: 'Assign doctors / override status',
  [PERMISSIONS.STAFF_READ]: 'View staff permissions',
  [PERMISSIONS.STAFF_WRITE]: 'Assign staff permissions',
  [PERMISSIONS.INVENTORY_READ]: 'View inventory',
  [PERMISSIONS.CATALOG_READ]: 'View medicines & suppliers',
  [PERMISSIONS.CATALOG_WRITE]: 'Manage medicines & suppliers',
  [PERMISSIONS.NOTIFICATIONS_WRITE]: 'Send notifications',
  [PERMISSIONS.ECOSYSTEM_USERS_WRITE]: 'Manage ecosystem users',
  [PERMISSIONS.PORTAL_USERS_WRITE]: 'Manage portal users',
  [PERMISSIONS.OPS_HR]: 'HR ops portal',
  [PERMISSIONS.OPS_RECEPTIONIST]: 'Receptionist ops portal',
  [PERMISSIONS.OPS_CLINIC_MANAGER]: 'Clinic manager ops portal',
  [PERMISSIONS.OPS_ACCOUNTANT]: 'Accountant ops portal',
  [PERMISSIONS.OPS_CALL_CENTER]: 'Call center ops portal',
  [PERMISSIONS.OPS_MARKETING]: 'Marketing ops portal',
  [PERMISSIONS.OPS_WAREHOUSE]: 'Warehouse ops portal',
  [PERMISSIONS.OPS_STORE_COUNTER]: 'Store counter ops portal',
  [PERMISSIONS.OPS_STORE_MANAGER]: 'Store manager ops portal'
};

/** Roles that may receive StaffProfile permission assignments. */
export const STAFF_ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.HR,
  Role.RECEPTIONIST,
  Role.CLINIC_MANAGER,
  Role.ACCOUNTANT,
  Role.BRANCH_OWNER,
  Role.PATIENT_COORDINATOR,
  Role.CALL_CENTER,
  Role.MARKETING,
  Role.WAREHOUSE_MANAGER,
  Role.SUPPLIER,
  Role.DELIVERY_EXECUTIVE,
  Role.DIAGNOSTIC_PARTNER,
  Role.CORPORATE_WELLNESS,
  Role.INSURANCE_PARTNER
];

export const PERMISSION_MANAGEMENT_ROLES: Role[] = [Role.ADMIN, Role.HR];

function hasFullAccess(sp: NonNullable<AuthUser['staffProfile']>): boolean {
  return sp.isSuperAdmin || sp.permissionCodes.includes(PERMISSIONS.FULL);
}

/**
 * ADMIN: null profile = legacy full access.
 * HR: must have explicit codes (no legacy full access).
 */
export function staffHasAllPermissions(user: AuthUser | undefined, ...required: string[]): boolean {
  if (!user || !PERMISSION_MANAGEMENT_ROLES.includes(user.role)) {
    return false;
  }

  const sp = user.staffProfile;
  if (user.role === Role.ADMIN) {
    if (sp === undefined) {
      return false;
    }
    if (sp === null) {
      return true;
    }
    if (hasFullAccess(sp)) {
      return true;
    }
    return required.every((p) => sp.permissionCodes.includes(p));
  }

  if (!sp) {
    return false;
  }
  if (hasFullAccess(sp)) {
    return true;
  }
  return required.every((p) => sp.permissionCodes.includes(p));
}

export function canManageStaffPermissions(user: AuthUser | undefined): boolean {
  return staffHasAllPermissions(user, PERMISSIONS.STAFF_READ);
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

/** For routes shared by patients/doctors/admins — enforce codes only when `role` is ADMIN or HR. */
export function requirePermissionsIfStaff(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !PERMISSION_MANAGEMENT_ROLES.includes(req.user.role)) {
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

export function allowStaffManagers(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !PERMISSION_MANAGEMENT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or HR access required.' });
  }
  if (!canManageStaffPermissions(req.user)) {
    return res.status(403).json({ message: 'admin.staff.read permission required.' });
  }
  next();
}
