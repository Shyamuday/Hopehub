import { diseaseInfos } from './constants';
import type { DiseaseInfo } from './interfaces';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugifyGuess(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type HomeLaunchQuery = Record<string, string | undefined>;

/**
 * Maps homepage query params to a known disease profile.
 *
 * Supported params:
 * - `for`, `d`, `disease`: canonical slug (e.g. hair-fall) — best for ads and internal links
 * - `q`, `keyword`, `topic`, `utm_term`: free-text / search-style keyword — matched against name, slug, SEO keywords
 */
export function resolveHomeLaunchDisease(params: HomeLaunchQuery): DiseaseInfo | null {
  const slugParam = params['for'] || params['d'] || params['disease'];
  if (slugParam?.trim()) {
    const slug = slugParam.trim().toLowerCase();
    const exact = diseaseInfos.find((d) => d.slug === slug);
    if (exact) {
      return exact;
    }
  }

  const keyword =
    params['q'] || params['keyword'] || params['topic'] || params['utm_term'] || params['utm_content'];
  if (!keyword?.trim()) {
    return null;
  }

  const q = normalize(keyword);
  const slugGuess = slugifyGuess(keyword);
  const bySlugGuess = diseaseInfos.find((d) => d.slug === slugGuess);
  if (bySlugGuess) {
    return bySlugGuess;
  }

  for (const d of diseaseInfos) {
    const nameN = normalize(d.name);
    const shortN = normalize(d.shortName);
    if (nameN.includes(q) || shortN.includes(q) || q.includes(shortN)) {
      return d;
    }
    if (d.slug.includes(q.replace(/\s+/g, '-'))) {
      return d;
    }
  }

  for (const d of diseaseInfos) {
    const kws = d.seo?.keywords || [];
    for (const k of kws) {
      const kn = normalize(k);
      if (kn.includes(q) || q.includes(kn)) {
        return d;
      }
    }
  }

  return null;
}
