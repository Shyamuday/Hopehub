export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  TRANSFERS: 'transfers'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.DASHBOARD, label: 'Dashboard', icon: '📊' },
  { path: ROUTE_PATHS.TRANSFERS, label: 'Transfers', icon: '🚚' }
] as const;
