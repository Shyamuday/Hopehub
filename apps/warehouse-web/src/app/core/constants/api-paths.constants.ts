export const API_PATHS = {
  WAREHOUSE: {
    ME: '/warehouse/me',
    DASHBOARD: '/warehouse/dashboard',
    BRANCHES: '/warehouse/branches',
    TRANSFERS: '/warehouse/transfers',
    TRANSFER: (id: string) => `/warehouse/transfers/${id}`,
    DISPATCH: (id: string) => `/warehouse/transfers/${id}/dispatch`
  }
} as const;
