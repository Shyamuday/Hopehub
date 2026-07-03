export const ROUTE_PATHS = {
  LOGIN: 'login',
  REFERRALS: 'referrals'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.REFERRALS;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.REFERRALS, label: 'Lab referrals', icon: '🔬' }
] as const;
