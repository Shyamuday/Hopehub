import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { Auth } from '../services/auth';

/** Token-only check so the shell renders immediately; 401s are handled by the HTTP interceptor. */
export const providerAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/', ROUTE_PATHS.LOGIN], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};
