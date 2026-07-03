export const API_PATHS = {
  SUPPLIER: {
    ME: '/corporate-wellness/me',
    ORDERS: '/corporate-wellness/purchase-orders',
    ORDER: (id: string) => `/corporate-wellness/purchase-orders/${id}`,
    CONFIRM: (id: string) => `/corporate-wellness/purchase-orders/${id}/confirm`
  }
} as const;
