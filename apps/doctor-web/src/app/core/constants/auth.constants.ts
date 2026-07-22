export const AUTH_TOKEN_KEY = 'doctor_app_token';

export const AUTH_PATHS = {
  STAFF_LOGIN: '/auth/staff-login',
  PROVIDER_ENROLL: '/provider/enroll',
  DOCTOR_ENROLL: '/provider/enroll',
  ME: '/me',
} as const;

export const AUTH_MESSAGES = {
  CREDENTIALS_REQUIRED: 'Email and password are required.',
  INVALID_LOGIN: 'Invalid login or API unavailable.',
  ENROLL_REQUIRED_FIELDS: 'Name, email, and password are required.',
  ENROLL_DEFAULT_SUCCESS: 'Enrollment submitted. Wait for admin approval.',
  ENROLL_FAILED: 'Could not enroll provider account.',
} as const;
