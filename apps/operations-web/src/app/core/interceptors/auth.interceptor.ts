import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AUTH_PATHS } from '../constants/auth.constants';
import { PlatformAuthService } from '../../services/platform-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(PlatformAuthService);
  const token = auth.getToken();

  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    : req;

  return next(request).pipe(
    catchError((error) => {
      const refresh$ = auth.refreshAccessToken();
      if (error.status !== 401 || req.url.includes(AUTH_PATHS.REFRESH) || !refresh$) {
        return throwError(() => error);
      }

      return refresh$.pipe(
        switchMap(() => {
          const nextToken = auth.getToken();
          if (!nextToken) return throwError(() => error);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${nextToken}` } }));
        }),
        catchError(() => {
          auth.logout();
          return throwError(() => error);
        })
      );
    })
  );
};
