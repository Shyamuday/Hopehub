import { ROUTE_PATHS } from './app-routes.constants';
import {
  capabilitiesForDoctorType,
  capabilitiesForProvider,
  type DoctorCapabilities,
  type DoctorProfileSummary,
  type HomeopathicDoctorType,
} from './doctor-types.constants';

export type DoctorNavChildLink = {
  id: string;
  label: string;
  path: string;
  queryParams?: Record<string, string>;
  enabled: boolean;
  showInBottomNav?: boolean;
};

export type DoctorNavItemDef = {
  id: string;
  label: string;
  path?: string;
  queryParams?: Record<string, string>;
  action?: 'resume-case';
  icon: string;
  shortLabel: string;
  enabled: boolean;
  showInBottomNav?: boolean;
  defaultExpanded?: boolean;
  children?: DoctorNavChildLink[];
};

export const DOCTOR_NAV_ICONS: Record<string, { icon: string; shortLabel: string }> = {
  Worklist: { icon: '📋', shortLabel: 'Work' },
  'Resume case': { icon: '▶️', shortLabel: 'Resume' },
  Clinical: { icon: '🔬', shortLabel: 'Clinical' },
  'Client care': { icon: '🤝', shortLabel: 'Care' },
  'Case Analysis': { icon: '🔬', shortLabel: 'Case' },
  'Repertory lookup': { icon: '📖', shortLabel: 'Rep' },
  'Materia Medica': { icon: '📚', shortLabel: 'MM' },
  Patients: { icon: '👥', shortLabel: 'Patients' },
  Clients: { icon: '🤝', shortLabel: 'Clients' },
  'Go live': { icon: '📡', shortLabel: 'Live' },
  Scan: { icon: '📷', shortLabel: 'Scan' },
  Dashboard: { icon: '📊', shortLabel: 'Home' },
  Schedule: { icon: '📅', shortLabel: 'Sched' },
  Slots: { icon: '📅', shortLabel: 'Slots' },
  Leaves: { icon: '🌴', shortLabel: 'Leave' },
  Earnings: { icon: '💰', shortLabel: 'Pay' },
  Feedback: { icon: '★', shortLabel: 'Reviews' },
  'Share profile': { icon: '↗', shortLabel: 'Share' },
  Content: { icon: '📝', shortLabel: 'Content' },
  'Treatment pages': { icon: '📝', shortLabel: 'Pages' },
  'Blog articles': { icon: '✍️', shortLabel: 'Blog' },
  Profile: { icon: '👤', shortLabel: 'Profile' },
  Support: { icon: '❔', shortLabel: 'Help' },
  More: { icon: '⋯', shortLabel: 'More' },
};

export function navItemsForDoctorType(type?: HomeopathicDoctorType | null): DoctorNavItemDef[] {
  const capabilities = capabilitiesForDoctorType(type);
  return buildDoctorNav(capabilities);
}

export function navItemsForDoctorProfile(
  profile?: DoctorProfileSummary | null,
): DoctorNavItemDef[] {
  return buildDoctorNav(capabilitiesForProvider(profile), profile);
}

export function profileNavItem(): DoctorNavItemDef {
  return {
    id: 'profile',
    label: 'Profile',
    path: `/${ROUTE_PATHS.PROFILE}`,
    icon: DOCTOR_NAV_ICONS['Profile'].icon,
    shortLabel: DOCTOR_NAV_ICONS['Profile'].shortLabel,
    enabled: true,
  };
}

function buildDoctorNav(
  capabilities: DoctorCapabilities,
  profile?: DoctorProfileSummary | null,
): DoctorNavItemDef[] {
  const isHopeHub = profile?.doctorType === 'PSYCHOLOGIST';
  if (isHopeHub) {
    // Keep the Professional Help workspace intentionally small. The profile link in the
    // sidebar/footer is the fifth core item; payments live on the home activity rail.
    return [
      {
        id: 'dashboard',
        label: 'Home',
        path: `/${ROUTE_PATHS.DASHBOARD}`,
        icon: DOCTOR_NAV_ICONS['Dashboard'].icon,
        shortLabel: 'Home',
        enabled: true,
        showInBottomNav: true,
      },
      {
        id: 'worklist',
        label: 'Your sessions',
        path: `/${ROUTE_PATHS.WORKLIST}`,
        icon: DOCTOR_NAV_ICONS['Worklist'].icon,
        shortLabel: 'Sessions',
        enabled: true,
        showInBottomNav: true,
      },
      {
        id: 'go-live',
        label: 'Go live',
        path: `/${ROUTE_PATHS.ONLINE_DOCTOR}`,
        icon: DOCTOR_NAV_ICONS['Go live'].icon,
        shortLabel: DOCTOR_NAV_ICONS['Go live'].shortLabel,
        enabled: capabilities.onlineConsult,
        showInBottomNav: true,
      },
      {
        id: 'availability',
        label: 'Availability',
        path: `/${ROUTE_PATHS.SLOTS}`,
        icon: DOCTOR_NAV_ICONS['Slots'].icon,
        shortLabel: 'Times',
        enabled: capabilities.slots,
        showInBottomNav: true,
      },
      {
        id: 'more',
        label: 'More',
        icon: DOCTOR_NAV_ICONS['More'].icon,
        shortLabel: DOCTOR_NAV_ICONS['More'].shortLabel,
        enabled: true,
        defaultExpanded: true,
        children: [
          {
            id: 'share-profile',
            label: 'Share profile',
            path: `/${ROUTE_PATHS.SHARE}`,
            enabled: true,
          },
          {
            id: 'feedback',
            label: 'Client feedback',
            path: `/${ROUTE_PATHS.FEEDBACK}`,
            enabled: true,
          },
          {
            id: 'earnings',
            label: 'Earnings',
            path: `/${ROUTE_PATHS.EARNINGS}`,
            enabled: capabilities.earnings,
          },
        ],
      },
    ];
  }

  const userListLabel = isHopeHub ? 'Clients' : 'Patients';
  const availabilityLabel = isHopeHub ? 'Availability' : 'Slots';
  const items: DoctorNavItemDef[] = [
    {
      id: 'worklist',
      label: 'Worklist',
      path: `/${ROUTE_PATHS.WORKLIST}`,
      icon: DOCTOR_NAV_ICONS['Worklist'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Worklist'].shortLabel,
      enabled: true,
      showInBottomNav: true,
      defaultExpanded: true,
      children: [
        {
          id: 'worklist-assigned',
          label: 'Assigned',
          path: `/${ROUTE_PATHS.WORKLIST}`,
          queryParams: { view: 'ASSIGNED' },
          enabled: true,
        },
        {
          id: 'worklist-in-progress',
          label: 'In progress',
          path: `/${ROUTE_PATHS.WORKLIST}`,
          queryParams: { view: 'IN_PROGRESS' },
          enabled: true,
        },
        {
          id: 'worklist-follow-up',
          label: 'Follow-up due',
          path: `/${ROUTE_PATHS.WORKLIST}`,
          queryParams: { view: 'FOLLOW_UP_DUE' },
          enabled: true,
        },
      ],
    },
    {
      id: 'resume-case',
      label: 'Resume case',
      action: 'resume-case',
      icon: DOCTOR_NAV_ICONS['Resume case'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Resume case'].shortLabel,
      enabled: true,
    },
    {
      id: 'clinical',
      label: isHopeHub ? 'Client care' : 'Clinical',
      icon: (isHopeHub ? DOCTOR_NAV_ICONS['Client care'] : DOCTOR_NAV_ICONS['Clinical']).icon,
      shortLabel: (isHopeHub ? DOCTOR_NAV_ICONS['Client care'] : DOCTOR_NAV_ICONS['Clinical'])
        .shortLabel,
      enabled: capabilities.caseAnalysis || capabilities.patients,
      defaultExpanded: true,
      children: [
        {
          id: 'case-analysis',
          label: 'Case Analysis',
          path: `/${ROUTE_PATHS.CASE_ANALYSIS_STUDIO}`,
          enabled: capabilities.caseAnalysis,
          showInBottomNav: true,
        },
        {
          id: 'repertory-browser',
          label: 'Repertory lookup',
          path: `/${ROUTE_PATHS.REPERTORY_BROWSER}`,
          enabled: capabilities.caseAnalysis,
        },
        {
          id: 'materia-medica',
          label: 'Materia Medica',
          path: `/${ROUTE_PATHS.REPERTORY_BROWSER}`,
          queryParams: { mode: 'materia-medica' },
          enabled: capabilities.caseAnalysis,
        },
        {
          id: 'patients',
          label: userListLabel,
          path: `/${ROUTE_PATHS.PATIENTS}`,
          enabled: capabilities.patients,
          showInBottomNav: true,
        },
      ],
    },
    {
      id: 'go-live',
      label: 'Go live',
      path: `/${ROUTE_PATHS.ONLINE_DOCTOR}`,
      icon: DOCTOR_NAV_ICONS['Go live'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Go live'].shortLabel,
      enabled: capabilities.onlineConsult,
      showInBottomNav: true,
    },
    {
      id: 'scan',
      label: 'Scan',
      path: `/${ROUTE_PATHS.SCAN}`,
      icon: DOCTOR_NAV_ICONS['Scan'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Scan'].shortLabel,
      enabled: capabilities.scan,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: `/${ROUTE_PATHS.DASHBOARD}`,
      icon: DOCTOR_NAV_ICONS['Dashboard'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Dashboard'].shortLabel,
      enabled: true,
      showInBottomNav: true,
    },
    {
      id: 'availability',
      label: availabilityLabel,
      path: `/${ROUTE_PATHS.SLOTS}`,
      icon: DOCTOR_NAV_ICONS['Slots'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Slots'].shortLabel,
      enabled: capabilities.slots,
      showInBottomNav: true,
    },
    {
      id: 'leaves',
      label: 'Leaves',
      path: `/${ROUTE_PATHS.LEAVES}`,
      icon: DOCTOR_NAV_ICONS['Leaves'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Leaves'].shortLabel,
      enabled: capabilities.leaves,
    },
    {
      id: 'earnings',
      label: 'Earnings',
      path: `/${ROUTE_PATHS.EARNINGS}`,
      icon: DOCTOR_NAV_ICONS['Earnings'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Earnings'].shortLabel,
      enabled: capabilities.earnings,
      showInBottomNav: true,
    },
    {
      id: 'content',
      label: 'Content',
      icon: DOCTOR_NAV_ICONS['Content'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Content'].shortLabel,
      enabled: capabilities.content,
      children: [
        {
          id: 'treatment-pages',
          label: 'Treatment pages',
          path: `/${ROUTE_PATHS.DISEASE_PAGES}`,
          enabled: capabilities.treatmentPages,
        },
        {
          id: 'blog',
          label: 'Blog articles',
          path: `/${ROUTE_PATHS.BLOG}`,
          enabled: capabilities.content,
        },
      ],
    },
  ];

  const enabledItems = items.filter(
    (item) => item.enabled && (item.children ? hasEnabledChild(item) : true),
  );
  const coreOrder = ['dashboard', 'worklist', 'go-live', 'availability'];
  const coreIds = new Set(coreOrder);
  const coreItems = coreOrder
    .map((id) => enabledItems.find((item) => item.id === id))
    .filter((item): item is DoctorNavItemDef => !!item);
  const resumeItem = enabledItems.find((item) => item.id === 'resume-case');
  const moreChildren: DoctorNavChildLink[] = enabledItems
    .filter((item) => !coreIds.has(item.id) && item.id !== 'resume-case')
    .flatMap((item) => {
      if (item.children?.length) return item.children.filter((child) => child.enabled);
      if (!item.path) return [];
      return [
        {
          id: item.id,
          label: item.label,
          path: item.path,
          queryParams: item.queryParams,
          enabled: item.enabled,
        },
      ];
    });

  const moreItem: DoctorNavItemDef | null = moreChildren.length
    ? {
        id: 'more',
        label: 'More',
        icon: DOCTOR_NAV_ICONS['More'].icon,
        shortLabel: DOCTOR_NAV_ICONS['More'].shortLabel,
        enabled: true,
        defaultExpanded: true,
        children: moreChildren,
      }
    : null;

  return [...coreItems, ...(resumeItem ? [resumeItem] : []), ...(moreItem ? [moreItem] : [])];
}

function hasEnabledChild(item: DoctorNavItemDef) {
  return (item.children || []).some((child) => child.enabled);
}
