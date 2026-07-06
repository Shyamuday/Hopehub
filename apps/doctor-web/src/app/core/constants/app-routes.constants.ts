export const ROUTE_PATHS = {
  LOGIN: 'login',
  WORKLIST: 'worklist',
  DASHBOARD: 'dashboard',
  APPOINTMENTS: 'appointments',
  REPERTORY: 'repertory',
  CASE_ANALYSIS: 'consultations',
  PATIENTS: 'patients',
  PROFILE: 'profile',
  LEAVES: 'leaves',
  SLOTS: 'slots',
  EARNINGS: 'earnings'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.WORKLIST;

export const NAV_ITEMS = [
  { path: `/${ROUTE_PATHS.WORKLIST}`, label: 'Worklist' },
  { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard' },
  { path: `/${ROUTE_PATHS.APPOINTMENTS}`, label: 'Appointments' },
  { path: `/${ROUTE_PATHS.PATIENTS}`, label: 'Patients' },
  { path: `/${ROUTE_PATHS.SLOTS}`, label: 'Slots' },
  { path: `/${ROUTE_PATHS.EARNINGS}`, label: 'Earnings' },
  { path: `/${ROUTE_PATHS.LEAVES}`, label: 'Leaves' },
  { path: `/${ROUTE_PATHS.PROFILE}`, label: 'Profile' }
] as const;
