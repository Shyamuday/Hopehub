import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const REFRESH_PATH = '/auth/refresh';
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.';

function sessionExpiredError(error: HttpErrorResponse): HttpErrorResponse {
  return new HttpErrorResponse({
    error: { code: 'SESSION_EXPIRED', message: SESSION_EXPIRED_MESSAGE },
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url || undefined,
  });
}

/**
 * Renews an expired access token once, then retries the failed request.
 * If the refresh session is missing or invalid, clear the stale session and
 * take the user straight to the login modal while retaining the return URL.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isAuthenticatedApiRequest =
        req.url.startsWith(environment.apiUrl) && req.headers.has('Authorization');

      if (!isUnauthorized || !isAuthenticatedApiRequest) {
        return throwError(() => error);
      }

      const returnUrl = router.url;
      if (!req.url.includes(REFRESH_PATH) && auth.getRefreshToken()) {
        return from(auth.refreshAccessToken()).pipe(
          switchMap((token) => {
            if (!token) {
              auth.requireLogin(returnUrl);
              return throwError(() => sessionExpiredError(error));
            }

            return next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
              }),
            ).pipe(
              catchError((retryError: unknown) => {
                if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                  auth.requireLogin(returnUrl);
                  return throwError(() => sessionExpiredError(retryError));
                }
                return throwError(() => retryError);
              }),
            );
          }),
        );
      }

      auth.requireLogin(returnUrl);
      return throwError(() => sessionExpiredError(error));
    }),
  );
};
