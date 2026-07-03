import { Role } from '@prisma/client';
import { RBAC_CAPABILITIES } from './rbac-matrix.constants.js';

export type PortalId = 'patient' | 'clinical' | 'operations' | 'partners' | 'store';

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
  SUPPLIER: 'partners',
  WAREHOUSE_MANAGER: 'partners',
  DELIVERY_EXECUTIVE: 'partners',
  DIAGNOSTIC_PARTNER: 'partners',
  CORPORATE_WELLNESS: 'partners',
  INSURANCE_PARTNER: 'partners'
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
  MARKETING: 'funnels'
};

export const PARTNERS_DEFAULT_ROUTE: Partial<Record<Role, string>> = {
  SUPPLIER: 'orders',
  WAREHOUSE_MANAGER: 'warehouse',
  DELIVERY_EXECUTIVE: 'deliveries',
  DIAGNOSTIC_PARTNER: 'lab-referrals',
  CORPORATE_WELLNESS: 'accounts',
  INSURANCE_PARTNER: 'claims',
  ADMIN: 'claims'
};

export function capabilitiesForRole(role: Role): string[] {
  return RBAC_CAPABILITIES.filter((cap) => cap.roles.includes(role)).map((cap) => cap.id);
}

export function portalForRole(role: Role): PortalId {
  return ROLE_PORTAL[role] ?? 'operations';
}

export function defaultRouteForRole(role: Role): string {
  const portal = portalForRole(role);
  if (portal === 'partners') {
    return PARTNERS_DEFAULT_ROUTE[role] ?? 'claims';
  }
  if (portal === 'clinical') return 'worklist';
  if (portal === 'patient') return 'dashboard';
  return OPERATIONS_DEFAULT_ROUTE[role] ?? 'dashboard';
}

export function sessionPayloadForUser(user: {
  id: string;
  role: Role;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
}) {
  const capabilities = capabilitiesForRole(user.role);
  const portal = portalForRole(user.role);
  return {
    user,
    capabilities,
    portal,
    defaultRoute: defaultRouteForRole(user.role)
  };
}
