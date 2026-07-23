import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { getServiceIds } from '../data/services-data';

@Injectable({
  providedIn: 'root',
})
export class NavigationGuard implements CanActivate {
  private readonly validServiceIds = getServiceIds();

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Basic navigation validation
    const url = state.url;

    // Validate service detail routes have valid ID parameter
    if (url.startsWith('/services/') && url !== '/services') {
      const serviceId = route.params['id'];

      // Check if service ID is provided and not empty
      if (!serviceId || serviceId.trim() === '') {
        console.warn('NavigationGuard: Invalid service ID, redirecting to services list');
        return this.router.createUrlTree(['/services']);
      }

      // Additional validation for service ID format (alphanumeric, hyphens, underscores)
      const validIdPattern = /^[a-zA-Z0-9_-]+$/;
      if (!validIdPattern.test(serviceId)) {
        console.warn('NavigationGuard: Invalid service ID format, redirecting to services list');
        return this.router.createUrlTree(['/services']);
      }

      // Check for reasonable ID length (prevent extremely long URLs)
      if (serviceId.length > 100) {
        console.warn('NavigationGuard: Service ID too long, redirecting to services list');
        return this.router.createUrlTree(['/services']);
      }

      // Validate against known service IDs
      if (!this.validServiceIds.includes(serviceId)) {
        console.warn(
          `NavigationGuard: Unknown service ID '${serviceId}', redirecting to services list`,
        );
        return this.router.createUrlTree(['/services']);
      }
    }

    // Validate query parameters don't contain malicious content
    const queryParams = route.queryParams;
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (typeof value === 'string') {
          // Check for potential XSS attempts
          if (this.containsSuspiciousContent(value)) {
            console.warn(
              'NavigationGuard: Suspicious query parameter detected, redirecting to home',
            );
            return this.router.createUrlTree(['/']);
          }
        }
      }
    }

    // Allow navigation for all other routes
    return true;
  }

  private containsSuspiciousContent(value: string): boolean {
    // Basic XSS detection patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(value));
  }
}
