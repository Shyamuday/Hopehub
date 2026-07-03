export const API_PATHS = {
  DIAGNOSTIC: {
    ME: '/diagnostic/me',
    REFERRALS: '/diagnostic/referrals',
    REFERRAL: (id: string) => `/diagnostic/referrals/${id}`,
    ACCEPT: (id: string) => `/diagnostic/referrals/${id}/accept`,
    ADVANCE: (id: string) => `/diagnostic/referrals/${id}/advance`,
    RESULTS: (id: string) => `/diagnostic/referrals/${id}/results`
  }
} as const;
