export const API_PATHS = {
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
  }
} as const;
