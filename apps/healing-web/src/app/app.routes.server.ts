import { RenderMode, ServerRoute } from '@angular/ssr';
import { ALL_ARTICLES } from './core/data/article-configs';

const googleLandingRoutes = [
  '',
  'services',
  'support',
  'care-team',
  'packages',
  'events',
  'resources',
  'organization',
  'community',
  'telegram',
  'telegram-group-admin',
  'about',
  'contact',
  'faq',
  'careers',
  'listener-guidelines',
  'listener-training',
  'privacy',
  'terms',
  'refund-policy',
  'payment-policy',
  'shipping-policy',
  'assessments',
  'exercises',
  'lifestyle-tips',
  'articles',
  'editorial-policy',
  'donate',
  '404',
] as const;

export const serverRoutes: ServerRoute[] = [
  ...googleLandingRoutes.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'articles/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => ALL_ARTICLES.map((article) => ({ slug: article.id })),
  },
  // User-specific and data-parameter routes stay client-rendered on the static host.
  { path: '**', renderMode: RenderMode.Client },
];
