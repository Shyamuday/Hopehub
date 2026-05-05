import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from '../services/admin-auth';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
