export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  MEDICINES: 'medicines',
  MEDICINE_DETAIL: 'medicines/:id',
  STOCK_IN: 'stock-in',
  STOCK_OUT: 'stock-out',
  ALERTS: 'alerts',
  RACK_MAP: 'rack-map',
  MOVEMENTS: 'movements',
  STAFF_ACTIVITY: 'staff-activity',
  STAFF_HR: 'staff-hr',
  MY_PAY: 'my-pay',
  STORE_EXPENSES: 'store-expenses',
  PATIENTS: 'patients',
  PATIENT_SCAN: 'scan/patient/:patientCode'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard', icon: '🏠' },
  { path: `/${ROUTE_PATHS.SEARCH}`, label: 'Search', icon: '🔍' },
  { path: `/${ROUTE_PATHS.PATIENTS}`, label: 'Patients', icon: '🪪' },
  { path: `/${ROUTE_PATHS.STOCK_IN}`, label: 'Stock In', icon: '📦' },
  { path: `/${ROUTE_PATHS.STOCK_OUT}`, label: 'Stock Out', icon: '📤' },
  { path: `/${ROUTE_PATHS.ALERTS}`, label: 'Alerts', icon: '🔔' },
  { path: `/${ROUTE_PATHS.RACK_MAP}`, label: 'Rack Map', icon: '🗺️' },
  { path: `/${ROUTE_PATHS.MEDICINES}`, label: 'Medicines', icon: '💊' },
  { path: `/${ROUTE_PATHS.MOVEMENTS}`, label: 'Movements', icon: '📋' },
  { path: `/${ROUTE_PATHS.MY_PAY}`, label: 'My Pay', icon: '💰' },
  { path: `/${ROUTE_PATHS.STAFF_ACTIVITY}`, label: 'Staff Activity', icon: '👥' },
  { path: `/${ROUTE_PATHS.STAFF_HR}`, label: 'Staff HR', icon: '🪪' },
  { path: `/${ROUTE_PATHS.STORE_EXPENSES}`, label: 'Store Expenses', icon: '🧾' }
] as const;
