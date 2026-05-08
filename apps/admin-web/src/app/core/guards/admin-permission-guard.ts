import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from '../services/admin-auth';
import { adminHasAllPermissions, adminHasAnyPermission } from '../admin-permissions';
import { pickFirstAllowedRoute } from '../admin-navigation';

export const adminPermissionGuard: CanActivateFn = (route) => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const user = auth.user();
  const data = route.data;
  const all = data['permissions'] as string[] | undefined;
  const anyOf = data['permissionsAny'] as string[] | undefined;

  if (all?.length && !adminHasAllPermissions(user, ...all)) {
    const fallback = pickFirstAllowedRoute(user);
    return router.createUrlTree([fallback ?? '/no-access']);
  }
  if (anyOf?.length && !adminHasAnyPermission(user, ...anyOf)) {
    const fallback = pickFirstAllowedRoute(user);
    return router.createUrlTree([fallback ?? '/no-access']);
  }
  return true;
};
