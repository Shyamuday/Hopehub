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
    id: 'dashboard',
    label: 'My Care Dashboard',
    description: 'Consultations, medicines, prescriptions',
    path: `/${ROUTE_PATHS.PATIENT_DASHBOARD}`,
    icon: '🩺',
    available: true
  },
  {
    id: 'refer',
    label: 'Refer and Earn',
    description: 'Invite friends — coming soon',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    icon: '🎁',
    available: false
  },
  {
    id: 'rewards',
    label: 'Rewards',
    description: 'Points and wallet — coming soon',
    path: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    icon: '⭐',
    available: false
  }
];
