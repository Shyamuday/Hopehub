import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';

export type PatientAccountNavItem = {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: string;
  available: boolean;
};

export const PATIENT_ACCOUNT_NAV: PatientAccountNavItem[] = [
  {
    id: 'overview',
    label: 'My Account',
    description: 'Account summary and quick links',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    icon: '👤',
    available: true
  },
  {
    id: 'profile',
    label: 'Edit Account',
    description: 'Profile, health details, password',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PROFILE}`,
    icon: '✏️',
    available: true
  },
  {
    id: 'addresses',
    label: 'Manage Addresses',
    description: 'Delivery addresses for medicines',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ADDRESSES}`,
    icon: '📍',
    available: true
  },
  {
    id: 'consultations',
    label: 'My Consultations',
    description: 'Past visits, pay pending, prescriptions',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CONSULTATIONS}`,
    icon: '🩺',
    available: true
  },
  {
    id: 'orders',
    label: 'Orders & Deliveries',
    description: 'Track medicine deliveries',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ORDERS}`,
    icon: '📦',
    available: true
  },
  {
    id: 'lab-results',
    label: 'Lab results',
    description: 'Diagnostic referrals and test results',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_LAB_RESULTS}`,
    icon: '🧪',
    available: true
  },
  {
    id: 'card',
    label: 'Clinic card',
    description: 'Patient ID and QR for visits',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CARD}`,
    icon: '🪪',
    available: true
  },
  {
    id: 'permissions',
    label: 'App permissions',
    description: 'Why we ask for camera, mic & alerts',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PERMISSIONS}`,
    icon: '🔒',
    available: true
  },
  {
    id: 'dashboard',
    label: 'Care dashboard',
    description: 'Chat, medicines, today’s doses',
    path: `/${ROUTE_PATHS.PATIENT_DASHBOARD}`,
    icon: '💬',
    available: true
  },
  {
    id: 'refer',
    label: 'Refer and Earn',
    description: 'Invite friends and earn rewards',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REFER}`,
    icon: '🎁',
    available: true
  },
  {
    id: 'rewards',
    label: 'Rewards',
    description: 'Wallet balance and history',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REWARDS}`,
    icon: '⭐',
    available: true
  }
];
