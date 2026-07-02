export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  BILLING_PLANS: '/billing/plans',
  PAYMENTS: {
    CREATE_ORDER: (consultationId: string) => `/payments/${consultationId}/create-order`,
    VERIFY: (consultationId: string) => `/payments/${consultationId}/verify`
  },
  PATIENT: {
    PRESCRIPTIONS: '/patient/prescriptions',
    PRESCRIPTION_PDF: (id: string) => `/patient/prescriptions/${id}/pdf`,
    TODAY_DOSES: '/patient/today-doses',
    DOSE_TAKE: (id: string) => `/patient/dose-events/${id}/take`,
    DOSE_SKIP: (id: string) => `/patient/dose-events/${id}/skip`,
    DOSE_SNOOZE: (id: string) => `/patient/dose-events/${id}/snooze`,
    REMINDER_PREFERENCES: '/patient/reminder-preferences',
    PROFILE: '/patient/profile'
  },
  ADMIN: {
    DOCTORS: '/admin/doctors',
    REPORTS: '/admin/reports'
  }
} as const;
