import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout } from 'rxjs';

/**
 * The default prevents a stalled connection from leaving a page action loading
 * forever. A deliberately longer request (for example, a large upload) can
 * opt in to a different limit with `context.set(HTTP_REQUEST_TIMEOUT_MS, ms)`.
 */
export const HTTP_REQUEST_TIMEOUT_MS = new HttpContextToken<number>(() => 1_500);

export const requestTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const timeoutMs = request.context.get(HTTP_REQUEST_TIMEOUT_MS);

  return next(request).pipe(
    timeout({ first: timeoutMs }),
    catchError((error) => {
      if (error?.name !== 'TimeoutError') {
        return throwError(() => error);
      }

      return throwError(
        () =>
          new HttpErrorResponse({
            error: {
              code: 'REQUEST_TIMEOUT',
              message: 'The service is taking too long to respond. Please try again.'
            },
            status: 408,
            statusText: 'Request timed out',
            url: request.url
          })
      );
    })
  );
};
