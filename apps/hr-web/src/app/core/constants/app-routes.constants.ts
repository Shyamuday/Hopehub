export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  DOCTORS: 'doctors',
  STORE_STAFF: 'store-staff',
  LEAVES: 'leaves',
  STORES: 'stores'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard', icon: '📊' },
  { path: `/${ROUTE_PATHS.EMPLOYEES}`, label: 'Employees', icon: '👥' },
  { path: `/${ROUTE_PATHS.DOCTORS}`, label: 'Doctors', icon: '🩺' },
  { path: `/${ROUTE_PATHS.STORE_STAFF}`, label: 'Store Staff', icon: '🧑‍💼' },
  { path: `/${ROUTE_PATHS.STORES}`, label: 'Stores', icon: '🏪' },
  { path: `/${ROUTE_PATHS.LEAVES}`, label: 'Leaves', icon: '📋' }
] as const;
