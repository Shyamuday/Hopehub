import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformAuthService } from '../../services/platform-auth.service';
import { ROUTE_PATHS, ROUTE_CAPABILITIES } from '../constants/app-routes.constants';

export const authGuard: CanActivateFn = () => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`]);
};

export const capabilityGuard: CanActivateFn = (route) => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);
  const segment = route.routeConfig?.path ?? '';
  const required = ROUTE_CAPABILITIES[segment];

  if (!required || auth.hasCapability(required)) {
    return true;
  }

  return router.createUrlTree([`/${auth.defaultRoute()}`]);
};
