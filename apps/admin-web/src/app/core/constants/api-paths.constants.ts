export const API_PATHS = {
  AUTH: {
    STAFF_LOGIN: '/auth/staff-login',
    ME: '/me'
  },
  ADMIN: {
    REPORTS: '/admin/reports',
    AUDIT_LOGS: '/admin/audit-logs',
    ADHERENCE_RISK: '/admin/adherence/risk-cohorts',
    ANALYTICS_FUNNELS: '/admin/analytics/funnels',
    PAYMENTS: '/admin/payments',
    DOCTORS: '/admin/doctors',
    DOCTORS_PENDING: '/admin/doctors/pending',
    CONSUMERS: '/admin/consumers',
    PATIENTS_SEARCH: '/admin/patients/search',
    PATIENTS: '/admin/patients',
    PURCHASE_ORDERS: '/admin/purchase-orders',
    SUPPLIERS: '/admin/suppliers',
    MEDICINES: '/admin/medicines',
    CONSUMER_SUPPORT: (id: string) => `/admin/consumers/${id}/support`,
    CONSUMER_SUPPORT_NOTES: (id: string) => `/admin/consumers/${id}/support-notes`,
    DISEASES: '/admin/diseases',
    DISEASES_LIST: '/admin/diseases/list',
    FINANCE: {
      SUMMARY: '/admin/finance/summary',
      REVENUE_TREND: '/admin/finance/revenue/trend',
      REVENUE_BY_DOCTOR: '/admin/finance/revenue/by-doctor',
      REVENUE_BY_DISEASE: '/admin/finance/revenue/by-disease',
      MEDICINE_REVENUE: '/admin/finance/medicine-revenue',
      OUTSTANDING: '/admin/finance/outstanding',
      PAYSLIP: (type: string, id: string) => `/admin/finance/payslip/${type}/${id}`,
      EXPENSES: '/admin/finance/expenses',
      EXPENSES_SUMMARY: '/admin/finance/expenses/summary',
      BRANCHES: '/admin/finance/branches',
      EXPORT_BUNDLE: '/admin/finance/export-bundle'
    }
  },
  CONSULTATIONS: '/consultations',
  HR: {
    DOCTORS: '/hr/doctors',
    USERS: '/hr/users',
    EMPLOYEES: '/hr/employees',
    LEAVES: '/hr/leaves',
    STORES: '/hr/stores',
    STORE_STAFF: '/hr/store/staff',
    STORE_STAFF_STATUS: (id: string) => `/hr/store/staff/${id}/status`,
    PAYROLL: '/hr/payroll'
  }
} as const;

export const API_EXPORT_FORMAT = {
  CSV: 'csv'
} as const;
