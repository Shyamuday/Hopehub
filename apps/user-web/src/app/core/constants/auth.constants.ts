export const AUTH_TOKEN_KEY = 'clinic_token';

export const AUTH_PATHS = {
  REQUEST_OTP: '/auth/request-otp',
  PATIENT_LOGIN: '/auth/patient-login',
  PATIENT_LOGIN_SELECT: '/auth/patient-login/select',
  PATIENT_PASSWORD_SELECT: '/auth/patient-login/password-select',
  PATIENT_REGISTER: '/auth/patient-register',
  GOOGLE: '/auth/google',
  ME: '/me'
} as const;

export const ROLE_DASHBOARD_PATHS = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  PATIENT: '/patient/dashboard'
} as const;
