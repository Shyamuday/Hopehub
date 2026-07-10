export const AUTH_TOKEN_KEY = 'clinic_token';

export const AUTH_PATHS = {
  REQUEST_OTP: '/auth/request-otp',
  PATIENT_LOGIN: '/auth/patient-login',
  PATIENT_LOGIN_SELECT: '/auth/patient-login/select',
  PATIENT_PASSWORD_LOGIN: '/auth/patient-login-password',
  PATIENT_PASSWORD_SELECT: '/auth/patient-login/password-select',
  PATIENT_REGISTER: '/auth/patient-register',
  PATIENT_FORGOT_PASSWORD: '/auth/patient-forgot-password',
  PATIENT_RESET_PASSWORD: '/auth/patient-reset-password',
  GOOGLE: '/auth/google',
  ME: '/me',
} as const;

export const ROLE_DASHBOARD_PATHS = {
  // Doctors and admins have dedicated portals (doctor-web / operations-web).
  // If they land on user-web, redirect to home — they shouldn't be here.
  ADMIN: '/',
  DOCTOR: '/',
  PATIENT: '/patient/dashboard',
} as const;
