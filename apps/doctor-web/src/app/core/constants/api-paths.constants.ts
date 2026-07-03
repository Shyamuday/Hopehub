export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  DOCTOR: {
    WORKLIST: '/doctor/worklist',
    PROFILE: '/doctor/profile',
    PAYMENTS_SUMMARY: '/doctor/payments/summary',
    MY_PAYSLIP: '/doctor/my-payslip',
    SLOTS: '/doctor/slots',
    PRESCRIPTION_OPTIONS: '/doctor/prescription-options',
    PRESCRIPTION_TEMPLATES: '/doctor/prescription-templates',
    PRESCRIPTIONS: '/doctor/prescriptions',
    PRESCRIPTION_PDF: (id: string) => `/patient/prescriptions/${id}/pdf`,
    PRESCRIPTION_SHARE: (id: string) => `/patient/prescriptions/${id}/share`,
    APPOINTMENT_PRESCRIPTIONS: (consultationId: string) => `/doctor/appointments/${consultationId}/prescriptions`,
    REPERTORY_SOURCES: '/doctor/repertory/sources',
    REPERTORY_RUBRICS_SEARCH: '/doctor/repertory/rubrics/search',
    CONSULTATION_CASE_ANALYSES: (consultationId: string) => `/doctor/consultations/${consultationId}/case-analyses`,
    CASE_ANALYSIS: (analysisId: string) => `/doctor/case-analyses/${analysisId}`,
    CASE_ANALYSIS_REPERTORIZE: (analysisId: string) => `/doctor/case-analyses/${analysisId}/repertorize`,
    CASE_ANALYSIS_SELECT_REMEDY: (analysisId: string) => `/doctor/case-analyses/${analysisId}/select-remedy`,
    REPERTORY_REMEDY_MATERIA_MEDICA: (remedyId: string) => `/doctor/repertory/remedies/${remedyId}/materia-medica`
  },
  HR: {
    SELF_DOCTOR_LEAVES: '/hr/self/doctor-leaves',
    SELF_DOCTOR_LEAVE: '/hr/self/doctor-leave'
  },
  PATIENTS: {
    SEARCH: '/patients/search',
    BY_MOBILE: (mobile: string) => `/patients/by-mobile/${encodeURIComponent(mobile)}`,
    DETAIL: (id: string) => `/patients/${id}`,
    CREATE: '/patients',
    ADHERENCE_TREND: (id: string) => `/doctor/patients/${id}/adherence-trend`,
    DOSE_EVENTS: (id: string) => `/doctor/patients/${id}/dose-events`,
    LAB_REFERRALS: (id: string) => `/doctor/patients/${id}/lab-referrals`
  }
} as const;
