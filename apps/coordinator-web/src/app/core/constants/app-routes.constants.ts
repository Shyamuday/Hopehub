export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  ROSTER: 'roster',
  SCHEDULES: 'schedules'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.DASHBOARD, label: 'Dashboard', icon: '📊' },
  { path: ROUTE_PATHS.ROSTER, label: 'Roster', icon: '👥' },
  { path: ROUTE_PATHS.SCHEDULES, label: 'Schedules', icon: '🗓️' }
] as const;
