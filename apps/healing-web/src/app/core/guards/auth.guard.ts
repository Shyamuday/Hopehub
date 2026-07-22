import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        return this.checkAuth(state.url);
    }

    canActivateChild(
        childRoute: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        return this.checkAuth(state.url);
    }

    private checkAuth(url: string): Observable<boolean> {
        return this.authService.isAuthenticated$.pipe(
            take(1),
            map(isAuthenticated => {
                if (isAuthenticated) {
                    return true;
                } else {
                    // Store the attempted URL for redirecting after login
                    this.router.navigate(['/auth/login'], {
                        queryParams: { returnUrl: url }
                    });
                    return false;
                }
            })
        );
    }
}

@Injectable({
    providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(): Observable<boolean> {
        return this.authService.isAuthenticated$.pipe(
            take(1),
            map(isAuthenticated => {
                if (!isAuthenticated) {
                    return true;
                } else {
                    // User is already authenticated, redirect to dashboard
                    this.router.navigate(['/dashboard']);
                    return false;
                }
            })
        );
    }
}