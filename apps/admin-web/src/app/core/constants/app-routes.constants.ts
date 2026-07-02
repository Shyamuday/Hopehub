export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  DOCTORS: 'doctors',
  CONSUMERS: 'consumers',
  DISEASES: 'diseases',
  HR: 'hr',
  HR_USERS: 'hr-users',
  EMPLOYEES: 'employees',
  LEAVES: 'leaves',
  STORES: 'stores',
  CONSULTATIONS: 'consultations',
  PAYROLL: 'payroll'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard' },
  { path: `/${ROUTE_PATHS.DOCTORS}`, label: 'Doctors' },
  { path: `/${ROUTE_PATHS.CONSUMERS}`, label: 'Consumers' },
  { path: `/${ROUTE_PATHS.DISEASES}`, label: 'Diseases' },
  { path: `/${ROUTE_PATHS.HR}`, label: '🪪 Doctor HR' },
  { path: `/${ROUTE_PATHS.HR_USERS}`, label: '👥 HR Managers' },
  { path: `/${ROUTE_PATHS.EMPLOYEES}`, label: '👥 Employees' },
  { path: `/${ROUTE_PATHS.LEAVES}`, label: '📋 Leaves' },
  { path: `/${ROUTE_PATHS.STORES}`, label: '🏪 Stores' },
  { path: `/${ROUTE_PATHS.CONSULTATIONS}`, label: '🩺 Consultations' },
  { path: `/${ROUTE_PATHS.PAYROLL}`, label: '💰 Payroll' }
] as const;
