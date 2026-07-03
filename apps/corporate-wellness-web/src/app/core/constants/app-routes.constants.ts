export const ROUTE_PATHS = {
  LOGIN: 'login',
  ORDERS: 'orders'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.ORDERS;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.ORDERS, label: 'Purchase orders', icon: '📦' }
] as const;
