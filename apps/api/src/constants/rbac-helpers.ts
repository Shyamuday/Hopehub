import { Role } from '@prisma/client';
import { RBAC_CAPABILITIES } from './rbac-matrix.constants.js';
import { STORE_ROLES } from './store-api-routes.constants.js';
import {
  capabilitiesFromStaffProfile,
  type StaffProfileSummary
} from '../permission-capabilities.js';
import { enrichWithProfileImageUrl, storeStaffProfileImagePath } from '../utils/profile-image-url.js';

export type PortalId = 'patient' | 'clinical' | 'operations';

export const ROLE_PORTAL: Record<Role, PortalId> = {
  PATIENT: 'patient',
  DOCTOR: 'clinical',
  ADMIN: 'operations',
  HR: 'operations',
  RECEPTIONIST: 'operations',
  CLINIC_MANAGER: 'operations',
  ACCOUNTANT: 'operations',
  BRANCH_OWNER: 'operations',
  PATIENT_COORDINATOR: 'operations',
  CALL_CENTER: 'operations',
  MARKETING: 'operations',
  SUPPLIER: 'operations',
  WAREHOUSE_MANAGER: 'operations',
  DELIVERY_EXECUTIVE: 'operations',
  DIAGNOSTIC_PARTNER: 'operations',
  CORPORATE_WELLNESS: 'operations',
  INSURANCE_PARTNER: 'operations'
};

/** Default landing route inside the operations portal (path segment, no leading slash). */
export const OPERATIONS_DEFAULT_ROUTE: Partial<Record<Role, string>> = {
  ADMIN: 'admin/dashboard',
  HR: 'dashboard',
  RECEPTIONIST: 'walk-in',
  CLINIC_MANAGER: 'clinic-dashboard',
  ACCOUNTANT: 'finance',
  BRANCH_OWNER: 'branch-dashboard',
  PATIENT_COORDINATOR: 'follow-ups',
  CALL_CENTER: 'patients',
  MARKETING: 'funnels',
  SUPPLIER: 'orders',
  WAREHOUSE_MANAGER: 'warehouse',
  DELIVERY_EXECUTIVE: 'partner-deliveries',
  DIAGNOSTIC_PARTNER: 'lab-referrals',
  CORPORATE_WELLNESS: 'accounts',
  INSURANCE_PARTNER: 'claims'
};

export const STORE_COUNTER_CAPABILITIES = ['store_counter.portal', 'store.stock', 'patient.scan'] as const;
export const STORE_MANAGER_CAPABILITIES = [
  'store_manager.portal',
  'store.stock',
  'store_counter.portal',
  'patient.scan'
] as const;

export function capabilitiesForRole(role: Role): string[] {
  return RBAC_CAPABILITIES.filter((cap) => cap.roles.includes(role)).map((cap) => cap.id);
}

export function portalForRole(role: Role): PortalId {
  return ROLE_PORTAL[role] ?? 'operations';
}

export function defaultRouteForRole(role: Role, capabilities?: string[]): string {
  const portal = portalForRole(role);
  if (portal === 'clinical') return 'worklist';
  if (portal === 'patient') return 'dashboard';

  const caps = capabilities ?? capabilitiesForRole(role);
  if (caps.some((c) => c.startsWith('admin.'))) {
    if (caps.includes('admin.dashboard')) return 'admin/dashboard';
    if (caps.includes('admin.consultations')) return 'admin/consultations';
    if (caps.includes('admin.consumers')) return 'admin/consumers';
    if (caps.includes('admin.doctors')) return 'admin/doctors';
    if (caps.includes('admin.users')) return 'admin/staff';
    return 'admin/dashboard';
  }

  return OPERATIONS_DEFAULT_ROUTE[role] ?? 'dashboard';
}

export function sessionPayloadForUser(user: {
  id: string;
  role: Role;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  staffProfile?: StaffProfileSummary | null;
}) {
  const roleCaps = capabilitiesForRole(user.role);
  const capabilities = capabilitiesFromStaffProfile(user.role, user.staffProfile, roleCaps);
  const portal = portalForRole(user.role);
  return {
    user,
    capabilities,
    portal,
    defaultRoute: defaultRouteForRole(user.role, capabilities)
  };
}

export function sessionPayloadForStoreStaff(staff: {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  staffCode: string;
  storeId: string;
  storeName: string;
  profileImageKey?: string | null;
}) {
  const isManager = staff.role === STORE_ROLES.MANAGER;
  const capabilities = isManager ? [...STORE_MANAGER_CAPABILITIES] : [...STORE_COUNTER_CAPABILITIES];
  const storeStaff = enrichWithProfileImageUrl(
    {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      staffCode: staff.staffCode,
      storeId: staff.storeId,
      storeName: staff.storeName,
      profileImageKey: staff.profileImageKey
    },
    storeStaffProfileImagePath
  );
  return {
    user: {
      id: staff.id,
      name: staff.name,
      email: staff.email ?? '',
      role: isManager ? 'STORE_MANAGER' : 'STORE_STAFF',
      profileImageUrl: storeStaff.profileImageUrl
    },
    capabilities,
    portal: 'operations' as const,
    defaultRoute: isManager ? 'store-manager/dashboard' : 'store/dashboard',
    storeStaff
  };
}
