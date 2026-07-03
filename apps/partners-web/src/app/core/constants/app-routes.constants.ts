export const ROUTE_PATHS = {
  LOGIN: 'login',
  ORDERS: 'orders',
  WAREHOUSE: 'warehouse',
  WAREHOUSE_TRANSFERS: 'warehouse-transfers',
  DELIVERIES: 'deliveries',
  DELIVERY_ORDERS: 'delivery-orders',
  LAB_REFERRALS: 'lab-referrals',
  ACCOUNTS: 'accounts',
  CLAIMS: 'claims'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.CLAIMS;

export const ROUTE_CAPABILITIES: Record<string, string> = {
  [ROUTE_PATHS.ORDERS]: 'supplier.portal',
  [ROUTE_PATHS.WAREHOUSE]: 'store_staff.portal',
  [ROUTE_PATHS.WAREHOUSE_TRANSFERS]: 'store_staff.portal',
  [ROUTE_PATHS.DELIVERIES]: 'delivery.ops',
  [ROUTE_PATHS.DELIVERY_ORDERS]: 'delivery.ops',
  [ROUTE_PATHS.LAB_REFERRALS]: 'diagnostic.portal',
  [ROUTE_PATHS.ACCOUNTS]: 'corporate_wellness.portal',
  [ROUTE_PATHS.CLAIMS]: 'insurance.portal'
};
