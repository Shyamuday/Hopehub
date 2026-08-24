import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const articleDirectory = join(appRoot, 'src', 'app', 'core', 'data', 'articles');
const sitemapPath = join(appRoot, 'public', 'sitemap.xml');
const cloudFrontRouterPath = join(
  appRoot,
  '..',
  '..',
  'deploy',
  'cloudfront',
  'frontend-host-router.js',
);

const today = new Date().toISOString().slice(0, 10);
const publicPages = [
  ['/', 'daily', 1.0],
  ['/services', 'weekly', 0.9],
  ['/support', 'weekly', 0.9],
  ['/care-team', 'daily', 0.95],
  ['/packages', 'weekly', 0.9],
  ['/events', 'weekly', 0.8],
  ['/resources', 'weekly', 0.7],
  ['/organization', 'monthly', 0.6],
  ['/community', 'weekly', 0.8],
  ['/telegram', 'weekly', 0.8],
  ['/about', 'monthly', 0.8],
  ['/contact', 'monthly', 0.8],
  ['/faq', 'monthly', 0.8],
  ['/editorial-policy', 'monthly', 0.8],
  ['/privacy', 'yearly', 0.5],
  ['/terms', 'yearly', 0.5],
  ['/refund-policy', 'yearly', 0.5],
  ['/payment-policy', 'yearly', 0.5],
  ['/shipping-policy', 'yearly', 0.5],
  ['/assessments', 'weekly', 0.8],
  ['/exercises', 'weekly', 0.9],
  ['/lifestyle-tips', 'weekly', 0.9],
  ['/articles', 'weekly', 0.9],
];

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function entry(path, changeFrequency, priority, lastModified = today) {
  return `  <url>
    <loc>${xmlEscape(`https://hopehub.in${path}`)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const articleFiles = (await readdir(articleDirectory)).filter((name) => name.endsWith('.ts'));
const articleRoutes = [];
for (const name of articleFiles) {
  const source = await readFile(join(articleDirectory, name), 'utf8');
  const objectPattern = /\{\s*id:\s*'([^']+)'([\s\S]*?)(?=\n\s*\},?\s*(?:\n|$))/g;
  for (const match of source.matchAll(objectPattern)) {
    const id = match[1];
    const body = match[2];
    const published = body.match(/publishedDate:\s*new Date\('([^']+)'\)/)?.[1] || today;
    const updated = body.match(/lastUpdated:\s*new Date\('([^']+)'\)/)?.[1] || published;
    const featured = /isFeatured:\s*true/.test(body);
    articleRoutes.push({ id, updated, priority: featured ? 0.85 : 0.75 });
  }
}
articleRoutes.sort((left, right) => left.id.localeCompare(right.id));

const cloudFrontRouter = await readFile(cloudFrontRouterPath, 'utf8');
const missingCloudFrontRoutes = [
  ...publicPages.map(([path]) => path),
  ...articleRoutes.map(({ id }) => `/articles/${id}`),
].filter((path) => !cloudFrontRouter.includes(`'${path}': true`));
if (missingCloudFrontRoutes.length) {
  throw new Error(
    `CloudFront public-route map is missing: ${missingCloudFrontRoutes.join(', ')}. ` +
      'Add each route before building so production cannot silently serve homepage HTML.',
  );
}

const entries = [
  ...publicPages.map(([path, frequency, priority]) => entry(path, frequency, priority)),
  ...articleRoutes.map(({ id, updated, priority }) =>
    entry(`/articles/${id}`, 'monthly', priority, updated),
  ),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

await writeFile(sitemapPath, sitemap, 'utf8');
console.log(`Generated sitemap with ${entries.length} canonical URLs.`);
