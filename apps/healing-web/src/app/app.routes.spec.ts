import { AuthGuard } from './core/guards';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';

describe('consumer route access policy', () => {
  const protectedPaths = [
    'profile',
    'my-support-plan',
    'dashboard',
    'live-session/:consultationId',
  ];

  for (const path of protectedPaths) {
    it(`protects ${path}`, () => {
      const route = routes.find((candidate) => candidate.path === path);

      expect(route).toBeDefined();
      expect(route?.canActivate).toContain(AuthGuard);
    });
  }

  it('publishes all Google Ads trust and campaign routes with descriptions', () => {
    const publicPaths = [
      'services',
      'care-team',
      'telegram',
      'about',
      'contact',
      'faq',
      'privacy',
      'terms',
      'refund-policy',
    ];

    for (const path of publicPaths) {
      const route = routes.find((candidate) => candidate.path === path);
      expect(route?.title).toBeTruthy();
      expect(route?.data?.['description']).toBeTruthy();
    }
  });

  it('redirects duplicate public URLs to one canonical route', () => {
    expect(routes.find((route) => route.path === 'psychologists')?.redirectTo).toBe('care-team');
    expect(routes.find((route) => route.path === 'psychologists/:id')?.redirectTo).toBe(
      'care-team/:id',
    );
    expect(routes.find((route) => route.path === 'resources/articles/:slug')?.redirectTo).toBe(
      'articles/:slug',
    );
  });

  it('prerenders named assessment landing pages and concern guides', () => {
    const prerenderPaths = serverRoutes.map((route) => route.path);

    expect(prerenderPaths).toContain('anxiety-test');
    expect(prerenderPaths).toContain('depression-test');
    expect(prerenderPaths).toContain('grief-test');
    expect(prerenderPaths).toContain('concerns/:slug');
  });
});
