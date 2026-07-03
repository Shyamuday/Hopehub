export const ROUTE_PATHS = {
  LOGIN: 'login',
  ADMIN_DASHBOARD: 'admin-dashboard',
  ECOSYSTEM_USERS: 'ecosystem-users',
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  DOCTORS: 'doctors',
  STORE_STAFF: 'store-staff',
  LEAVES: 'leaves',
  STORES: 'stores',
  PAYROLL: 'payroll',
  WALK_IN: 'walk-in',
  QUEUE: 'queue',
  CLINIC_DASHBOARD: 'clinic-dashboard',
  ROSTER: 'roster',
  SCHEDULES: 'schedules',
  FINANCE: 'finance',
  BRANCH_DASHBOARD: 'branch-dashboard',
  FOLLOW_UPS: 'follow-ups',
  PATIENTS: 'patients',
  CONSULTATIONS: 'consultations',
  FUNNELS: 'funnels'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

/** Maps child route segments to required RBAC capability ids. */
export const ROUTE_CAPABILITIES: Record<string, string> = {
  [ROUTE_PATHS.ADMIN_DASHBOARD]: 'admin.dashboard',
  [ROUTE_PATHS.ECOSYSTEM_USERS]: 'admin.ecosystem_users',
  [ROUTE_PATHS.DASHBOARD]: 'hr.portal',
  [ROUTE_PATHS.EMPLOYEES]: 'hr.portal',
  [ROUTE_PATHS.DOCTORS]: 'hr.portal',
  [ROUTE_PATHS.STORE_STAFF]: 'hr.portal',
  [ROUTE_PATHS.STORES]: 'hr.portal',
  [ROUTE_PATHS.LEAVES]: 'hr.portal',
  [ROUTE_PATHS.PAYROLL]: 'hr.portal',
  [ROUTE_PATHS.WALK_IN]: 'receptionist.portal',
  [ROUTE_PATHS.QUEUE]: 'receptionist.portal',
  [ROUTE_PATHS.CLINIC_DASHBOARD]: 'clinic_manager.portal',
  [ROUTE_PATHS.ROSTER]: 'clinic_manager.portal',
  [ROUTE_PATHS.SCHEDULES]: 'clinic_manager.portal',
  [ROUTE_PATHS.FINANCE]: 'accountant.portal',
  [ROUTE_PATHS.BRANCH_DASHBOARD]: 'branch_owner.portal',
  [ROUTE_PATHS.FOLLOW_UPS]: 'coordinator.portal',
  [ROUTE_PATHS.PATIENTS]: 'call_center.portal',
  [ROUTE_PATHS.CONSULTATIONS]: 'call_center.portal',
  [ROUTE_PATHS.FUNNELS]: 'marketing.portal'
};
