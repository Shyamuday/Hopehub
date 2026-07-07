/** Mirrors API permission codes — server remains authoritative. */

export type StaffProfileSummary = {
  isSuperAdmin: boolean;
  permissionCodes: string[];
};

export type StaffUser = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: string;
  profileImageUrl?: string | null;
  staffProfile?: StaffProfileSummary | null;
};

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
  STAFF_WRITE: 'admin.staff.write',
  INVENTORY_READ: 'admin.inventory.read',
  CATALOG_READ: 'admin.catalog.read',
  CATALOG_WRITE: 'admin.catalog.write',
  NOTIFICATIONS_WRITE: 'admin.notifications.write',
  HR_WRITE: 'admin.hr.write',
  ECOSYSTEM_USERS_WRITE: 'admin.ecosystem_users.write',
  PORTAL_USERS_WRITE: 'admin.portal_users.write',
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

export const PERMISSION_GROUPS: Array<{ label: string; codes: string[] }> = [
  {
    label: 'Admin console',
    codes: [
      ADMIN_PERMISSIONS.REPORTS_VIEW,
      ADMIN_PERMISSIONS.DOCTORS_READ,
      ADMIN_PERMISSIONS.DOCTORS_WRITE,
      ADMIN_PERMISSIONS.DISEASES_READ,
      ADMIN_PERMISSIONS.DISEASES_WRITE,
      ADMIN_PERMISSIONS.CONSUMERS_READ,
      ADMIN_PERMISSIONS.CONSULTATIONS_READ,
      ADMIN_PERMISSIONS.ASSIGNMENTS_WRITE,
      ADMIN_PERMISSIONS.PAYMENTS_READ,
      ADMIN_PERMISSIONS.PAYMENTS_EXPORT,
      ADMIN_PERMISSIONS.AUDIT_READ,
      ADMIN_PERMISSIONS.INVENTORY_READ,
      ADMIN_PERMISSIONS.CATALOG_READ,
      ADMIN_PERMISSIONS.CATALOG_WRITE,
      ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE,
      ADMIN_PERMISSIONS.HR_WRITE,
      ADMIN_PERMISSIONS.ECOSYSTEM_USERS_WRITE,
      ADMIN_PERMISSIONS.PORTAL_USERS_WRITE,
      ADMIN_PERMISSIONS.STAFF_READ,
      ADMIN_PERMISSIONS.STAFF_WRITE
    ]
  },
  {
    label: 'Operations portal',
    codes: [
      ADMIN_PERMISSIONS.OPS_HR,
      ADMIN_PERMISSIONS.OPS_RECEPTIONIST,
      ADMIN_PERMISSIONS.OPS_CLINIC_MANAGER,
      ADMIN_PERMISSIONS.OPS_ACCOUNTANT,
      ADMIN_PERMISSIONS.OPS_CALL_CENTER,
      ADMIN_PERMISSIONS.OPS_MARKETING,
      ADMIN_PERMISSIONS.OPS_WAREHOUSE,
      ADMIN_PERMISSIONS.OPS_STORE_COUNTER,
      ADMIN_PERMISSIONS.OPS_STORE_MANAGER
    ]
  }
];

export function staffHasAllPermissions(user: StaffUser | null | undefined, ...required: string[]): boolean {
  if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
    return false;
  }
  const sp = user.staffProfile;
  if (user.role === 'ADMIN') {
    if (sp === undefined) return false;
    if (sp === null) return true;
    if (sp.isSuperAdmin || sp.permissionCodes.includes(ADMIN_PERMISSIONS.FULL)) return true;
    return required.every((p) => sp.permissionCodes.includes(p));
  }
  if (!sp) return false;
  if (sp.isSuperAdmin || sp.permissionCodes.includes(ADMIN_PERMISSIONS.FULL)) return true;
  return required.every((p) => sp.permissionCodes.includes(p));
}

export function staffHasAnyPermission(user: StaffUser | null | undefined, ...candidates: string[]): boolean {
  return candidates.some((c) => staffHasAllPermissions(user, c));
}
