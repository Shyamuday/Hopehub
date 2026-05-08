import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../services/admin-auth';
import { environment } from '../../../environments/environment';
import type { AdminUser } from '../admin-permissions';

export const adminAuthGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  try {
    const res = await firstValueFrom(http.get<{ user: AdminUser }>(`${environment.apiUrl}/me`));
    auth.setUser(res.user);
    return true;
  } catch {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
};
