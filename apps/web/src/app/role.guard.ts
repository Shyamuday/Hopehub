import { type CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { type Role } from './interfaces';

export const roleGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user() || (await auth.bootstrapSession());
  const roles = route.data['roles'] as Role[] | undefined;

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (roles?.length && !roles.includes(user.role)) {
    return router.createUrlTree([auth.dashboardFor(user.role)]);
  }

  return true;
};
