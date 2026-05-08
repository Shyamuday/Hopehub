import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuth } from '../services/admin-auth';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AdminAuth).token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
