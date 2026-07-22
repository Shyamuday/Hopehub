export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  DOCTORS: 'doctors',
  CONSUMERS: 'consumers',
  DISEASES: 'diseases',
  HR: 'hr',
  HR_USERS: 'hr-users',
  EMPLOYEES: 'employees',
  LEAVES: 'leaves',
  STORES: 'stores',
  CONSULTATIONS: 'consultations',
  ONLINE_DOCTORS: 'online-doctors',
  PAYROLL: 'payroll',
  RATES: 'rates',
  PAYMENTS: 'payments',
  FINANCE: 'finance',
  AUDIT: 'audit',
  ADHERENCE: 'adherence',
  ANALYTICS: 'analytics',
  PURCHASE_ORDERS: 'purchase-orders',
  ADMIN_USERS: 'admin-users',
  SUPPLIERS: 'suppliers',
  MEDICINES: 'medicines',
  INVENTORY: 'inventory',
  NOTIFICATIONS: 'notifications',
  NOTIFICATIONS_INBOX: 'notifications-inbox',
  SECURITY: 'security',
  ECOSYSTEM_USERS: 'ecosystem-users',
  STAFF: 'staff',
  SCAN: 'scan',
  VACANCIES: 'vacancies',
  TESTIMONIALS: 'testimonials',
  FAQ: 'faq',
  BLOG: 'blog',
  SITE_CONFIG: 'site-config',
  CHAT_INBOX: 'chat-inbox',
  REWARDS: 'rewards',
  CLINICAL_RECORDS: 'clinical-records',
  ACCOUNT: 'account',
} as const;

/** When embedded in operations-web, set `globalThis.__ADMIN_ROUTE_BASE__ = 'admin'`. */
export function adminNavPath(segment: string): string {
  const base =
    typeof globalThis !== 'undefined'
      ? (globalThis as { __ADMIN_ROUTE_BASE__?: string }).__ADMIN_ROUTE_BASE__
      : undefined;
  return base ? `/${base}/${segment}` : `/${segment}`;
}

export function adminRouteLink(segment: string): string[] {
  const base =
    typeof globalThis !== 'undefined'
      ? (globalThis as { __ADMIN_ROUTE_BASE__?: string }).__ADMIN_ROUTE_BASE__
      : undefined;
  return base ? ['/', base, segment] : ['/', segment];
}

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

export const NAV_ITEMS = [
  { path: adminNavPath(ROUTE_PATHS.DASHBOARD), label: 'Dashboard' },
  { path: adminNavPath(ROUTE_PATHS.DOCTORS), label: 'Providers' },
  { path: adminNavPath(ROUTE_PATHS.CONSUMERS), label: 'Consumers' },
  { path: adminNavPath(ROUTE_PATHS.SCAN), label: 'Scan patient' },
  { path: adminNavPath(ROUTE_PATHS.DISEASES), label: 'Diseases' },
  { path: adminNavPath(ROUTE_PATHS.RATES), label: '💲 Rates & Pay' },
  { path: adminNavPath(ROUTE_PATHS.REWARDS), label: '🎁 Rewards & Referrals' },
  { path: adminNavPath(ROUTE_PATHS.CLINICAL_RECORDS), label: '📋 Clinical Records' },
  { path: adminNavPath(ROUTE_PATHS.VACANCIES), label: '📢 Vacancies' },
  { path: adminNavPath(ROUTE_PATHS.TESTIMONIALS), label: '⭐ Testimonials' },
  { path: adminNavPath(ROUTE_PATHS.FAQ), label: '❓ FAQ' },
  { path: adminNavPath(ROUTE_PATHS.BLOG), label: '📝 Blog' },
  { path: adminNavPath(ROUTE_PATHS.SITE_CONFIG), label: '⚙️ Site Settings' },
  { path: adminNavPath(ROUTE_PATHS.CHAT_INBOX), label: '💬 Visitor Leads' },
  { path: adminNavPath(ROUTE_PATHS.HR), label: '🪪 Provider HR' },
  { path: adminNavPath(ROUTE_PATHS.HR_USERS), label: '👥 HR Managers' },
  { path: adminNavPath(ROUTE_PATHS.EMPLOYEES), label: '👥 Employees' },
  { path: adminNavPath(ROUTE_PATHS.LEAVES), label: '📋 Leaves' },
  { path: adminNavPath(ROUTE_PATHS.STORES), label: '🏪 Stores' },
  { path: adminNavPath(ROUTE_PATHS.PURCHASE_ORDERS), label: '📦 Purchase Orders' },
  { path: adminNavPath(ROUTE_PATHS.SUPPLIERS), label: '🏭 Suppliers' },
  { path: adminNavPath(ROUTE_PATHS.MEDICINES), label: '💊 Medicines' },
  { path: adminNavPath(ROUTE_PATHS.INVENTORY), label: '📦 Inventory' },
  { path: adminNavPath(ROUTE_PATHS.NOTIFICATIONS), label: '🔔 Notifications' },
  { path: adminNavPath(ROUTE_PATHS.NOTIFICATIONS_INBOX), label: '📬 Inbox' },
  { path: adminNavPath(ROUTE_PATHS.ADMIN_USERS), label: '🔐 Admin Users' },
  { path: adminNavPath(ROUTE_PATHS.STAFF), label: '🛡️ Staff permissions' },
  { path: adminNavPath(ROUTE_PATHS.ECOSYSTEM_USERS), label: '🌐 Portal Users' },
  { path: adminNavPath(ROUTE_PATHS.CONSULTATIONS), label: '🩺 Consultations' },
  { path: adminNavPath(ROUTE_PATHS.ONLINE_DOCTORS), label: '🟢 Online providers' },
  { path: adminNavPath(ROUTE_PATHS.PAYMENTS), label: '💳 Payments' },
  { path: adminNavPath(ROUTE_PATHS.AUDIT), label: '📋 Audit Trail' },
  { path: adminNavPath(ROUTE_PATHS.SECURITY), label: '🛡️ Security' },
  { path: adminNavPath(ROUTE_PATHS.ADHERENCE), label: '📉 Adherence Risk' },
  { path: adminNavPath(ROUTE_PATHS.ANALYTICS), label: '📈 Product Analytics' },
  { path: adminNavPath(ROUTE_PATHS.FINANCE), label: '📊 Finance' },
  { path: adminNavPath(ROUTE_PATHS.PAYROLL), label: '💰 Payroll' },
] as const;

export type AdminNavItem = { path: string; label: string };

export type AdminNavGroup = {
  id: string;
  label: string;
  segments: readonly string[];
};

/** Logical groupings for the admin tab bar (segments match ROUTE_PATHS values). */
export const NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    segments: [ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.ANALYTICS, ROUTE_PATHS.ADHERENCE],
  },
  {
    id: 'care',
    label: 'Care delivery',
    segments: [
      ROUTE_PATHS.CONSULTATIONS,
      ROUTE_PATHS.ONLINE_DOCTORS,
      ROUTE_PATHS.DOCTORS,
      ROUTE_PATHS.CONSUMERS,
      ROUTE_PATHS.SCAN,
      ROUTE_PATHS.CLINICAL_RECORDS,
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & pricing',
    segments: [ROUTE_PATHS.DISEASES, ROUTE_PATHS.RATES, ROUTE_PATHS.REWARDS],
  },
  {
    id: 'people',
    label: 'People & HR',
    segments: [
      ROUTE_PATHS.VACANCIES,
      ROUTE_PATHS.HR,
      ROUTE_PATHS.HR_USERS,
      ROUTE_PATHS.EMPLOYEES,
      ROUTE_PATHS.LEAVES,
      ROUTE_PATHS.PAYROLL,
    ],
  },
  {
    id: 'content',
    label: 'Website & leads',
    segments: [
      ROUTE_PATHS.TESTIMONIALS,
      ROUTE_PATHS.FAQ,
      ROUTE_PATHS.BLOG,
      ROUTE_PATHS.SITE_CONFIG,
      ROUTE_PATHS.CHAT_INBOX,
    ],
  },
  {
    id: 'stores',
    label: 'Stores & stock',
    segments: [
      ROUTE_PATHS.STORES,
      ROUTE_PATHS.PURCHASE_ORDERS,
      ROUTE_PATHS.SUPPLIERS,
      ROUTE_PATHS.MEDICINES,
      ROUTE_PATHS.INVENTORY,
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    segments: [ROUTE_PATHS.PAYMENTS, ROUTE_PATHS.FINANCE],
  },
  {
    id: 'platform',
    label: 'Platform',
    segments: [
      ROUTE_PATHS.NOTIFICATIONS,
      ROUTE_PATHS.NOTIFICATIONS_INBOX,
      ROUTE_PATHS.ADMIN_USERS,
      ROUTE_PATHS.STAFF,
      ROUTE_PATHS.ECOSYSTEM_USERS,
      ROUTE_PATHS.AUDIT,
      ROUTE_PATHS.SECURITY,
      ROUTE_PATHS.ACCOUNT,
    ],
  },
];
