import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = join(appRoot, 'public', 'sitemap.xml');
const siteUrl = 'https://care.hopehub.in';
const apiUrl = (process.env.HOPEHUB_API_URL || 'https://api.hopehub.in').replace(/\/+$/, '');
const audienceConstantsPath = join(
  appRoot,
  'src',
  'app',
  'core',
  'constants',
  'blog-audience.constants.ts',
);
const audienceSource = await readFile(audienceConstantsPath, 'utf8');
const exclusionBlock =
  audienceSource.match(/USER_WEB_EXCLUDED_BLOG_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? '';
const excludedBlogSlugs = new Set(
  [...exclusionBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]),
);

const publicPages = [
  ['/', 'daily', 1.0],
  ['/talk-to-doctor', 'daily', 0.95],
  ['/treatments', 'weekly', 0.9],
  ['/our-doctors', 'weekly', 0.85],
  ['/blog', 'weekly', 0.85],
  ['/chronic-care', 'weekly', 0.8],
  ['/about', 'monthly', 0.75],
  ['/testimonials', 'monthly', 0.7],
  ['/why-successful', 'monthly', 0.7],
  ['/faq', 'monthly', 0.7],
  ['/safety', 'monthly', 0.7],
  ['/editorial-policy', 'monthly', 0.7],
  ['/contact', 'monthly', 0.6],
  ['/careers', 'weekly', 0.55],
  ['/legal', 'yearly', 0.4],
  ['/privacy-policy', 'yearly', 0.4],
  ['/terms-and-conditions', 'yearly', 0.4],
  ['/cancellation-and-refund-policy', 'yearly', 0.4],
  ['/return-and-exchange-policy', 'yearly', 0.4],
  ['/shipping-policy', 'yearly', 0.4],
  ['/payment-policy', 'yearly', 0.4],
];

const knownTreatmentSlugs = [
  'hair-fall',
  'skin-care',
  'chronic-care',
  'diabetes-mellitus',
  'hypertension',
  'chronic-kidney-disease',
  'gallstone',
  'liver-cirrhosis',
  'piles',
  'kidney-stone',
  'mental-health',
  'sexual-health',
  'respiratory-disease',
  'musculoskeletal-disease',
  'cardiovascular-disease',
];

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function validDate(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

async function fetchJson(path) {
  const response = await globalThis.fetch(`${apiUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal: globalThis.AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

async function loadDynamicEntries() {
  const entries = [];
  try {
    const payload = await fetchJson('/diseases?grouped=false');
    for (const disease of payload.diseases ?? []) {
      if (!disease.slug) continue;
      entries.push({
        path: `/treatments/${encodeURIComponent(disease.slug)}`,
        frequency: 'monthly',
        priority: 0.75,
        lastModified: validDate(disease.updatedAt),
      });
    }
  } catch (error) {
    console.warn('[user-web sitemap] Disease catalog unavailable:', error);
  }

  try {
    const payload = await fetchJson('/blog?sort=recent');
    for (const post of payload.posts ?? []) {
      if (!post.slug || excludedBlogSlugs.has(post.slug.trim().toLowerCase())) continue;
      entries.push({
        path: `/blog/${encodeURIComponent(post.slug)}`,
        frequency: 'monthly',
        priority: post.isFeatured ? 0.8 : 0.7,
        lastModified: validDate(post.updatedAt || post.publishedAt || post.createdAt),
      });
    }
  } catch (error) {
    console.warn('[user-web sitemap] Blog catalog unavailable:', error);
  }
  return entries;
}

function renderEntry({ path, frequency, priority, lastModified }) {
  return `  <url>
    <loc>${xmlEscape(`${siteUrl}${path}`)}</loc>${lastModified ? `\n    <lastmod>${lastModified}</lastmod>` : ''}
    <changefreq>${frequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const entriesByPath = new Map(
  publicPages.map(([path, frequency, priority]) => [path, { path, frequency, priority }]),
);
for (const slug of knownTreatmentSlugs) {
  const path = `/treatments/${slug}`;
  entriesByPath.set(path, { path, frequency: 'monthly', priority: 0.7 });
}
const dynamicEntries = await loadDynamicEntries();
for (const entry of dynamicEntries) entriesByPath.set(entry.path, entry);
if (!dynamicEntries.some((entry) => entry.path.startsWith('/blog/'))) {
  entriesByPath.delete('/blog');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...entriesByPath.values()].map(renderEntry).join('\n')}
</urlset>
`;

await mkdir(dirname(sitemapPath), { recursive: true });
await writeFile(sitemapPath, sitemap, 'utf8');
console.log(`Generated User Web sitemap with ${entriesByPath.size} canonical URLs.`);
