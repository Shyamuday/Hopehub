export type PlatformNavItem = {
  path: string;
  label: string;
  icon: string;
  capability: string;
};

/** Navigation for the unified operations (staff) portal. */
export const OPERATIONS_NAV_ITEMS: PlatformNavItem[] = [
  { path: '/admin/dashboard', label: 'Admin console', icon: '⚙️', capability: 'admin.dashboard' },
  { path: '/admin/ecosystem-users', label: 'Portal users', icon: '🌐', capability: 'admin.ecosystem_users' },
  { path: '/dashboard', label: 'HR dashboard', icon: '📊', capability: 'hr.portal' },
  { path: '/employees', label: 'Employees', icon: '👥', capability: 'hr.portal' },
  { path: '/doctors', label: 'Doctors', icon: '🩺', capability: 'hr.portal' },
  { path: '/store-staff', label: 'Store staff', icon: '🧑‍💼', capability: 'hr.portal' },
  { path: '/stores', label: 'Stores', icon: '🏪', capability: 'hr.portal' },
  { path: '/leaves', label: 'Leaves', icon: '📋', capability: 'hr.portal' },
  { path: '/payroll', label: 'Payroll', icon: '💰', capability: 'hr.portal' },
  { path: '/walk-in', label: 'Walk-in', icon: '🚶', capability: 'receptionist.portal' },
  { path: '/queue', label: 'Queue', icon: '📟', capability: 'receptionist.portal' },
  { path: '/clinic-dashboard', label: 'Clinic hub', icon: '🏥', capability: 'clinic_manager.portal' },
  { path: '/roster', label: 'Roster', icon: '📅', capability: 'clinic_manager.portal' },
  { path: '/schedules', label: 'Schedules', icon: '🗓️', capability: 'clinic_manager.portal' },
  { path: '/finance', label: 'Finance', icon: '💳', capability: 'accountant.portal' },
  { path: '/branch-dashboard', label: 'Branch P&L', icon: '📈', capability: 'branch_owner.portal' },
  { path: '/follow-ups', label: 'Follow-ups', icon: '🔔', capability: 'coordinator.portal' },
  { path: '/patients', label: 'Patient search', icon: '🔍', capability: 'call_center.portal' },
  { path: '/consultations', label: 'Consultations', icon: '💬', capability: 'call_center.portal' },
  { path: '/funnels', label: 'Funnels', icon: '📣', capability: 'marketing.portal' }
];

/** Navigation for the unified partners portal. */
export const PARTNERS_NAV_ITEMS: PlatformNavItem[] = [
  { path: '/orders', label: 'Purchase orders', icon: '📦', capability: 'supplier.portal' },
  { path: '/warehouse', label: 'Warehouse', icon: '🏭', capability: 'store_staff.portal' },
  { path: '/warehouse-transfers', label: 'Transfers', icon: '↔️', capability: 'store_staff.portal' },
  { path: '/deliveries', label: 'Deliveries', icon: '🚚', capability: 'delivery.ops' },
  { path: '/delivery-orders', label: 'My runs', icon: '📦', capability: 'delivery.ops' },
  { path: '/lab-referrals', label: 'Lab referrals', icon: '🧪', capability: 'diagnostic.portal' },
  { path: '/accounts', label: 'Corporate accounts', icon: '🏢', capability: 'corporate_wellness.portal' },
  { path: '/claims', label: 'Insurance claims', icon: '📄', capability: 'insurance.portal' }
];

export function navItemsForCapabilities(
  items: PlatformNavItem[],
  capabilities: string[]
): PlatformNavItem[] {
  const set = new Set(capabilities);
  return items.filter((item) => set.has(item.capability));
}
