export const API_BASE = {
  STORE: '/store'
} as const;

export const STORE_API_PATHS = {
  AUTH: {
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
  PATIENTS: {
    SEARCH: '/patients/search',
    CREATE: '/patients',
    BY_MOBILE: (mobile: string) => `/patients/by-mobile/${encodeURIComponent(mobile)}`
  },
  SCAN_PATIENT: (patientCode: string) => `/scan/patient/${encodeURIComponent(patientCode)}`,
  SCAN_DOSE_GIVE: (doseId: string) => `/scan/dose-events/${encodeURIComponent(doseId)}/give`,
  HR: {
    STAFF: '/hr/staff',
    STAFF_DETAIL: (id: string) => `/hr/staff/${id}`,
    STAFF_LETTER: (id: string) => `/hr/staff/${id}/letter`
  },
  PURCHASE_ORDERS: '/purchase-orders',
  PURCHASE_ORDER: (id: string) => `/purchase-orders/${id}`,
  PURCHASE_ORDER_GRN: (id: string) => `/purchase-orders/${id}/grn`,
  STOCK_TRANSFERS: '/stock-transfers',
  STOCK_TRANSFER_RECEIVE: (id: string) => `/stock-transfers/${id}/receive`,
  DELIVERIES: '/deliveries'
} as const;
