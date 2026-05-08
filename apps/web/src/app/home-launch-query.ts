import type { ParamMap, UrlTree } from '@angular/router';
import type { HomeLaunchQuery } from './home-launch-disease';

/** Stable keys shared by home banner + SEO when reading the URL. */
export function homeLaunchQueryFromParamMap(q: ParamMap): HomeLaunchQuery {
  return {
    for: q.get('for') ?? undefined,
    d: q.get('d') ?? undefined,
    disease: q.get('disease') ?? undefined,
    q: q.get('q') ?? undefined,
    keyword: q.get('keyword') ?? undefined,
    topic: q.get('topic') ?? undefined,
    utm_term: q.get('utm_term') ?? undefined,
    utm_content: q.get('utm_content') ?? undefined
  };
}

export function homeLaunchQueryFromUrlTree(tree: UrlTree): HomeLaunchQuery {
  const out: HomeLaunchQuery = {};
  for (const [k, v] of Object.entries(tree.queryParams)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

/** True when the navigation target is the homepage (query allowed). */
export function isHomePath(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return path === '/' || path === '';
}
