import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../services/auth';
import { environment } from '../../../environments/environment';

export const doctorAuthGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
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
