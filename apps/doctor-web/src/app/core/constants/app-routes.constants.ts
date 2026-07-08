export const ROUTE_PATHS = {
  LOGIN: 'login',

  WORKLIST: 'worklist',

  DASHBOARD: 'dashboard',

  APPOINTMENTS: 'appointments',

  REPERTORY: 'repertory',

  CASE_ANALYSIS_STUDIO: 'case-analysis',

  REPERTORY_BROWSER: 'repertory-browser',

  CASE_ANALYSIS: 'consultations',

  PATIENTS: 'patients',

  PROFILE: 'profile',

  LEAVES: 'leaves',

  SLOTS: 'slots',

  EARNINGS: 'earnings',

  PATIENT_SCAN: 'scan/patient',

  SCAN: 'scan',

  DISEASE_PAGES: 'disease-pages',

  BLOG: 'blog',

  ONLINE_DOCTOR: 'online-doctor',

  NOTIFICATIONS_INBOX: 'notifications-inbox',
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.WORKLIST;
