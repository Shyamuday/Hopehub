import { AuthGuard } from './core/guards';
import { routes } from './app.routes';

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
});
