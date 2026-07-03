export const API_PATHS = {
  SUPPLIER: {
    ME: '/insurance/me',
    ORDERS: '/insurance/purchase-orders',
    ORDER: (id: string) => `/insurance/purchase-orders/${id}`,
    CONFIRM: (id: string) => `/insurance/purchase-orders/${id}/confirm`
  }
} as const;
