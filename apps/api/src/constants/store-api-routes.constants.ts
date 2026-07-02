export const STORE_API_ROUTES = {
  AUTH_LOGIN: '/auth/login',
  AUTH_MANAGER_LOGIN: '/auth/manager-login',
  DASHBOARD: '/dashboard',
  MEDICINES: '/medicines',
  MEDICINE_BY_ID: '/medicines/:id',
  RACKS: '/racks',
  STOCK_ADD: '/stock/add',
  STOCK_REMOVE: '/stock/remove',
  ALERTS_LOW_STOCK: '/alerts/low-stock',
  ALERTS_EXPIRING: '/alerts/expiring',
  MOVEMENTS: '/movements',
  STAFF_ACTIVITY: '/staff/activity',
  STAFF_DETAIL_ACTIVITY: '/staff/:staffId/activity'
} as const;

export const STORE_ROLES = {
  MANAGER: 'MANAGER',
  STAFF: 'STAFF'
} as const;

export const STORE_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 5,
  MAX_PAGE_SIZE: 50
} as const;

export const STORE_EXPIRY = {
  SOON_THRESHOLD_DAYS: 60,
  ALERT_DEFAULT_DAYS: 60,
  ALERT_MAX_DAYS: 365,
  DASHBOARD_SHORT_DAYS: 30,
  DASHBOARD_LONG_DAYS: 60
} as const;

export const STORE_AUTH_MESSAGES = {
  REQUIRED: 'Store authentication required.',
  INVALID_TOKEN: 'Invalid or expired store token.',
  MANAGER_REQUIRED: 'Manager access required.'
} as const;
