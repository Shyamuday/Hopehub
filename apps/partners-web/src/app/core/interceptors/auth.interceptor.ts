import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PlatformAuthService } from '../../services/platform-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(PlatformAuthService);
  const token = auth.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }

  return next(req);
};
