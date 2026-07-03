export const ROUTE_PATHS = {
  LOGIN: 'login',
  QUEUE: 'queue',
  WALK_IN: 'walk-in'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.QUEUE;

export const NAV_ITEMS = [
  { path: ROUTE_PATHS.QUEUE, label: 'Queue', icon: '📋' },
  { path: ROUTE_PATHS.WALK_IN, label: 'Walk-in', icon: '🚶' }
] as const;
