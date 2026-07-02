export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  PROFILE: 'profile',
  LEAVES: 'leaves',
  SLOTS: 'slots'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard' },
  { path: `/${ROUTE_PATHS.APPOINTMENTS}`, label: 'Appointments' },
  { path: `/${ROUTE_PATHS.PATIENTS}`, label: 'Patients' },
  { path: `/${ROUTE_PATHS.SLOTS}`, label: 'Slots' },
  { path: `/${ROUTE_PATHS.LEAVES}`, label: 'Leaves' },
  { path: `/${ROUTE_PATHS.PROFILE}`, label: 'Profile' }
] as const;
