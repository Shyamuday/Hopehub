export const AUTH_TOKEN_KEY = 'admin_app_token';
export const AUTH_REFRESH_TOKEN_KEY = 'admin_app_refresh_token';
export const AUTH_SESSION_ID_KEY = 'admin_app_session_id';
export const AUTH_USER_KEY = 'admin_app_user';

export const STAFF_ROLES = {
  ADMIN: 'ADMIN',
  HR: 'HR',
} as const;

export const AUTH_PATHS = {
  STAFF_LOGIN: '/auth/staff-login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  ME: '/me',
} as const;

export const AUTH_MESSAGES = {
  ADMIN_ONLY: 'Only admin or HR staff can use this console.',
  INVALID_LOGIN: 'Invalid login or API unavailable.',
} as const;
