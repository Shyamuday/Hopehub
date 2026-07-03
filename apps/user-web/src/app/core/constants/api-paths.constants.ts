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
    PRESCRIPTION_SHARE: (id: string) => `/patient/prescriptions/${id}/share`,
    TODAY_DOSES: '/patient/today-doses',
    MEDICINE_REMINDERS: '/patient/medicine-reminders',
    DOSE_TAKE: (id: string) => `/patient/dose-events/${id}/take`,
    DOSE_SKIP: (id: string) => `/patient/dose-events/${id}/skip`,
    DOSE_SNOOZE: (id: string) => `/patient/dose-events/${id}/snooze`,
    DOSE_EXPLAIN: (id: string) => `/patient/dose-events/${id}/explain`,
    REMINDER_PREFERENCES: '/patient/reminder-preferences',
    PROFILE: '/patient/profile',
    CARD: '/patient/card',
    LAB_RESULTS: '/patient/lab-results'
  },
  ADMIN: {
    DOCTORS: '/admin/doctors',
    REPORTS: '/admin/reports'
  },
  ANALYTICS: {
    EVENTS: '/analytics/events'
  }
} as const;
