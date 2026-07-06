import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from '../services/admin-auth';
import { ROUTE_PATHS } from '../constants/app-routes.constants';

export const adminAuthGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`]);
  }

  try {
    await auth.refreshSession();
    return true;
  } catch {
    auth.logout();
    return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`]);
  }
};
