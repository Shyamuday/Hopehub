import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canUserAccessAdminRoute, pickFirstAllowedRoute } from '../admin-navigation';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { AdminAuth } from '../services/admin-auth';

const OPEN_SEGMENTS = new Set<string>([ROUTE_PATHS.ACCOUNT, ROUTE_PATHS.NOTIFICATIONS_INBOX]);

export const adminPermissionGuard: CanActivateFn = async (route) => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const segment = route.routeConfig?.path ?? '';

  if (!segment || OPEN_SEGMENTS.has(segment)) {
    return true;
  }

  let user = auth.user();
  if (!user) {
    try {
      user = await auth.refreshSession();
    } catch {
      auth.logout();
      return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`]);
    }
  }

  if (canUserAccessAdminRoute(user, segment)) {
    return true;
  }

  const fallback = pickFirstAllowedRoute(user) ?? `/${ROUTE_PATHS.DASHBOARD}`;
  return router.createUrlTree([fallback]);
};
