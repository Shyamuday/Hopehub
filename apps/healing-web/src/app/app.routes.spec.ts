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
});
