import { CROSS_APP_API_PATHS } from '@hopehub/clinic-api/cross-app-api-paths.constants';

export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  RTC_ICE_SERVERS: '/rtc/ice-servers',
  DOCTOR: {
    WORKLIST: CROSS_APP_API_PATHS.DOCTOR.WORKLIST,
    PROFILE: '/doctor/profile',
    PROFILE_IMAGE: '/me/profile-image',
    PAYMENTS_SUMMARY: '/doctor/payments/summary',
    MY_PAYSLIP: '/doctor/my-payslip',
    SLOTS: '/doctor/slots',
    PRESCRIPTION_OPTIONS: '/doctor/prescription-options',
    DISEASES: '/doctor/diseases',
    DISEASE_CATEGORIES: '/doctor/diseases/categories',
    DISEASE_PUBLIC_PAGE: (id: string) => `/doctor/diseases/${id}/public-page`,
    BLOG: '/doctor/blog',
    BLOG_BY_ID: (id: string) => `/doctor/blog/${id}`,
    ONLINE_PROFILE: '/doctor/online-profile',
    ONLINE_STATUS: '/doctor/online-status',
    ONLINE_HEARTBEAT: '/doctor/online-heartbeat',
    INSTANT_CONSULTATIONS: '/doctor/instant-consultations',
    PRESCRIPTION_TEMPLATES: '/doctor/prescription-templates',
    PRESCRIPTIONS: '/doctor/prescriptions',
    PRESCRIPTION_PDF: (id: string) => `/patient/prescriptions/${id}/pdf`,
    PRESCRIPTION_SHARE: (id: string) => `/patient/prescriptions/${id}/share`,
    APPOINTMENT_PRESCRIPTIONS: CROSS_APP_API_PATHS.DOCTOR.APPOINTMENT_PRESCRIPTIONS,
    REPERTORY_SOURCES: '/doctor/repertory/sources',
    REPERTORY_MM_SOURCES: '/doctor/repertory/materia-medica/sources',
    REPERTORY_MM_SEARCH: '/doctor/repertory/materia-medica/search',
    REPERTORY_CHAPTERS: '/doctor/repertory/chapters',
    REPERTORY_CHAPTER_RUBRICS: '/doctor/repertory/chapter/rubrics',
    REPERTORY_RUBRICS_SEARCH: '/doctor/repertory/rubrics/search',
    REPERTORY_RUBRICS_SUGGEST: '/doctor/repertory/rubrics/suggest',
    REPERTORY_REMEDIES_SEARCH: '/doctor/repertory/remedies/search',
    REPERTORY_PRACTICE_SESSION: '/doctor/repertory/practice-session',
    CONSULTATION_CASE_ANALYSES: CROSS_APP_API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES,
    CASE_ANALYSIS: CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS,
    CASE_ANALYSIS_FIELD_SUGGESTIONS: CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS_FIELD_SUGGESTIONS,
    CASE_ANALYSIS_SUGGEST_REMEDIES: CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS_SUGGEST_REMEDIES,
    CASE_ANALYSIS_REPERTORIZE: (analysisId: string) => `/doctor/case-analyses/${analysisId}/repertorize`,
    CASE_ANALYSIS_SELECT_REMEDY: (analysisId: string) => `/doctor/case-analyses/${analysisId}/select-remedy`,
    REPERTORY_REMEDY_MATERIA_MEDICA: (remedyId: string) => `/doctor/repertory/remedies/${remedyId}/materia-medica`,
    PATIENT_CASE_HISTORY: CROSS_APP_API_PATHS.DOCTOR.PATIENT_CASE_HISTORY,
    CLINICAL_MEDIA_OBSERVATION_HINTS: '/doctor/clinical-media/observation-hints',
    CLINICAL_MEDIA_SUGGEST_PHRASES: '/doctor/clinical-media/suggest-rubric-phrases',
    CLINICAL_MEDIA_VISION_STATUS: '/doctor/clinical-media/vision-status',
    CLINICAL_MEDIA_META: '/clinical-media/meta',
    CLINICAL_MEDIA_FILE: (id: string) => `/clinical-media/${id}/file`,
    PATIENT_CLINICAL_MEDIA: (patientId: string) => `/doctor/patients/${patientId}/clinical-media`,
    PATIENT_CLINICAL_MEDIA_ITEM: (patientId: string, mediaId: string) =>
      `/doctor/patients/${patientId}/clinical-media/${mediaId}`,
    CASE_ANALYSIS_CLINICAL_MEDIA: (analysisId: string) => `/doctor/case-analyses/${analysisId}/clinical-media`,
    CASE_ANALYSIS_CLINICAL_MEDIA_ITEM: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}`,
    CASE_ANALYSIS_CLINICAL_MEDIA_FILE: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}/file`,
    CASE_ANALYSIS_CLINICAL_MEDIA_ANALYZE: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}/analyze-image`,
    CASE_ANALYSIS_CLINICAL_MEDIA_APPLY_INTERPRETATION: (analysisId: string, mediaId: string) =>
      `/doctor/case-analyses/${analysisId}/clinical-media/${mediaId}/apply-interpretation`
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
