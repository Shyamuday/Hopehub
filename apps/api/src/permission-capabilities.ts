import { Role } from '@prisma/client';
import { PERMISSIONS } from './staff-permissions.js';

/** Maps granular permission codes → operations-web capability ids. */
export const PERMISSION_TO_CAPABILITIES: Record<string, string[]> = {
  [PERMISSIONS.REPORTS_VIEW]: ['admin.dashboard', 'admin.analytics', 'admin.adherence'],
  [PERMISSIONS.DOCTORS_READ]: ['admin.doctors', 'hr.portal'],
  [PERMISSIONS.DOCTORS_WRITE]: ['admin.doctors'],
  [PERMISSIONS.DISEASES_READ]: ['admin.catalog'],
  [PERMISSIONS.DISEASES_WRITE]: ['admin.catalog'],
  [PERMISSIONS.CATALOG_READ]: ['admin.catalog'],
  [PERMISSIONS.CATALOG_WRITE]: ['admin.catalog'],
  [PERMISSIONS.CONSUMERS_READ]: ['admin.consumers'],
  [PERMISSIONS.CONSULTATIONS_READ]: ['admin.consultations'],
  [PERMISSIONS.ASSIGNMENTS_WRITE]: ['admin.consultations'],
  [PERMISSIONS.PAYMENTS_READ]: ['admin.finance', 'admin.payments'],
  [PERMISSIONS.PAYMENTS_EXPORT]: ['admin.finance'],
  [PERMISSIONS.AUDIT_READ]: ['admin.audit'],
  [PERMISSIONS.INVENTORY_READ]: ['admin.inventory', 'admin.purchase_orders'],
  [PERMISSIONS.NOTIFICATIONS_WRITE]: ['admin.notifications'],
  [PERMISSIONS.ECOSYSTEM_USERS_WRITE]: ['admin.ecosystem_users'],
  [PERMISSIONS.PORTAL_USERS_WRITE]: ['admin.portal_users', 'admin.ecosystem_users'],
  [PERMISSIONS.STAFF_READ]: ['admin.users'],
  [PERMISSIONS.STAFF_WRITE]: ['admin.users'],
  [PERMISSIONS.OPS_HR]: ['hr.portal'],
  [PERMISSIONS.OPS_RECEPTIONIST]: ['receptionist.portal'],
  [PERMISSIONS.OPS_CLINIC_MANAGER]: ['clinic_manager.portal'],
  [PERMISSIONS.OPS_ACCOUNTANT]: ['accountant.portal'],
  [PERMISSIONS.OPS_CALL_CENTER]: ['call_center.portal'],
  [PERMISSIONS.OPS_MARKETING]: ['marketing.portal'],
  [PERMISSIONS.OPS_WAREHOUSE]: ['store_staff.portal'],
  [PERMISSIONS.OPS_STORE_COUNTER]: ['store_counter.portal', 'store.stock'],
  [PERMISSIONS.OPS_STORE_MANAGER]: ['store_manager.portal', 'store.stock', 'store_counter.portal']
};

const ROLE_BASE_CAPABILITIES: Partial<Record<Role, string[]>> = {
  [Role.HR]: ['hr.portal', 'admin.consumers'],
  [Role.RECEPTIONIST]: ['receptionist.portal', 'admin.consumers', 'admin.consultations'],
  [Role.CLINIC_MANAGER]: ['clinic_manager.portal', 'admin.consumers', 'admin.consultations'],
  [Role.ACCOUNTANT]: ['accountant.portal', 'admin.finance'],
  [Role.CALL_CENTER]: ['call_center.portal'],
  [Role.MARKETING]: ['marketing.portal'],
  [Role.WAREHOUSE_MANAGER]: ['store_staff.portal', 'admin.inventory', 'admin.purchase_orders'],
  [Role.BRANCH_OWNER]: ['branch_owner.portal'],
  [Role.PATIENT_COORDINATOR]: ['coordinator.portal'],
  [Role.SUPPLIER]: ['supplier.portal'],
  [Role.DELIVERY_EXECUTIVE]: ['delivery.ops'],
  [Role.DIAGNOSTIC_PARTNER]: ['diagnostic.portal'],
  [Role.CORPORATE_WELLNESS]: ['corporate_wellness.portal'],
  [Role.INSURANCE_PARTNER]: ['insurance.portal']
};

export type StaffProfileSummary = {
  isSuperAdmin: boolean;
  permissionCodes: string[];
};

function capsFromCodes(codes: string[]): string[] {
  const set = new Set<string>();
  for (const code of codes) {
    for (const cap of PERMISSION_TO_CAPABILITIES[code] ?? []) {
      set.add(cap);
    }
  }
  return [...set];
}

export function capabilitiesFromStaffProfile(
  role: Role,
  staffProfile: StaffProfileSummary | null | undefined,
  roleCapabilities: string[]
): string[] {
  if (role === Role.ADMIN) {
    if (staffProfile === null || staffProfile === undefined) {
      return roleCapabilities;
    }
    if (staffProfile.isSuperAdmin || staffProfile.permissionCodes.includes(PERMISSIONS.FULL)) {
      return roleCapabilities;
    }
    return capsFromCodes(staffProfile.permissionCodes);
  }

  const base = new Set(ROLE_BASE_CAPABILITIES[role] ?? roleCapabilities);
  if (!staffProfile) {
    return [...base];
  }
  if (staffProfile.isSuperAdmin || staffProfile.permissionCodes.includes(PERMISSIONS.FULL)) {
    return roleCapabilities;
  }
  for (const cap of capsFromCodes(staffProfile.permissionCodes)) {
    base.add(cap);
  }
  return [...base];
}
