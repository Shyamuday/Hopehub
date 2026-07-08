import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { Role } from './models';

export const roleGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user() || (await auth.bootstrapSession());
  const roles = route.data['roles'] as Role[] | undefined;

  if (!user) {
    const attemptedUrl = route.url.map((s) => s.path).join('/');
    return router.createUrlTree([`/${ROUTE_PATHS.LOGIN}`], {
      queryParams: { returnUrl: `/${attemptedUrl}` }
    });
  }

  if (roles?.length && !roles.includes(user.role)) {
    return router.createUrlTree([auth.dashboardFor(user.role)]);
  }

  return true;
};
