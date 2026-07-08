/** Shared API paths used across admin-web, doctor-web, user-web, and operations-web. */
export const CROSS_APP_API_PATHS = {
  PATIENT: {
    REWARDS: '/patient/rewards',
    REWARDS_CHECKOUT_QUOTE: '/patient/rewards/checkout-quote',
    REFERRALS_SUMMARY: '/patient/referrals/summary'
  },
  DOCTOR: {
    WORKLIST: '/doctor/worklist',
    APPOINTMENT_PRESCRIPTIONS: (consultationId: string) => `/doctor/appointments/${consultationId}/prescriptions`,
    CONSULTATION_CASE_ANALYSES: (consultationId: string) => `/doctor/consultations/${consultationId}/case-analyses`,
    CASE_ANALYSIS: (analysisId: string) => `/doctor/case-analyses/${analysisId}`,
    CASE_ANALYSIS_FIELD_SUGGESTIONS: (analysisId: string) => `/doctor/case-analyses/${analysisId}/field-suggestions`,
    PATIENT_CASE_HISTORY: (patientId: string) => `/doctor/patients/${patientId}/case-history`
  },
  ADMIN: {
    CLINICAL_METHOD_OPTIONS: '/admin/clinical-records/method-options',
    PRESCRIPTIONS: '/admin/prescriptions',
    PRESCRIPTION_BY_ID: (id: string) => `/admin/prescriptions/${id}`,
    CASE_ANALYSES: '/admin/case-analyses',
    CASE_ANALYSIS_BY_ID: (id: string) => `/admin/case-analyses/${id}`,
    REWARD_WALLET: (patientId: string) => `/admin/rewards/wallet/${patientId}`,
    PATIENT_CLINICAL_MEDIA: (patientId: string) => `/admin/patients/${patientId}/clinical-media`
  },
  RECEPTION: {
    PATIENT_REWARDS: (patientId: string) => `/reception/patients/${patientId}/rewards`,
    PATIENT_CHECKOUT_QUOTE: (patientId: string) => `/reception/patients/${patientId}/checkout-quote`,
    CHECKOUT_QUOTE: '/reception/checkout-quote'
  }
} as const;
