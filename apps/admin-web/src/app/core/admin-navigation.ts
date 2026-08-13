import {
  ADMIN_PERMISSIONS,
  staffCanAccessWorkspace,
  staffHasAllPermissions,
  type AdminFocusedWorkspace,
  type StaffUser,
} from './admin-permissions';
import { NAV_ITEMS, ROUTE_PATHS, type AdminWorkspace } from './constants/app-routes.constants';

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  [ROUTE_PATHS.DASHBOARD]: [
    ADMIN_PERMISSIONS.REPORTS_VIEW,
    ADMIN_PERMISSIONS.PAYMENTS_READ,
    ADMIN_PERMISSIONS.AUDIT_READ,
  ],
  [ROUTE_PATHS.DOCTORS]: [ADMIN_PERMISSIONS.DOCTORS_READ],
  [ROUTE_PATHS.CONSUMERS]: [ADMIN_PERMISSIONS.CONSUMERS_READ],
  [ROUTE_PATHS.SCAN]: [ADMIN_PERMISSIONS.CONSUMERS_READ],
  [ROUTE_PATHS.DISEASES]: [ADMIN_PERMISSIONS.DISEASES_READ, ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.RATES]: [ADMIN_PERMISSIONS.DISEASES_READ, ADMIN_PERMISSIONS.PAYMENTS_READ],
  [ROUTE_PATHS.HOPE_HUB_OFFERS]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.LISTENER_SCREENING]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.PROVIDER_ROLES]: [ADMIN_PERMISSIONS.DOCTORS_READ],
  [ROUTE_PATHS.ASSESSMENT_DEFINITIONS]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.PRACTICES]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.LIFESTYLE_TIPS]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.REWARDS]: [ADMIN_PERMISSIONS.PAYMENTS_READ, ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.CLINICAL_RECORDS]: [ADMIN_PERMISSIONS.CONSUMERS_READ],
  [ROUTE_PATHS.TESTIMONIALS]: [ADMIN_PERMISSIONS.CATALOG_READ, ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.FAQ]: [ADMIN_PERMISSIONS.CATALOG_READ, ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.BLOG]: [ADMIN_PERMISSIONS.CATALOG_READ, ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.SITE_CONFIG]: [ADMIN_PERMISSIONS.CATALOG_READ, ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.CHAT_INBOX]: [ADMIN_PERMISSIONS.CONSULTATIONS_READ, ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.COUNSELLOR_APPLICATIONS]: [ADMIN_PERMISSIONS.DOCTORS_READ],
  [ROUTE_PATHS.HR]: [ADMIN_PERMISSIONS.DOCTORS_READ],
  [ROUTE_PATHS.HR_USERS]: [ADMIN_PERMISSIONS.STAFF_READ],
  [ROUTE_PATHS.EMPLOYEES]: [ADMIN_PERMISSIONS.CONSUMERS_READ],
  [ROUTE_PATHS.LEAVES]: [ADMIN_PERMISSIONS.CONSUMERS_READ],
  [ROUTE_PATHS.STORES]: [ADMIN_PERMISSIONS.INVENTORY_READ],
  [ROUTE_PATHS.PURCHASE_ORDERS]: [ADMIN_PERMISSIONS.INVENTORY_READ],
  [ROUTE_PATHS.SUPPLIERS]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.MEDICINES]: [ADMIN_PERMISSIONS.CATALOG_READ],
  [ROUTE_PATHS.INVENTORY]: [ADMIN_PERMISSIONS.INVENTORY_READ],
  [ROUTE_PATHS.VACANCIES]: [ADMIN_PERMISSIONS.HR_WRITE],
  [ROUTE_PATHS.NOTIFICATIONS]: [ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE],
  [ROUTE_PATHS.NOTIFICATIONS_INBOX]: [ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE],
  [ROUTE_PATHS.TELEGRAM_BOTS]: [
    ADMIN_PERMISSIONS.STAFF_READ,
    ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE,
  ],
  [ROUTE_PATHS.GROUP_HELP]: [ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE],
  [ROUTE_PATHS.ADMIN_USERS]: [ADMIN_PERMISSIONS.STAFF_WRITE],
  [ROUTE_PATHS.STAFF]: [ADMIN_PERMISSIONS.STAFF_READ],
  [ROUTE_PATHS.ECOSYSTEM_USERS]: [ADMIN_PERMISSIONS.ECOSYSTEM_USERS_WRITE],
  [ROUTE_PATHS.CONSULTATIONS]: [ADMIN_PERMISSIONS.CONSULTATIONS_READ],
  [ROUTE_PATHS.FOLLOW_UPS]: [ADMIN_PERMISSIONS.CONSULTATIONS_READ],
  [ROUTE_PATHS.SAFETY_FLAGS]: [ADMIN_PERMISSIONS.CONSULTATIONS_READ],
  [ROUTE_PATHS.ONLINE_DOCTORS]: [ADMIN_PERMISSIONS.DOCTORS_READ],
  [ROUTE_PATHS.CALL_HEALTH]: [ADMIN_PERMISSIONS.CONSULTATIONS_READ],
  [ROUTE_PATHS.PAYMENTS]: [ADMIN_PERMISSIONS.PAYMENTS_READ],
  [ROUTE_PATHS.DONATIONS]: [ADMIN_PERMISSIONS.PAYMENTS_READ],
  [ROUTE_PATHS.AUDIT]: [ADMIN_PERMISSIONS.AUDIT_READ],
  [ROUTE_PATHS.SECURITY]: [ADMIN_PERMISSIONS.AUDIT_READ],
  [ROUTE_PATHS.ADHERENCE]: [ADMIN_PERMISSIONS.REPORTS_VIEW],
  [ROUTE_PATHS.ANALYTICS]: [ADMIN_PERMISSIONS.REPORTS_VIEW],
  [ROUTE_PATHS.FINANCE]: [ADMIN_PERMISSIONS.PAYMENTS_READ],
  [ROUTE_PATHS.PAYROLL]: [ADMIN_PERMISSIONS.PAYMENTS_READ],
};

export function permissionsForAdminRoute(segment: string): string[] | undefined {
  return ROUTE_PERMISSIONS[segment];
}

export function canUserAccessAdminRoute(user: StaffUser | null, segment: string): boolean {
  if (!canUserAccessRouteWorkspace(user, segment)) return false;
  const required = ROUTE_PERMISSIONS[segment];
  if (!required?.length) return true;
  return required.some((code) => staffHasAllPermissions(user, code));
}

export function navItemsForUser(
  items: ReadonlyArray<{ path: string; label: string; workspaces?: readonly AdminWorkspace[] }>,
  user: StaffUser | null,
) {
  return items.filter((item) => {
    const segment = item.path.split('/').filter(Boolean).pop() ?? '';
    return canUserAccessAdminRoute(user, segment);
  });
}

export function navItemsForWorkspace<T extends { workspaces?: readonly AdminWorkspace[] }>(
  items: readonly T[],
  workspace: Exclude<AdminWorkspace, 'shared'>,
  user?: StaffUser | null,
) {
  return items.filter((item) => {
    const workspaces = item.workspaces ?? ['shared'];
    return (
      workspaces.includes('shared') ||
      (workspaces.includes(workspace) && (!user || staffCanAccessWorkspace(user, workspace)))
    );
  });
}

export function pickFirstAllowedRoute(user: StaffUser | null): string | null {
  if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) return null;
  const P = ADMIN_PERMISSIONS;
  if (staffHasAny(user, P.REPORTS_VIEW, P.PAYMENTS_READ, P.AUDIT_READ))
    return `/${ROUTE_PATHS.DASHBOARD}`;
  if (staffHasAllPermissions(user, P.CONSULTATIONS_READ) && canUserAccessAnyFocusedWorkspace(user))
    return `/${ROUTE_PATHS.CONSULTATIONS}`;
  if (staffHasAllPermissions(user, P.CONSUMERS_READ)) return `/${ROUTE_PATHS.CONSUMERS}`;
  if (staffHasAllPermissions(user, P.DOCTORS_READ) && canUserAccessAnyFocusedWorkspace(user))
    return `/${ROUTE_PATHS.DOCTORS}`;
  if (staffHasAllPermissions(user, P.DISEASES_READ) && staffCanAccessWorkspace(user, 'homeopathy'))
    return `/${ROUTE_PATHS.DISEASES}`;
  if (staffHasAllPermissions(user, P.STAFF_READ)) return `/${ROUTE_PATHS.STAFF}`;
  return null;
}

function staffHasAny(user: StaffUser | null, ...codes: string[]) {
  return codes.some((c) => staffHasAllPermissions(user, c));
}

function routeFocusedWorkspaces(segment: string): AdminFocusedWorkspace[] {
  const route = NAV_ITEMS.find((item) => item.path.split('/').filter(Boolean).pop() === segment);
  return (route?.workspaces ?? []).filter(
    (workspace): workspace is AdminFocusedWorkspace => workspace !== 'shared',
  );
}

function canUserAccessRouteWorkspace(user: StaffUser | null, segment: string): boolean {
  const workspaces = routeFocusedWorkspaces(segment);
  if (!workspaces.length) return true;
  return workspaces.some((workspace) => staffCanAccessWorkspace(user, workspace));
}

function canUserAccessAnyFocusedWorkspace(user: StaffUser | null): boolean {
  return staffCanAccessWorkspace(user, 'homeopathy') || staffCanAccessWorkspace(user, 'hope-hub');
}
