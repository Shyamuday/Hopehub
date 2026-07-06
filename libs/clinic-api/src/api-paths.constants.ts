export const API_PATHS = {
  DISEASES: '/diseases',
  PUBLIC_CONFIG: '/public-config',
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
    ASSIGN: (id: string) => `/reception/consultations/${id}/assign`,
    VISITOR_LEADS: '/admin/visitor-leads',
    VISITOR_LEAD_STATS: '/admin/visitor-leads/stats',
    VISITOR_LEAD_META: '/admin/visitor-leads/meta',
    VISITOR_LEAD_BY_ID: (id: string) => `/admin/visitor-leads/${id}`,
    VISITOR_LEAD_FOLLOW_UP: (id: string) => `/admin/visitor-leads/${id}/follow-up`,
    VISITOR_LEAD_BOOK: (id: string) => `/admin/visitor-leads/${id}/book-consultation`,
    VISITOR_LEAD_OPERATOR_MESSAGE: (id: string) => `/admin/visitor-leads/${id}/operator-message`
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
  },
  SUPPLIER: {
    ME: '/supplier/me',
    ORDERS: '/supplier/purchase-orders',
    ORDER: (id: string) => `/supplier/purchase-orders/${id}`,
    CONFIRM: (id: string) => `/supplier/purchase-orders/${id}/confirm`
  },
  WAREHOUSE: {
    ME: '/warehouse/me',
    DASHBOARD: '/warehouse/dashboard',
    BRANCHES: '/warehouse/branches',
    TRANSFERS: '/warehouse/transfers',
    TRANSFER: (id: string) => `/warehouse/transfers/${id}`,
    DISPATCH: (id: string) => `/warehouse/transfers/${id}/dispatch`
  },
  DELIVERY: {
    ME: '/delivery/me',
    DASHBOARD: '/delivery/dashboard',
    ORDERS: '/delivery/orders',
    ORDER: (id: string) => `/delivery/orders/${id}`,
    ACCEPT: (id: string) => `/delivery/orders/${id}/accept`,
    PICKUP: (id: string) => `/delivery/orders/${id}/pickup`,
    COMPLETE: (id: string) => `/delivery/orders/${id}/complete`,
    FAIL: (id: string) => `/delivery/orders/${id}/fail`
  },
  DIAGNOSTIC: {
    ME: '/diagnostic/me',
    REFERRALS: '/diagnostic/referrals',
    REFERRAL: (id: string) => `/diagnostic/referrals/${id}`,
    ACCEPT: (id: string) => `/diagnostic/referrals/${id}/accept`,
    ADVANCE: (id: string) => `/diagnostic/referrals/${id}/advance`,
    RESULTS: (id: string) => `/diagnostic/referrals/${id}/results`
  },
  CORPORATE_WELLNESS: {
    ME: '/corporate-wellness/me',
    ACCOUNTS: '/corporate-wellness/accounts',
    ENROLLMENTS: (id: string) => `/corporate-wellness/accounts/${id}/enrollments`
  },
  INSURANCE: {
    ME: '/insurance/me',
    CLAIMS: '/insurance/claims',
    CLAIM_STATUS: (id: string) => `/insurance/claims/${id}/status`
  },
  STORE: {
    AUTH: {
      LOGIN: '/store/auth/login',
      MANAGER_LOGIN: '/store/auth/manager-login'
    },
    DASHBOARD: '/store/dashboard',
    MEDICINES: '/store/medicines',
    RACKS: '/store/racks',
    STOCK: {
      ADD: '/store/stock/add',
      REMOVE: '/store/stock/remove'
    },
    ALERTS: {
      LOW_STOCK: '/store/alerts/low-stock',
      EXPIRING: '/store/alerts/expiring'
    },
    MOVEMENTS: '/store/movements',
    STAFF: {
      ACTIVITY: '/store/staff/activity',
      DETAIL_ACTIVITY: (staffId: string) => `/store/staff/${staffId}/activity`,
      MY_PAYSLIP: '/store/staff/my-payslip'
    },
    EXPENSES: '/store/expenses',
    PATIENTS: {
      SEARCH: '/store/patients/search',
      CREATE: '/store/patients',
      BY_MOBILE: (mobile: string) => `/store/patients/by-mobile/${encodeURIComponent(mobile)}`
    },
    SCAN_PATIENT: (patientCode: string) => `/store/scan/patient/${encodeURIComponent(patientCode)}`,
    SCAN_DOSE_GIVE: (doseId: string) => `/store/scan/dose-events/${encodeURIComponent(doseId)}/give`,
    HR: {
      STAFF: '/store/hr/staff',
      STAFF_DETAIL: (id: string) => `/store/hr/staff/${id}`,
      STAFF_LETTER: (id: string) => `/store/hr/staff/${id}/letter`
    },
    PURCHASE_ORDERS: '/store/purchase-orders',
    PURCHASE_ORDER: (id: string) => `/store/purchase-orders/${id}`,
    PURCHASE_ORDER_GRN: (id: string) => `/store/purchase-orders/${id}/grn`,
    STOCK_TRANSFERS: '/store/stock-transfers',
    STOCK_TRANSFER_RECEIVE: (id: string) => `/store/stock-transfers/${id}/receive`,
    DELIVERIES: '/store/deliveries'
  }
} as const;
