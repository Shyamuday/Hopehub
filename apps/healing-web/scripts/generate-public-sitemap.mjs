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

const publicPages = [
  '/',
  '/services',
  '/support',
  '/care-team',
  '/packages',
  '/events',
  '/resources',
  '/recorded-sessions',
  '/organization',
  '/community',
  '/telegram',
  '/about',
  '/contact',
  '/faq',
  '/careers',
  '/listener-guidelines',
  '/listener-training',
  '/editorial-policy',
  '/donate',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/payment-policy',
  '/shipping-policy',
  '/assessments',
  '/anxiety-test',
  '/depression-test',
  '/stress-test',
  '/breakup-test',
  '/sleep-test',
  '/relationship-test',
  '/burnout-test',
  '/wellbeing-test',
  '/mental-health-test',
  '/panic-test',
  '/social-anxiety-test',
  '/loneliness-test',
  '/self-esteem-test',
  '/anger-test',
  '/grief-test',
  '/concerns/anxiety',
  '/concerns/depression',
  '/concerns/stress',
  '/concerns/relationship',
  '/concerns/sleep',
  '/concerns/breakup',
  '/concerns/burnout',
  '/concerns/panic',
  '/concerns/social-anxiety',
  '/concerns/loneliness',
  '/concerns/self-esteem',
  '/concerns/anger',
  '/concerns/grief',
  '/concerns/wellbeing',
  '/exercises',
  '/lifestyle-tips',
  '/articles',
];

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function entry(path, lastModified) {
  return `  <url>
    <loc>${xmlEscape(`https://hopehub.in${path}`)}</loc>${
      lastModified ? `\n    <lastmod>${lastModified}</lastmod>` : ''
    }
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
    const published = body.match(/publishedDate:\s*new Date\('([^']+)'\)/)?.[1];
    if (!published) throw new Error(`Article ${id} is missing publishedDate.`);
    const updated = body.match(/lastUpdated:\s*new Date\('([^']+)'\)/)?.[1] || published;
    articleRoutes.push({ id, updated });
  }
}
articleRoutes.sort((left, right) => left.id.localeCompare(right.id));

const cloudFrontRouter = await readFile(cloudFrontRouterPath, 'utf8');
const missingCloudFrontRoutes = [
  ...publicPages,
  ...articleRoutes.map(({ id }) => `/articles/${id}`),
].filter((path) => !cloudFrontRouter.includes(`'${path}': true`));
if (missingCloudFrontRoutes.length) {
  throw new Error(
    `CloudFront public-route map is missing: ${missingCloudFrontRoutes.join(', ')}. ` +
      'Add each route before building so production cannot silently serve homepage HTML.',
  );
}

const entries = [
  ...publicPages.map((path) => entry(path)),
  ...articleRoutes.map(({ id, updated }) => entry(`/articles/${id}`, updated)),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

await writeFile(sitemapPath, sitemap, 'utf8');
console.log(`Generated sitemap with ${entries.length} canonical URLs.`);
