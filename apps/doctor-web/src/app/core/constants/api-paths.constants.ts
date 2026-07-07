import { CROSS_APP_API_PATHS } from '@vitalis/clinic-api/cross-app-api-paths.constants';

export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  DOCTOR: {
    WORKLIST: CROSS_APP_API_PATHS.DOCTOR.WORKLIST,
    PROFILE: '/doctor/profile',
    PROFILE_IMAGE: '/me/profile-image',
    PAYMENTS_SUMMARY: '/doctor/payments/summary',
    MY_PAYSLIP: '/doctor/my-payslip',
    SLOTS: '/doctor/slots',
    PRESCRIPTION_OPTIONS: '/doctor/prescription-options',
    PRESCRIPTION_TEMPLATES: '/doctor/prescription-templates',
    PRESCRIPTIONS: '/doctor/prescriptions',
    PRESCRIPTION_PDF: (id: string) => `/patient/prescriptions/${id}/pdf`,
    PRESCRIPTION_SHARE: (id: string) => `/patient/prescriptions/${id}/share`,
    APPOINTMENT_PRESCRIPTIONS: CROSS_APP_API_PATHS.DOCTOR.APPOINTMENT_PRESCRIPTIONS,
    REPERTORY_SOURCES: '/doctor/repertory/sources',
    REPERTORY_RUBRICS_SEARCH: '/doctor/repertory/rubrics/search',
    REPERTORY_PRACTICE_SESSION: '/doctor/repertory/practice-session',
    CONSULTATION_CASE_ANALYSES: CROSS_APP_API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES,
    CASE_ANALYSIS: CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS,
    CASE_ANALYSIS_REPERTORIZE: (analysisId: string) => `/doctor/case-analyses/${analysisId}/repertorize`,
    CASE_ANALYSIS_SELECT_REMEDY: (analysisId: string) => `/doctor/case-analyses/${analysisId}/select-remedy`,
    REPERTORY_REMEDY_MATERIA_MEDICA: (remedyId: string) => `/doctor/repertory/remedies/${remedyId}/materia-medica`,
    PATIENT_CASE_HISTORY: CROSS_APP_API_PATHS.DOCTOR.PATIENT_CASE_HISTORY,
    CLINICAL_MEDIA_OBSERVATION_HINTS: '/doctor/clinical-media/observation-hints',
    CLINICAL_MEDIA_SUGGEST_PHRASES: '/doctor/clinical-media/suggest-rubric-phrases',
    CLINICAL_MEDIA_META: '/clinical-media/meta',
    CLINICAL_MEDIA_FILE: (id: string) => `/clinical-media/${id}/file`,
    PATIENT_CLINICAL_MEDIA: (patientId: string) => `/doctor/patients/${patientId}/clinical-media`,
    PATIENT_CLINICAL_MEDIA_ITEM: (patientId: string, mediaId: string) =>
      `/doctor/patients/${patientId}/clinical-media/${mediaId}`,
    CASE_ANALYSIS_CLINICAL_MEDIA: (analysisId: string) => `/doctor/case-analyses/${analysisId}/clinical-media`,
    CASE_ANALYSIS_CLINICAL_MEDIA_ITEM: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}`,
    CASE_ANALYSIS_CLINICAL_MEDIA_FILE: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}/file`
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
