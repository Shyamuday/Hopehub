export const API_PATHS = {
  DISEASES: '/diseases',
  HR: {
    DASHBOARD: '/hr/dashboard',
    EMPLOYEES: '/hr/employees',
    DOCTORS: '/hr/doctors',
    STORE_STAFF: '/hr/store/staff',
    LEAVES: '/hr/leaves',
    STORES: '/hr/stores'
  },
  RECEPTION: {
    ME: '/reception/me',
    QUEUE: '/reception/queue',
    PATIENTS_SEARCH: '/reception/patients/search',
    DOCTORS: '/reception/doctors',
    WALK_IN: '/reception/walk-in',
    CONSULTATIONS: '/reception/consultations',
    COLLECT_CASH: (id: string) => `/reception/consultations/${id}/collect-cash`,
    ASSIGN: (id: string) => `/reception/consultations/${id}/assign`
  },
  CLINIC_MANAGER: {
    ME: '/clinic-manager/me',
    DASHBOARD: '/clinic-manager/dashboard',
    ROSTER: '/clinic-manager/roster',
    SCHEDULES: '/clinic-manager/schedules'
  },
  ACCOUNTANT: {
    ME: '/accountant/me',
    SUMMARY: '/accountant/summary',
    BRANCHES: '/accountant/branches',
    EXPORT_BUNDLE: '/accountant/export-bundle'
  },
  BRANCH_OWNER: {
    ME: '/branch-owner/me',
    DASHBOARD: '/branch-owner/dashboard'
  },
  COORDINATOR: {
    ME: '/coordinator/me',
    FOLLOW_UPS: '/coordinator/follow-ups'
  },
  CALL_CENTER: {
    ME: '/call-center/me',
    PATIENT_SEARCH: '/call-center/patients/search',
    RECENT_CONSULTATIONS: '/call-center/consultations/recent'
  },
  MARKETING: {
    ME: '/marketing/me',
    FUNNELS: '/marketing/funnels'
  }
} as const;
