import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  Router,
  NavigationEnd,
  ActivatedRoute,
  NavigationStart,
  NavigationError,
  NavigationCancel,
} from '@angular/router';
import { Location, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Title, Meta } from '@angular/platform-browser';
import { SEOService } from './seo.service';

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;
  navigationError: string | null;
  routeData: any;
  queryParams: any;
  fragment: string | null;
}

export interface BreadcrumbItem {
  label: string;
  url: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private navigationStateSubject = new BehaviorSubject<NavigationState>({
    currentRoute: '/',
    previousRoute: null,
    canGoBack: false,
    canGoForward: false,
    isNavigating: false,
    navigationError: null,
    routeData: {},
    queryParams: {},
    fragment: null,
  });

  public navigationState$: Observable<NavigationState> = this.navigationStateSubject.asObservable();
  private routeHistory: string[] = [];
  private navigationStartTime: number = 0;

  constructor(
    private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta,
    private seoService: SEOService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.initializeNavigation();
  }

  private initializeNavigation(): void {
    // Track navigation start
    this.router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe(() => {
      this.navigationStartTime = Date.now();
      this.updateNavigationState(this.getCurrentRoute(), {
        isNavigating: true,
        navigationError: null,
      });
    });

    // Track successful navigation
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event as NavigationEnd),
      )
      .subscribe((event: NavigationEnd) => {
        const navigationTime = Date.now() - this.navigationStartTime;
        console.debug(`Navigation to ${event.url} completed in ${navigationTime}ms`);

        this.updateNavigationState(event.url, {
          isNavigating: false,
          navigationError: null,
          queryParams: this.router.routerState.root.snapshot.queryParams,
          fragment: this.router.routerState.root.snapshot.fragment,
        });
        this.updatePageMetadata();
      });

    // Track navigation errors
    this.router.events
      .pipe(filter((event) => event instanceof NavigationError))
      .subscribe((event: NavigationError) => {
        console.error('Navigation error:', event.error);
        this.updateNavigationState(this.getCurrentRoute(), {
          isNavigating: false,
          navigationError: 'Navigation failed. Please try again.',
        });
      });

    // Track navigation cancellation
    this.router.events
      .pipe(filter((event) => event instanceof NavigationCancel))
      .subscribe((event: NavigationCancel) => {
        console.warn('Navigation cancelled:', event.reason);
        this.updateNavigationState(this.getCurrentRoute(), {
          isNavigating: false,
          navigationError: null,
        });
      });

    // Initialize with current route
    this.updateNavigationState(this.router.url, {
      isNavigating: false,
      navigationError: null,
      queryParams: this.router.routerState.root.snapshot.queryParams,
      fragment: this.router.routerState.root.snapshot.fragment,
    });
    this.updatePageMetadata();
  }

  private updateNavigationState(
    currentUrl: string,
    partialUpdate?: Partial<NavigationState>,
  ): void {
    const currentState = this.navigationStateSubject.value;

    // Add to history if it's a new route
    if (currentUrl !== currentState.currentRoute && !partialUpdate?.isNavigating) {
      if (currentState.currentRoute !== '/') {
        this.routeHistory.push(currentState.currentRoute);
      }

      // Limit history size to prevent memory issues
      if (this.routeHistory.length > 50) {
        this.routeHistory.shift();
      }
    }

    // Get current route data
    let routeData = {};
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    if (route.snapshot.data) {
      routeData = route.snapshot.data;
    }

    const newState: NavigationState = {
      currentRoute: currentUrl,
      previousRoute: currentState.currentRoute !== '/' ? currentState.currentRoute : null,
      canGoBack: this.routeHistory.length > 0,
      canGoForward: false, // Browser forward state is not easily accessible
      isNavigating: false,
      navigationError: null,
      routeData,
      queryParams: {},
      fragment: null,
      ...partialUpdate,
    };

    this.navigationStateSubject.next(newState);
  }

  private updatePageMetadata(): void {
    // Get the title and metadata from route data
    let title = 'Hope Hub - Professional Mental Health Services';
    let description = 'Professional mental health services and community support';
    let keywords = 'mental health, counseling, therapy, hope hub';

    // Try to get metadata from current route
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    if (route.snapshot.title) {
      title = route.snapshot.title;
    }

    if (route.snapshot.data) {
      const data = route.snapshot.data;
      if (data['description']) {
        description = data['description'];
      }
      if (data['keywords']) {
        keywords = data['keywords'];
      }
    }

    // Use SEO service for comprehensive meta tag updates
    const currentUrl = isPlatformBrowser(this.platformId) ? window.location.href : '';
    this.seoService.updateSEO({
      title,
      description,
      keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map((k) => k.trim()),
      url: currentUrl,
      canonicalUrl: currentUrl,
      type: route.snapshot.data['type'] || 'website',
    });

    // Add breadcrumb structured data
    const breadcrumbs = this.getBreadcrumbs();
    if (breadcrumbs.length > 1) {
      this.seoService.addBreadcrumbStructuredData(
        breadcrumbs.map((b) => ({ name: b.label, url: b.url })),
      );
    }
  }

  /**
   * Navigate to a specific route
   */
  navigateTo(route: string | string[], queryParams?: any, fragment?: string): Promise<boolean> {
    const navigationExtras = {
      queryParams,
      fragment,
      replaceUrl: false,
    };

    if (typeof route === 'string') {
      return this.router.navigate([route], navigationExtras);
    }
    return this.router.navigate(route, navigationExtras);
  }

  /**
   * Navigate and replace current URL in history
   */
  navigateToReplace(route: string | string[], queryParams?: any): Promise<boolean> {
    const navigationExtras = {
      queryParams,
      replaceUrl: true,
    };

    if (typeof route === 'string') {
      return this.router.navigate([route], navigationExtras);
    }
    return this.router.navigate(route, navigationExtras);
  }

  /**
   * Navigate back in browser history
   */
  goBack(): void {
    if (this.routeHistory.length > 0) {
      const previousRoute = this.routeHistory.pop();
      if (previousRoute) {
        this.navigateToReplace(previousRoute);
        return;
      }
    }
    this.location.back();
  }

  /**
   * Navigate forward in browser history
   */
  goForward(): void {
    this.location.forward();
  }

  /**
   * Get current route
   */
  getCurrentRoute(): string {
    return this.navigationStateSubject.value.currentRoute;
  }

  /**
   * Check if current route matches pattern
   */
  isCurrentRoute(route: string, exact: boolean = false): boolean {
    const currentRoute = this.getCurrentRoute();
    if (exact) {
      return currentRoute === route;
    }
    return currentRoute.startsWith(route);
  }

  /**
   * Get route parameters
   */
  getRouteParams(): Observable<any> {
    return this.activatedRoute.params;
  }

  /**
   * Get query parameters
   */
  getQueryParams(): Observable<any> {
    return this.activatedRoute.queryParams;
  }

  /**
   * Get route fragment
   */
  getFragment(): Observable<string | null> {
    return this.activatedRoute.fragment;
  }

  /**
   * Update URL without navigation
   */
  updateUrl(url: string): void {
    this.location.replaceState(url);
  }

  /**
   * Get the full URL including query parameters
   */
  getFullUrl(): string {
    return this.router.url;
  }

  /**
   * Get current navigation state
   */
  getCurrentNavigationState(): NavigationState {
    return this.navigationStateSubject.value;
  }

  /**
   * Clear navigation error
   */
  clearNavigationError(): void {
    const currentState = this.navigationStateSubject.value;
    if (currentState.navigationError) {
      this.updateNavigationState(currentState.currentRoute, { navigationError: null });
    }
  }

  /**
   * Check if a route exists
   */
  isValidRoute(route: string): boolean {
    try {
      const urlTree = this.router.parseUrl(route);
      return (
        this.router.isActive(urlTree, {
          paths: 'exact',
          queryParams: 'exact',
          fragment: 'ignored',
          matrixParams: 'ignored',
        }) || this.router.config.some((r) => r.path === route.replace('/', ''))
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate breadcrumb navigation
   */
  getBreadcrumbs(): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    const currentRoute = this.getCurrentRoute();

    // Always include home
    breadcrumbs.push({
      label: 'Home',
      url: '/',
      active: currentRoute === '/',
    });

    // Parse current route to build breadcrumbs
    const segments = currentRoute.split('/').filter((segment) => segment);
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      currentPath += '/' + segments[i];
      const isLast = i === segments.length - 1;

      // Get route data for breadcrumb label
      const routeConfig = this.router.config.find(
        (r) => r.path === segments.slice(0, i + 1).join('/'),
      );
      let label = segments[i];

      if (routeConfig?.data?.['breadcrumb']) {
        label = routeConfig.data['breadcrumb'];
      } else {
        // Capitalize and format segment
        label = segments[i].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      }

      breadcrumbs.push({
        label,
        url: currentPath,
        active: isLast,
      });
    }

    return breadcrumbs;
  }

  /**
   * Preload a route for better performance
   */
  preloadRoute(route: string): void {
    this.router
      .navigate([route], { skipLocationChange: true })
      .then(() => {
        // Route is now preloaded
      })
      .catch(() => {
        // Ignore preload errors
      });
  }
}
