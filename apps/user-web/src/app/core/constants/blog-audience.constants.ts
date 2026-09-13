/**
 * Legacy Hope Hub articles that predate public-domain tagging. Keep this guard
 * until every environment has applied the public-content-audience migration.
 */
export const USER_WEB_EXCLUDED_BLOG_SLUGS = [
  'understanding-anxiety-disorders',
  'managing-panic-attacks',
  'social-anxiety-tips',
  'navigating-breakup-recovery',
  'rebuilding-life-after-breakup',
  'understanding-grief-after-breakup',
  'understanding-depression-basics',
  'coping-strategies-depression',
  'depression-myths-facts',
  'self-care-basics-guide',
  'building-healthy-boundaries',
  'understanding-stress-response',
  'stress-management-techniques',
] as const;

const excludedBlogSlugs = new Set<string>(USER_WEB_EXCLUDED_BLOG_SLUGS);

export function isUserWebBlogSlug(slug: string): boolean {
  return !excludedBlogSlugs.has(slug.trim().toLowerCase());
}
