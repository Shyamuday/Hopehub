export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.DASHBOARD, label: 'Branch dashboard', icon: '📊' }
] as const;
