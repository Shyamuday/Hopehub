import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AUTH_PATHS } from '../core/constants/auth.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const isRefreshRequest = req.url.includes(AUTH_PATHS.REFRESH);

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error.status !== 401 || isRefreshRequest || !auth.refreshToken) {
        return throwError(() => error);
      }

      return from(auth.refreshAuthSession()).pipe(
        switchMap((user) => {
          const nextToken = auth.token;
          if (!user || !nextToken) return throwError(() => error);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${nextToken}` } }));
        }),
        catchError(() => throwError(() => error)),
      );
    }),
  );
};
