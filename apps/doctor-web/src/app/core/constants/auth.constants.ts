export const AUTH_TOKEN_KEY = 'doctor_app_token';
export const AUTH_REFRESH_TOKEN_KEY = 'doctor_app_refresh_token';
export const AUTH_SESSION_ID_KEY = 'doctor_app_session_id';

export const AUTH_PATHS = {
  STAFF_LOGIN: '/auth/staff-login',
  STAFF_GOOGLE_LOGIN: '/auth/staff-login-google',
  GOOGLE_CONFIG: '/auth/google-config',
  DOCTOR_ENROLL: '/doctor/enroll',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  ME: '/me',
} as const;

export const AUTH_MESSAGES = {
  CREDENTIALS_REQUIRED: 'Email and password are required.',
  INVALID_LOGIN: 'Invalid login or API unavailable.',
  ENROLL_REQUIRED_FIELDS: 'Name, email, password, and specialty/support focus are required.',
  ENROLL_DEFAULT_SUCCESS:
    'Provider account created. Log in to complete your setup before appearing on Hope Hub.',
  ENROLL_FAILED: 'Could not enroll provider account.',
} as const;
