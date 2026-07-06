import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AdminAuth } from '../services/admin-auth';
import { ROUTE_PATHS } from '../constants/app-routes.constants';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        const isBackgroundPoll = req.url.includes('/notifications/unread-count');
        const onLogin = router.url.includes(`/${ROUTE_PATHS.LOGIN}`);

        if (!isBackgroundPoll) {
          auth.logout();
          if (!onLogin) {
            void router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
          }
        }
      }
      return throwError(() => error);
    })
  );
};
