import { ErrorHandler, Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
    private router = inject(Router);
    private isBrowser: boolean;

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    handleError(error: any): void {
        // Always log errors in development
        if (!environment.production) {
            console.error('Global error caught:', error);
        }

        // Handle different types of errors
        if (error?.status === 404) {
            this.router.navigate(['/404']);
            return;
        }

        if (error?.status >= 500) {
            // Server errors - could integrate with error reporting service
            if (environment.enableErrorReporting) {
                // TODO: Integrate with error reporting service (e.g., Sentry)
                console.error('Server error:', error);
            }
            return;
        }

        if (error?.name === 'ChunkLoadError') {
            // Handle chunk loading errors (common in lazy-loaded modules)
            console.error('Chunk load error - reloading page');
            if (this.isBrowser) {
                window.location.reload();
            }
            return;
        }

        // Log other errors for debugging
        if (!environment.production || environment.enableErrorReporting) {
            console.error('Unhandled error:', error);
        }
    }
}