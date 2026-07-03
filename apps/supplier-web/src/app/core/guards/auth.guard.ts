import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HrAuthService } from '../../services/hr-auth.service';
import { ROUTE_PATHS } from '../constants/app-routes.constants';

export const authGuard: CanActivateFn = () => {
  const auth = inject(HrAuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`]);
};
