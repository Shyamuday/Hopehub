import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HrAuthService } from '../../services/hr-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(HrAuthService);
  const token = auth.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }

  return next(req);
};
