import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { Auth } from '../services/auth';
import { AUTH_PATHS } from '../constants/auth.constants';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes(AUTH_PATHS.REFRESH) && auth.refreshToken()) {
        return from(auth.refreshSession()).pipe(
          switchMap((ok) => {
            const token = auth.token();
            if (!ok || !token) return throwError(() => error);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
          }),
          catchError(() => {
            auth.logout();
            void router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
            return throwError(() => error);
          }),
        );
      }
      if (error.status === 401) {
        auth.logout();
        void router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
      }
      return throwError(() => error);
    }),
  );
};
