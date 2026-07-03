export const API_PATHS = {
  SUPPLIER: {
    ME: '/supplier/me',
    ORDERS: '/supplier/purchase-orders',
    ORDER: (id: string) => `/supplier/purchase-orders/${id}`,
    CONFIRM: (id: string) => `/supplier/purchase-orders/${id}/confirm`
  }
} as const;
