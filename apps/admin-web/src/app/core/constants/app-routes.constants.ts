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
  SAFETY_FLAGS: 'safety-flags',
  ONLINE_DOCTORS: 'online-doctors',
  FOLLOW_UPS: 'follow-ups',
  PAYROLL: 'payroll',
  RATES: 'rates',
  HOPE_HUB_OFFERS: 'hope-hub-offers',
  LISTENER_SCREENING: 'listener-screening',
  ASSESSMENT_DEFINITIONS: 'assessment-definitions',
  PRACTICES: 'practices',
  LIFESTYLE_TIPS: 'lifestyle-tips',
  PAYMENTS: 'payments',
  DONATIONS: 'donations',
  FINANCE: 'finance',
  AUDIT: 'audit',
  ADHERENCE: 'adherence',
  ANALYTICS: 'analytics',
  PURCHASE_ORDERS: 'purchase-orders',
  ADMIN_USERS: 'admin-users',
  TELEGRAM_BOTS: 'telegram-bots',
  GROUP_HELP: 'group-help',
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
  COUNSELLOR_APPLICATIONS: 'counsellor-applications',
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

export type AdminWorkspace = 'homeopathy' | 'hope-hub' | 'shared';

export type AdminWorkspaceOption = {
  id: Exclude<AdminWorkspace, 'shared'>;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
};

export const ADMIN_WORKSPACES: readonly AdminWorkspaceOption[] = [
  {
    id: 'hope-hub',
    label: 'Hope Hub',
    shortLabel: 'Hope',
    description:
      'Hope Hub providers, listeners, screening, wellness content, and safety moderation.',
    icon: '🧠',
  },
  {
    id: 'homeopathy',
    label: 'Homeopathy',
    shortLabel: 'Homeo',
    description: 'Doctors, patients, clinical records, medicines, stock, and homeopathy ops.',
    icon: '🌿',
  },
] as const;

export const NAV_ITEMS = [
  { path: adminNavPath(ROUTE_PATHS.DASHBOARD), label: '🏠 Command Center', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.DOCTORS),
    label: '🧑‍⚕️ Providers',
    workspaces: ['homeopathy', 'hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.CONSUMERS),
    label: '👤 Users / Consumers',
    workspaces: ['homeopathy', 'hope-hub'],
  },
  { path: adminNavPath(ROUTE_PATHS.SCAN), label: '📷 Scan Patient', workspaces: ['homeopathy'] },
  {
    path: adminNavPath(ROUTE_PATHS.DISEASES),
    label: '🌿 Homeopathy Services',
    workspaces: ['homeopathy'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.RATES),
    label: '💲 Homeopathy Rates',
    workspaces: ['homeopathy'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.HOPE_HUB_OFFERS),
    label: '🧠 Hope Hub Offers',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.LISTENER_SCREENING),
    label: '🧪 Listener Screening',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.ASSESSMENT_DEFINITIONS),
    label: '📋 Assessments',
    workspaces: ['hope-hub'],
  },
  { path: adminNavPath(ROUTE_PATHS.PRACTICES), label: '🧘 Practices', workspaces: ['hope-hub'] },
  {
    path: adminNavPath(ROUTE_PATHS.LIFESTYLE_TIPS),
    label: '🌱 Lifestyle Tips',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.REWARDS),
    label: '🎁 Rewards & Referrals',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.CLINICAL_RECORDS),
    label: '📋 Clinical Records',
    workspaces: ['homeopathy'],
  },
  { path: adminNavPath(ROUTE_PATHS.VACANCIES), label: '📢 Vacancies', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.COUNSELLOR_APPLICATIONS),
    label: '🧠 Provider Applications',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.TESTIMONIALS),
    label: '⭐ Testimonials',
    workspaces: ['shared'],
  },
  { path: adminNavPath(ROUTE_PATHS.FAQ), label: '❓ FAQ', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.BLOG), label: '📝 Blog', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.SITE_CONFIG),
    label: '⚙️ Site Settings',
    workspaces: ['shared'],
  },
  { path: adminNavPath(ROUTE_PATHS.CHAT_INBOX), label: '💬 Visitor Leads', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.HR),
    label: '🪪 Provider HR',
    workspaces: ['homeopathy', 'hope-hub'],
  },
  { path: adminNavPath(ROUTE_PATHS.HR_USERS), label: '👥 HR Managers', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.EMPLOYEES), label: '👥 Employees', workspaces: ['homeopathy'] },
  { path: adminNavPath(ROUTE_PATHS.LEAVES), label: '📋 Leaves', workspaces: ['homeopathy'] },
  { path: adminNavPath(ROUTE_PATHS.STORES), label: '🏪 Stores', workspaces: ['homeopathy'] },
  {
    path: adminNavPath(ROUTE_PATHS.PURCHASE_ORDERS),
    label: '📦 Purchase Orders',
    workspaces: ['homeopathy'],
  },
  { path: adminNavPath(ROUTE_PATHS.SUPPLIERS), label: '🏭 Suppliers', workspaces: ['homeopathy'] },
  { path: adminNavPath(ROUTE_PATHS.MEDICINES), label: '💊 Medicines', workspaces: ['homeopathy'] },
  { path: adminNavPath(ROUTE_PATHS.INVENTORY), label: '📦 Inventory', workspaces: ['homeopathy'] },
  {
    path: adminNavPath(ROUTE_PATHS.NOTIFICATIONS),
    label: '🔔 Notifications',
    workspaces: ['shared'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.NOTIFICATIONS_INBOX),
    label: '📬 Inbox & Email',
    workspaces: ['shared'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.TELEGRAM_BOTS),
    label: '🤖 Telegram Bots',
    workspaces: ['shared'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.GROUP_HELP),
    label: '🛡️ Group Help',
    workspaces: ['hope-hub'],
  },
  { path: adminNavPath(ROUTE_PATHS.ADMIN_USERS), label: '🔐 Admin Users', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.STAFF), label: '🛡️ Staff permissions', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.ECOSYSTEM_USERS),
    label: '🌐 Portal Users',
    workspaces: ['shared'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.CONSULTATIONS),
    label: '🩺 Sessions / Consultations',
    workspaces: ['homeopathy', 'hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.FOLLOW_UPS),
    label: '🔁 Follow-ups',
    workspaces: ['homeopathy'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.SAFETY_FLAGS),
    label: '🚨 Safety Flags',
    workspaces: ['hope-hub'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.ONLINE_DOCTORS),
    label: '🟢 Live Providers',
    workspaces: ['homeopathy', 'hope-hub'],
  },
  { path: adminNavPath(ROUTE_PATHS.PAYMENTS), label: '💳 Payments', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.DONATIONS), label: '🤝 Donations', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.AUDIT), label: '📋 Audit Trail', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.SECURITY), label: '🛡️ Security', workspaces: ['shared'] },
  {
    path: adminNavPath(ROUTE_PATHS.ADHERENCE),
    label: '📉 Adherence Risk',
    workspaces: ['homeopathy'],
  },
  {
    path: adminNavPath(ROUTE_PATHS.ANALYTICS),
    label: '📈 Product Analytics',
    workspaces: ['shared'],
  },
  { path: adminNavPath(ROUTE_PATHS.FINANCE), label: '📊 Finance', workspaces: ['shared'] },
  { path: adminNavPath(ROUTE_PATHS.PAYROLL), label: '💰 Payroll', workspaces: ['shared'] },
] as const;

export type AdminNavItem = { path: string; label: string; workspaces?: readonly AdminWorkspace[] };

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
    segments: [ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.ANALYTICS],
  },
  {
    id: 'care',
    label: 'Care & sessions',
    segments: [
      ROUTE_PATHS.CONSULTATIONS,
      ROUTE_PATHS.FOLLOW_UPS,
      ROUTE_PATHS.ONLINE_DOCTORS,
      ROUTE_PATHS.DOCTORS,
      ROUTE_PATHS.CONSUMERS,
      ROUTE_PATHS.CHAT_INBOX,
    ],
  },
  {
    id: 'hopehub',
    label: 'Hope Hub',
    segments: [
      ROUTE_PATHS.HOPE_HUB_OFFERS,
      ROUTE_PATHS.LISTENER_SCREENING,
      ROUTE_PATHS.COUNSELLOR_APPLICATIONS,
      ROUTE_PATHS.ASSESSMENT_DEFINITIONS,
      ROUTE_PATHS.PRACTICES,
      ROUTE_PATHS.LIFESTYLE_TIPS,
      ROUTE_PATHS.REWARDS,
      ROUTE_PATHS.SAFETY_FLAGS,
      ROUTE_PATHS.GROUP_HELP,
    ],
  },
  {
    id: 'homeopathy',
    label: 'Homeopathy',
    segments: [
      ROUTE_PATHS.SCAN,
      ROUTE_PATHS.CLINICAL_RECORDS,
      ROUTE_PATHS.DISEASES,
      ROUTE_PATHS.RATES,
      ROUTE_PATHS.ADHERENCE,
    ],
  },
  {
    id: 'people',
    label: 'People & HR',
    segments: [
      ROUTE_PATHS.HR,
      ROUTE_PATHS.HR_USERS,
      ROUTE_PATHS.EMPLOYEES,
      ROUTE_PATHS.LEAVES,
      ROUTE_PATHS.VACANCIES,
    ],
  },
  {
    id: 'website',
    label: 'Website content',
    segments: [
      ROUTE_PATHS.TESTIMONIALS,
      ROUTE_PATHS.FAQ,
      ROUTE_PATHS.BLOG,
      ROUTE_PATHS.SITE_CONFIG,
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    segments: [
      ROUTE_PATHS.NOTIFICATIONS,
      ROUTE_PATHS.NOTIFICATIONS_INBOX,
      ROUTE_PATHS.TELEGRAM_BOTS,
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
    label: 'Finance & money',
    segments: [
      ROUTE_PATHS.PAYMENTS,
      ROUTE_PATHS.DONATIONS,
      ROUTE_PATHS.FINANCE,
      ROUTE_PATHS.PAYROLL,
    ],
  },
  {
    id: 'access',
    label: 'Access & security',
    segments: [
      ROUTE_PATHS.ADMIN_USERS,
      ROUTE_PATHS.STAFF,
      ROUTE_PATHS.ECOSYSTEM_USERS,
      ROUTE_PATHS.AUDIT,
      ROUTE_PATHS.SECURITY,
      ROUTE_PATHS.ACCOUNT,
    ],
  },
];
