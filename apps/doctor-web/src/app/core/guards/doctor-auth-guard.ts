import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { Auth } from '../services/auth';

/** Token-first check; refresh token can recover a remembered session before routing to login. */
export const doctorAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    if (await auth.refreshSession()) return true;
    return router.createUrlTree(['/', ROUTE_PATHS.LOGIN], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};
