import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformAuthService } from '../../services/platform-auth.service';
import {
  ROUTE_PATHS,
  ROUTE_CAPABILITIES,
  STORE_COUNTER_CAPABILITIES,
  STORE_MANAGER_CAPABILITIES
} from '../constants/app-routes.constants';

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
  const allowed = !required ? [] : Array.isArray(required) ? required : [required];

  if (!allowed.length || allowed.some((cap) => auth.hasCapability(cap))) {
    return true;
  }

  const fallback = auth.defaultRoute();
  return router.createUrlTree([`/${fallback}`]);
};

/** Guards nested store/ and store-manager/ child routes by capability map. */
export const storeCapabilityGuard: CanActivateFn = (route) => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);
  const parent = route.parent?.routeConfig?.path ?? '';
  const segment = route.routeConfig?.path ?? '';
  const map =
    parent === ROUTE_PATHS.STORE_MANAGER ? STORE_MANAGER_CAPABILITIES : STORE_COUNTER_CAPABILITIES;
  const required = map[segment];

  if (!required || auth.hasCapability(required)) {
    return true;
  }

  const fallback = auth.defaultRoute();
  return router.createUrlTree([`/${fallback}`]);
};
