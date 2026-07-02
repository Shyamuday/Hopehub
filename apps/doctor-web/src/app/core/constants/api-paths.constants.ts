export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  DOCTOR: {
    PROFILE: '/doctor/profile',
    PAYMENTS_SUMMARY: '/doctor/payments/summary',
    SLOTS: '/doctor/slots',
    PRESCRIPTION_OPTIONS: '/doctor/prescription-options',
    PRESCRIPTION_TEMPLATES: '/doctor/prescription-templates',
    PRESCRIPTIONS: '/doctor/prescriptions',
    APPOINTMENT_PRESCRIPTIONS: (consultationId: string) => `/doctor/appointments/${consultationId}/prescriptions`
  },
  HR: {
    SELF_DOCTOR_LEAVES: '/hr/self/doctor-leaves',
    SELF_DOCTOR_LEAVE: '/hr/self/doctor-leave'
  },
  PATIENTS: {
    ADHERENCE_TREND: (id: string) => `/doctor/patients/${id}/adherence-trend`,
    DOSE_EVENTS: (id: string) => `/doctor/patients/${id}/dose-events`
  }
} as const;
