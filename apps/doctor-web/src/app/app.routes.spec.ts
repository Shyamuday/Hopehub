import type { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { providerCapabilityGuard } from './core/guards/provider-capability-guard';
import { providerOnboardingGuard } from './core/guards/provider-onboarding-guard';

function childRoutes(): Route[] {
  return routes.flatMap((route) => route.children ?? []);
}

function routeFor(path: string): Route {
  const route = childRoutes().find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Route not found: ${path}`);
  return route;
}

describe('provider route policy', () => {
  it('protects every capability-scoped page with the capability guard', () => {
    const capabilityRoutes = childRoutes().filter((route) => route.data?.['capability']);
    expect(capabilityRoutes.length).toBeGreaterThan(0);
    for (const route of capabilityRoutes) {
      expect(route.canActivate, route.path).toContain(providerCapabilityGuard);
    }
  });

  it('allows listener screening only for listener-support roles', () => {
    const route = routeFor(ROUTE_PATHS.LISTENER_SCREENING);
    expect(route.data?.['capability']).toBe('listenerSupport');
    expect(route.canActivate).toContain(providerCapabilityGuard);
  });

  it('keeps operational pages locked until onboarding is complete', () => {
    const operationalPaths = [
      ROUTE_PATHS.WORKLIST,
      ROUTE_PATHS.APPOINTMENTS,
      ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
      ROUTE_PATHS.PATIENTS,
      ROUTE_PATHS.DISEASE_PAGES,
      ROUTE_PATHS.BLOG,
      ROUTE_PATHS.ONLINE_DOCTOR,
      ROUTE_PATHS.REPERTORY_BROWSER,
      ROUTE_PATHS.LEAVES,
      ROUTE_PATHS.EARNINGS,
      ROUTE_PATHS.SCAN,
      ROUTE_PATHS.NOTIFICATIONS_INBOX,
    ];
    for (const path of operationalPaths) {
      expect(routeFor(path).canActivate, path).toContain(providerOnboardingGuard);
    }
  });
});
