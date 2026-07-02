import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreAuthService } from '../../services/store-auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(StoreAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
