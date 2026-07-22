import { ROUTE_PATHS } from './app-routes.constants';
import {
  capabilitiesForDoctorType,
  type DoctorCapabilities,
  type HomeopathicDoctorType,
  type ProviderType,
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
  'Case Analysis': { icon: '🔬', shortLabel: 'Case' },
  'Repertory lookup': { icon: '📖', shortLabel: 'Rep' },
  'Materia Medica': { icon: '📚', shortLabel: 'MM' },
  Patients: { icon: '👥', shortLabel: 'Patients' },
  'Go live': { icon: '📡', shortLabel: 'Live' },
  Scan: { icon: '📷', shortLabel: 'Scan' },
  Dashboard: { icon: '📊', shortLabel: 'Home' },
  Schedule: { icon: '📅', shortLabel: 'Sched' },
  Slots: { icon: '📅', shortLabel: 'Slots' },
  Leaves: { icon: '🌴', shortLabel: 'Leave' },
  Earnings: { icon: '💰', shortLabel: 'Pay' },
  Content: { icon: '📝', shortLabel: 'Content' },
  'Treatment pages': { icon: '📝', shortLabel: 'Pages' },
  'Blog articles': { icon: '✍️', shortLabel: 'Blog' },
  Profile: { icon: '👤', shortLabel: 'Profile' },
  More: { icon: '⋯', shortLabel: 'More' },
};

const MOBILE_BOTTOM_NAV_LABELS = ['Worklist', 'Case Analysis', 'Patients'] as const;

export function navItemsForDoctorType(
  type?: HomeopathicDoctorType | null,
  providerType?: ProviderType | null,
): DoctorNavItemDef[] {
  const capabilities = capabilitiesForDoctorType(type, providerType);
  return buildDoctorNav(capabilities);
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

const MOBILE_BOTTOM_NAV_IDS = ['worklist', 'case-analysis', 'patients'] as const;

export function mobileBottomNavIds() {
  return MOBILE_BOTTOM_NAV_IDS;
}

export function mobileBottomNavLabels() {
  return MOBILE_BOTTOM_NAV_LABELS;
}

function buildDoctorNav(capabilities: DoctorCapabilities): DoctorNavItemDef[] {
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
      label: 'Clinical',
      icon: DOCTOR_NAV_ICONS['Clinical'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Clinical'].shortLabel,
      enabled: capabilities.caseAnalysis || capabilities.sessionNotes,
      defaultExpanded: true,
      children: [
        {
          id: 'case-analysis',
          label: capabilities.caseAnalysis ? 'Case Analysis' : 'Session Notes',
          path: `/${ROUTE_PATHS.CASE_ANALYSIS_STUDIO}`,
          enabled: capabilities.caseAnalysis || capabilities.sessionNotes,
          showInBottomNav: true,
        },
        {
          id: 'repertory-browser',
          label: 'Repertory lookup',
          path: `/${ROUTE_PATHS.REPERTORY_BROWSER}`,
          enabled: capabilities.repertory,
        },
        {
          id: 'materia-medica',
          label: 'Materia Medica',
          path: `/${ROUTE_PATHS.REPERTORY_BROWSER}`,
          queryParams: { mode: 'materia-medica' },
          enabled: capabilities.repertory,
        },
        {
          id: 'patients',
          label: 'Patients',
          path: `/${ROUTE_PATHS.PATIENTS}`,
          enabled: true,
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
    },
    {
      id: 'scan',
      label: 'Scan',
      path: `/${ROUTE_PATHS.SCAN}`,
      icon: DOCTOR_NAV_ICONS['Scan'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Scan'].shortLabel,
      enabled: true,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: `/${ROUTE_PATHS.DASHBOARD}`,
      icon: DOCTOR_NAV_ICONS['Dashboard'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Dashboard'].shortLabel,
      enabled: true,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: DOCTOR_NAV_ICONS['Schedule'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Schedule'].shortLabel,
      enabled: true,
      children: [
        {
          id: 'slots',
          label: 'Slots',
          path: `/${ROUTE_PATHS.SLOTS}`,
          enabled: capabilities.slots,
        },
        {
          id: 'leaves',
          label: 'Leaves',
          path: `/${ROUTE_PATHS.LEAVES}`,
          enabled: true,
        },
      ],
    },
    {
      id: 'earnings',
      label: 'Earnings',
      path: `/${ROUTE_PATHS.EARNINGS}`,
      icon: DOCTOR_NAV_ICONS['Earnings'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Earnings'].shortLabel,
      enabled: capabilities.earnings,
    },
    {
      id: 'content',
      label: 'Content',
      icon: DOCTOR_NAV_ICONS['Content'].icon,
      shortLabel: DOCTOR_NAV_ICONS['Content'].shortLabel,
      enabled: true,
      children: [
        {
          id: 'treatment-pages',
          label: 'Treatment pages',
          path: `/${ROUTE_PATHS.DISEASE_PAGES}`,
          enabled: true,
        },
        {
          id: 'blog',
          label: 'Blog articles',
          path: `/${ROUTE_PATHS.BLOG}`,
          enabled: true,
        },
      ],
    },
  ];

  return items.filter((item) => item.enabled && (item.children ? hasEnabledChild(item) : true));
}

function hasEnabledChild(item: DoctorNavItemDef) {
  return (item.children || []).some((child) => child.enabled);
}
