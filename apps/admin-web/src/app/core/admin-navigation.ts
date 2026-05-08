import {
  ADMIN_PERMISSIONS,
  adminHasAllPermissions,
  adminHasAnyPermission,
  type AdminUser
} from './admin-permissions';

/** First route a limited admin should land on — task-oriented order. */
export function pickFirstAllowedRoute(user: AdminUser | null): string | null {
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  const P = ADMIN_PERMISSIONS;
  if (adminHasAnyPermission(user, P.REPORTS_VIEW, P.PAYMENTS_READ, P.AUDIT_READ)) {
    return '/dashboard';
  }
  if (adminHasAllPermissions(user, P.CONSULTATIONS_READ)) {
    return '/consultations';
  }
  if (adminHasAllPermissions(user, P.CONSUMERS_READ)) {
    return '/consumers';
  }
  if (adminHasAllPermissions(user, P.DOCTORS_READ)) {
    return '/doctors';
  }
  if (adminHasAllPermissions(user, P.DISEASES_READ)) {
    return '/diseases';
  }
  if (adminHasAllPermissions(user, P.LOCATIONS_READ)) {
    return '/locations';
  }
  if (adminHasAllPermissions(user, P.STAFF_READ)) {
    return '/staff';
  }
  return null;
}
