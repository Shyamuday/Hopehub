import { CROSS_APP_API_PATHS } from '@hopehub/clinic-api/cross-app-api-paths.constants';

function providerPath(path: string) {
  return path.replace(/^\/doctor(?=\/|$)/, '/provider');
}

const PROVIDER_API_PATHS = {
  WORKLIST: providerPath(CROSS_APP_API_PATHS.DOCTOR.WORKLIST),
  PROFILE: '/provider/profile',
  PROFILE_IMAGE: '/me/profile-image',
  PAYMENTS_SUMMARY: '/provider/payments/summary',
  MY_PAYSLIP: '/provider/my-payslip',
  SLOTS: '/provider/slots',
  PRESCRIPTION_OPTIONS: '/provider/prescription-options',
  DISEASES: '/provider/diseases',
  DISEASE_CATEGORIES: '/provider/diseases/categories',
  DISEASE_PUBLIC_PAGE: (id: string) => `/provider/diseases/${id}/public-page`,
  BLOG: '/provider/blog',
  BLOG_BY_ID: (id: string) => `/provider/blog/${id}`,
  ONLINE_PROFILE: '/provider/online-profile',
  ONLINE_STATUS: '/provider/online-status',
  ONLINE_HEARTBEAT: '/provider/online-heartbeat',
  INSTANT_CONSULTATIONS: '/provider/instant-consultations',
  PRESCRIPTION_TEMPLATES: '/provider/prescription-templates',
  PRESCRIPTIONS: '/provider/prescriptions',
  PRESCRIPTION_PDF: (id: string) => `/patient/prescriptions/${id}/pdf`,
  PRESCRIPTION_SHARE: (id: string) => `/patient/prescriptions/${id}/share`,
  APPOINTMENT_PRESCRIPTIONS: (id: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.APPOINTMENT_PRESCRIPTIONS(id)),
  REPERTORY_SOURCES: '/provider/repertory/sources',
  REPERTORY_MM_SOURCES: '/provider/repertory/materia-medica/sources',
  REPERTORY_MM_SEARCH: '/provider/repertory/materia-medica/search',
  REPERTORY_CHAPTERS: '/provider/repertory/chapters',
  REPERTORY_CHAPTER_RUBRICS: '/provider/repertory/chapter/rubrics',
  REPERTORY_RUBRICS_SEARCH: '/provider/repertory/rubrics/search',
  REPERTORY_RUBRICS_SUGGEST: '/provider/repertory/rubrics/suggest',
  REPERTORY_REMEDIES_SEARCH: '/provider/repertory/remedies/search',
  REPERTORY_PRACTICE_SESSION: '/provider/repertory/practice-session',
  CONSULTATION_CASE_ANALYSES: (consultationId: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES(consultationId)),
  CASE_ANALYSIS: (analysisId: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS(analysisId)),
  CASE_ANALYSIS_FIELD_SUGGESTIONS: (analysisId: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS_FIELD_SUGGESTIONS(analysisId)),
  CASE_ANALYSIS_SUGGEST_REMEDIES: (analysisId: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.CASE_ANALYSIS_SUGGEST_REMEDIES(analysisId)),
  CASE_ANALYSIS_REPERTORIZE: (analysisId: string) =>
    `/provider/case-analyses/${analysisId}/repertorize`,
  CASE_ANALYSIS_SELECT_REMEDY: (analysisId: string) =>
    `/provider/case-analyses/${analysisId}/select-remedy`,
  REPERTORY_REMEDY_MATERIA_MEDICA: (remedyId: string) =>
    `/provider/repertory/remedies/${remedyId}/materia-medica`,
  PATIENT_CASE_HISTORY: (patientId: string) =>
    providerPath(CROSS_APP_API_PATHS.DOCTOR.PATIENT_CASE_HISTORY(patientId)),
  CLINICAL_MEDIA_OBSERVATION_HINTS: '/provider/clinical-media/observation-hints',
  CLINICAL_MEDIA_SUGGEST_PHRASES: '/provider/clinical-media/suggest-rubric-phrases',
  CLINICAL_MEDIA_VISION_STATUS: '/provider/clinical-media/vision-status',
  CLINICAL_MEDIA_META: '/clinical-media/meta',
  CLINICAL_MEDIA_FILE: (id: string) => `/clinical-media/${id}/file`,
  PATIENT_CLINICAL_MEDIA: (patientId: string) => `/provider/patients/${patientId}/clinical-media`,
  PATIENT_CLINICAL_MEDIA_ITEM: (patientId: string, mediaId: string) =>
    `/provider/patients/${patientId}/clinical-media/${mediaId}`,
  CASE_ANALYSIS_CLINICAL_MEDIA: (analysisId: string) =>
    `/provider/case-analyses/${analysisId}/clinical-media`,
  CASE_ANALYSIS_CLINICAL_MEDIA_ITEM: (analysisId: string, mediaId: string) =>
    `/provider/case-analyses/${analysisId}/clinical-media/${mediaId}`,
  CASE_ANALYSIS_CLINICAL_MEDIA_FILE: (analysisId: string, mediaId: string) =>
    `/provider/case-analyses/${analysisId}/clinical-media/${mediaId}/file`,
  CASE_ANALYSIS_CLINICAL_MEDIA_ANALYZE: (analysisId: string, mediaId: string) =>
    `/provider/case-analyses/${analysisId}/clinical-media/${mediaId}/analyze-image`,
  CASE_ANALYSIS_CLINICAL_MEDIA_APPLY_INTERPRETATION: (analysisId: string, mediaId: string) =>
    `/provider/case-analyses/${analysisId}/clinical-media/${mediaId}/apply-interpretation`,
} as const;

export const API_PATHS = {
  CONSULTATIONS: '/consultations',
  RTC_ICE_SERVERS: '/rtc/ice-servers',
  PROVIDER: PROVIDER_API_PATHS,
  DOCTOR: PROVIDER_API_PATHS,
  HR: {
    SELF_DOCTOR_LEAVES: '/hr/self/doctor-leaves',
    SELF_DOCTOR_LEAVE: '/hr/self/doctor-leave',
  },
  PATIENTS: {
    SEARCH: '/patients/search',
    BY_MOBILE: (mobile: string) => `/patients/by-mobile/${encodeURIComponent(mobile)}`,
    DETAIL: (id: string) => `/patients/${id}`,
    CREATE: '/patients',
    ADHERENCE_TREND: (id: string) => `/provider/patients/${id}/adherence-trend`,
    DOSE_EVENTS: (id: string) => `/provider/patients/${id}/dose-events`,
    LAB_REFERRALS: (id: string) => `/provider/patients/${id}/lab-referrals`,
  },
} as const;
