import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../services/admin-auth';
import { environment } from '../../../environments/environment';

export const adminAuthGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  try {
    await firstValueFrom(http.get(`${environment.apiUrl}/me`));
    return true;
  } catch {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
};
