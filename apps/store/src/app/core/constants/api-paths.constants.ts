export const API_BASE = {
  STORE: '/store',
  HR: '/hr'
} as const;

export const STORE_API_PATHS = {
  AUTH: {
    LOGIN: '/auth/login',
    MANAGER_LOGIN: '/auth/manager-login'
  },
  DASHBOARD: '/dashboard',
  MEDICINES: '/medicines',
  RACKS: '/racks',
  STOCK: {
    ADD: '/stock/add',
    REMOVE: '/stock/remove'
  },
  ALERTS: {
    LOW_STOCK: '/alerts/low-stock',
    EXPIRING: '/alerts/expiring'
  },
  MOVEMENTS: '/movements',
  STAFF: {
    ACTIVITY: '/staff/activity',
    DETAIL_ACTIVITY: (staffId: string) => `/staff/${staffId}/activity`,
    MY_PAYSLIP: '/staff/my-payslip'
  },
  EXPENSES: '/expenses',
  SCAN_PATIENT: (patientCode: string) => `/scan/patient/${encodeURIComponent(patientCode)}`
} as const;

export const HR_API_PATHS = {
  STORE_STAFF: '/store/staff'
} as const;
