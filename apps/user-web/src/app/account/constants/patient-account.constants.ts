import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';

export type PatientAccountNavItem = {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: string;
  available: boolean;
};

export type PatientAccountNavGroup = {
  id: string;
  label: string;
  itemIds: string[];
};

export const PATIENT_ACCOUNT_NAV_GROUPS: PatientAccountNavGroup[] = [
  { id: 'overview', label: 'Overview', itemIds: ['overview', 'dashboard'] },
  { id: 'history', label: 'Care history', itemIds: ['consultations', 'lab-results', 'orders'] },
  { id: 'profile', label: 'Profile & delivery', itemIds: ['profile', 'addresses', 'card'] },
  { id: 'rewards', label: 'Rewards', itemIds: ['refer', 'rewards'] },
  { id: 'settings', label: 'Settings', itemIds: ['permissions'] },
];

export const PATIENT_ACCOUNT_NAV: PatientAccountNavItem[] = [
  {
    id: 'overview',
    label: 'My Account',
    description: 'Account summary and quick links',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    icon: '👤',
    available: true,
  },
  {
    id: 'profile',
    label: 'Edit Account',
    description: 'Profile, health details, password',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PROFILE}`,
    icon: '✏️',
    available: true,
  },
  {
    id: 'addresses',
    label: 'Manage Addresses',
    description: 'Delivery addresses for medicines',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ADDRESSES}`,
    icon: '📍',
    available: true,
  },
  {
    id: 'consultations',
    label: 'My Consultations',
    description: 'Past visits, pay pending, prescriptions',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CONSULTATIONS}`,
    icon: '🩺',
    available: true,
  },
  {
    id: 'orders',
    label: 'Orders & Deliveries',
    description: 'Track medicine deliveries',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ORDERS}`,
    icon: '📦',
    available: true,
  },
  {
    id: 'lab-results',
    label: 'Lab results',
    description: 'Diagnostic referrals and test results',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_LAB_RESULTS}`,
    icon: '🧪',
    available: true,
  },
  {
    id: 'card',
    label: 'Clinic card',
    description: 'Patient ID and QR for visits',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CARD}`,
    icon: '🪪',
    available: true,
  },
  {
    id: 'permissions',
    label: 'App permissions',
    description: 'Why we ask for camera, mic & alerts',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PERMISSIONS}`,
    icon: '🔒',
    available: true,
  },
  {
    id: 'dashboard',
    label: 'Care dashboard',
    description: 'Chat, medicines, today’s doses',
    path: `/${ROUTE_PATHS.PATIENT_DASHBOARD}`,
    icon: '💬',
    available: true,
  },
  {
    id: 'refer',
    label: 'Refer and Earn',
    description: 'Invite friends and earn rewards',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REFER}`,
    icon: '🎁',
    available: true,
  },
  {
    id: 'rewards',
    label: 'Rewards',
    description: 'Wallet balance and history',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REWARDS}`,
    icon: '⭐',
    available: true,
  },
];

export function patientAccountNavGroups(items: PatientAccountNavItem[] = PATIENT_ACCOUNT_NAV) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return PATIENT_ACCOUNT_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.itemIds
      .map((id) => byId.get(id))
      .filter((item): item is PatientAccountNavItem => !!item && item.available),
  })).filter((group) => group.items.length > 0);
}
