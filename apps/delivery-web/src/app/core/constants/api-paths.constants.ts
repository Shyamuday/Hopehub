export const API_PATHS = {
  DELIVERY: {
    ME: '/delivery/me',
    DASHBOARD: '/delivery/dashboard',
    ORDERS: '/delivery/orders',
    ORDER: (id: string) => `/delivery/orders/${id}`,
    ACCEPT: (id: string) => `/delivery/orders/${id}/accept`,
    PICKUP: (id: string) => `/delivery/orders/${id}/pickup`,
    COMPLETE: (id: string) => `/delivery/orders/${id}/complete`,
    FAIL: (id: string) => `/delivery/orders/${id}/fail`
  }
} as const;
