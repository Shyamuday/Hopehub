export const AUTH_TOKEN_KEY = 'clinic_token';

export const AUTH_PATHS = {
  REQUEST_OTP: '/auth/request-otp',
  PATIENT_LOGIN: '/auth/patient-login',
  PATIENT_REGISTER: '/auth/patient-register',
  STAFF_LOGIN: '/auth/staff-login',
  GOOGLE: '/auth/google',
  FORGOT_PASSWORD: '/auth/forgot-password',
  ME: '/me'
} as const;

export const ROLE_DASHBOARD_PATHS = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  PATIENT: '/patient/dashboard'
} as const;
