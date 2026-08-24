import { RenderMode, ServerRoute } from '@angular/ssr';

const googleLandingRoutes = [
  '',
  'services',
  'support',
  'care-team',
  'packages',
  'community',
  'telegram',
  'about',
  'contact',
  'faq',
  'privacy',
  'terms',
  'refund-policy',
  'payment-policy',
  'shipping-policy',
  'assessments',
  'exercises',
  'lifestyle-tips',
  'articles',
] as const;

export const serverRoutes: ServerRoute[] = [
  ...googleLandingRoutes.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  // User-specific and data-parameter routes stay client-rendered on the static host.
  { path: '**', renderMode: RenderMode.Client },
];
