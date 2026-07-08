export type OperationsNavGroup = {
  id: string;
  label: string;
  paths: readonly string[];
};

/** Logical groupings for the operations portal sidebar. */
export const OPERATIONS_NAV_GROUPS: OperationsNavGroup[] = [
  {
    id: 'admin',
    label: 'Admin',
    paths: ['/admin/dashboard', '/admin/staff', '/admin/ecosystem-users']
  },
  {
    id: 'hr',
    label: 'HR & people',
    paths: [
      '/dashboard',
      '/employees',
      '/doctors',
      '/store-staff',
      '/stores',
      '/leaves',
      '/payroll'
    ]
  },
  {
    id: 'frontdesk',
    label: 'Front desk',
    paths: ['/walk-in', '/queue', '/visitor-leads', '/scan']
  },
  {
    id: 'clinic',
    label: 'Clinic',
    paths: ['/clinic-dashboard', '/roster', '/schedules']
  },
  {
    id: 'care',
    label: 'Patient care',
    paths: ['/patients', '/consultations', '/follow-ups']
  },
  {
    id: 'finance',
    label: 'Finance & branch',
    paths: ['/finance', '/branch-dashboard']
  },
  {
    id: 'partners',
    label: 'Partners & logistics',
    paths: [
      '/orders',
      '/warehouse',
      '/warehouse-transfers',
      '/partner-deliveries',
      '/delivery-orders',
      '/lab-referrals',
      '/accounts',
      '/claims',
      '/funnels'
    ]
  },
  {
    id: 'store-counter',
    label: 'Store counter',
    paths: [
      '/store/dashboard',
      '/store/search',
      '/store/stock-in',
      '/store/stock-out',
      '/store/alerts',
      '/store/patients',
      '/store/medicines',
      '/store/rack-map',
      '/store/movements',
      '/store/staff-activity',
      '/store/staff-hr',
      '/store/my-pay',
      '/store/store-expenses'
    ]
  },
  {
    id: 'store-manager',
    label: 'Store manager',
    paths: [
      '/store-manager/dashboard',
      '/store-manager/search',
      '/store-manager/purchase-orders',
      '/store-manager/stock-transfers',
      '/store-manager/deliveries',
      '/store-manager/alerts',
      '/store-manager/medicines',
      '/store-manager/rack-map',
      '/store-manager/movements',
      '/store-manager/staff-activity',
      '/store-manager/staff-hr',
      '/store-manager/store-expenses',
      '/store-manager/patients'
    ]
  }
];
