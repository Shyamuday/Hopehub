import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the stored JWT as a Bearer token to every request
 * that targets our own API. Skips third-party URLs.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);

    // Only attach token to our own API calls
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const token = auth.getToken();
    if (!token) {
        return next(req);
    }

    return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    }));
};
