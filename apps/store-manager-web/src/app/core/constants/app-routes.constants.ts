export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  MEDICINES: 'medicines',
  MEDICINE_DETAIL: 'medicines/:id',
  ALERTS: 'alerts',
  RACK_MAP: 'rack-map',
  MOVEMENTS: 'movements',
  STAFF_ACTIVITY: 'staff-activity',
  STAFF_HR: 'staff-hr',
  STORE_EXPENSES: 'store-expenses',
  PATIENTS: 'patients',
  PURCHASE_ORDERS: 'purchase-orders',
  STOCK_TRANSFERS: 'stock-transfers'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard', icon: '🏠' },
  { path: `/${ROUTE_PATHS.PATIENTS}`, label: 'Patients', icon: '🪪' },
  { path: `/${ROUTE_PATHS.MEDICINES}`, label: 'Medicines', icon: '💊' },
  { path: `/${ROUTE_PATHS.SEARCH}`, label: 'Inventory', icon: '🔍' },
  { path: `/${ROUTE_PATHS.STAFF_ACTIVITY}`, label: 'Staff Activity', icon: '👥' },
  { path: `/${ROUTE_PATHS.STAFF_HR}`, label: 'Staff HR', icon: '🧾' },
  { path: `/${ROUTE_PATHS.STORE_EXPENSES}`, label: 'Expenses', icon: '💰' },
  { path: `/${ROUTE_PATHS.PURCHASE_ORDERS}`, label: 'Incoming POs', icon: '📦' },
  { path: `/${ROUTE_PATHS.STOCK_TRANSFERS}`, label: 'Transfers', icon: '🚚' },
  { path: `/${ROUTE_PATHS.MOVEMENTS}`, label: 'Movements', icon: '📋' },
  { path: `/${ROUTE_PATHS.ALERTS}`, label: 'Alerts', icon: '🔔' },
  { path: `/${ROUTE_PATHS.RACK_MAP}`, label: 'Rack Map', icon: '🗺️' }
] as const;
