import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { StoreAuthService } from '../../services/store-auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(StoreAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/', ROUTE_PATHS.LOGIN], { queryParams: { returnUrl: state.url } });
};
