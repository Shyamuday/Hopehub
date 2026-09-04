import { RenderMode, ServerRoute } from '@angular/ssr';
import { environment } from '../environments/environment';
import { isUserWebBlogSlug } from './core/constants/blog-audience.constants';

type DiseaseListResponse = {
  diseases?: Array<{
    slug?: string | null;
    isActive?: boolean;
    publicDomains?: string[];
  }>;
};

type BlogListResponse = {
  posts?: Array<{ slug?: string | null }>;
};

async function fetchSlugs(path: string, key: 'diseases' | 'posts'): Promise<string[]> {
  try {
    const response = await fetch(`${environment.apiUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.warn(`[user-web prerender] ${path} returned HTTP ${response.status}.`);
      return [];
    }
    const payload = (await response.json()) as DiseaseListResponse & BlogListResponse;
    return (payload[key] ?? [])
      .filter((entry) => {
        if (key !== 'diseases') return true;
        const disease = entry as NonNullable<DiseaseListResponse['diseases']>[number];
        return (
          disease.isActive !== false &&
          (!disease.publicDomains?.length || disease.publicDomains.includes('HOMEOPATHY'))
        );
      })
      .map((entry) => entry.slug?.trim())
      .filter((slug): slug is string => Boolean(slug));
  } catch (error) {
    console.warn(`[user-web prerender] Could not load ${path}:`, error);
    return [];
  }
}

const publicRoutes = [
  '',
  'about',
  'treatments',
  'talk-to-doctor',
  'our-doctors',
  'blog',
  'testimonials',
  'careers',
  'chronic-care',
  'faq',
  'why-successful',
  'contact',
  'editorial-policy',
  'legal',
  'privacy-policy',
  'terms-and-conditions',
  'cancellation-and-refund-policy',
  'return-and-exchange-policy',
  'shipping-policy',
  'payment-policy',
  'safety',
] as const;

export const serverRoutes: ServerRoute[] = [
  ...publicRoutes.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'treatments/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (await fetchSlugs('/diseases?grouped=false', 'diseases')).map((slug) => ({ slug })),
  },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (await fetchSlugs('/blog?sort=recent', 'posts'))
        .filter(isUserWebBlogSlug)
        .map((slug) => ({ slug })),
  },
  // Authentication, patient records, live rooms, and unknown URLs remain browser-rendered.
  { path: '**', renderMode: RenderMode.Client },
];
