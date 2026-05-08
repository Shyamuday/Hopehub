import type { User } from '../interfaces';

/** Mirrors API `PERMISSIONS` for UI gating only — server remains authoritative. */
export const ADMIN_PERMISSIONS = {
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

export function adminHasAllPermissions(
  user: User | null | undefined,
  ...required: string[]
): boolean {
  if (!user || user.role !== 'ADMIN') {
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
  if (sp.permissionCodes.includes(ADMIN_PERMISSIONS.FULL)) {
    return true;
  }
  return required.every((p) => sp.permissionCodes.includes(p));
}
