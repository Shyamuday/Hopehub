import { type Role } from './interfaces';

/** Visitor / logged-out primary navigation (sheet + desktop). */
export type GuestHeaderNavItem =
  | { id: string; type: 'route'; labelKey: string; routerLink: string; linkClass?: string }
  | { id: string; type: 'auth'; labelKey: string; authMode: 'patient' | 'staff'; linkClass?: string }
  | { id: string; type: 'whatsapp'; ariaLabelKey: string };

/** Links in the signed-in user chip (before name / role / logout). */
export type AuthenticatedHeaderNavItem = {
  id: string;
  type: 'route';
  labelKey: string;
  routerLink: string;
  linkClass?: string;
  /** When set, the link is shown only for these roles. */
  roles?: Role[];
};

export const DEFAULT_HEADER_BRAND = {
  title: 'Vitalis Care and Research Centre',
  mark: 'B',
  homePath: '/'
} as const;

export const DEFAULT_GUEST_HEADER_NAV: GuestHeaderNavItem[] = [
  { id: 'about', type: 'route', labelKey: 'nav.about', routerLink: '/about' },
  { id: 'treatments', type: 'route', labelKey: 'nav.treatments', routerLink: '/treatments' },
  { id: 'safety', type: 'route', labelKey: 'nav.safety', routerLink: '/safety' },
  { id: 'login', type: 'auth', labelKey: 'nav.login', authMode: 'patient', linkClass: 'header-cta' },
  {
    id: 'doctor-login',
    type: 'auth',
    labelKey: 'nav.doctorLogin',
    authMode: 'staff',
    linkClass: 'header-cta secondary'
  },
  { id: 'whatsapp', type: 'whatsapp', ariaLabelKey: 'nav.whatsapp' }
];

export const DEFAULT_USER_HEADER_NAV: AuthenticatedHeaderNavItem[] = [
  {
    id: 'self-assessment',
    type: 'route',
    labelKey: 'nav.selfAssessment',
    routerLink: '/patient/self-diagnosis',
    linkClass: 'user-chip-nav',
    roles: ['PATIENT']
  }
];
