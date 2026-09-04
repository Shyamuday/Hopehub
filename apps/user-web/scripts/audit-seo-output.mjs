import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const browserRoot = join(appRoot, 'dist', 'user-web', 'browser');
const sitemap = await readFile(join(browserRoot, 'sitemap.xml'), 'utf8');

assert.ok(!/<(?:changefreq|priority)>/i.test(sitemap), 'Sitemap contains ignored ranking hints.');

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => new URL(match[1].replaceAll('&amp;', '&')),
);
assert.ok(sitemapUrls.length > 0, 'Sitemap has no URLs.');

const titles = new Map();
for (const url of sitemapUrls) {
  const routePath = url.pathname === '/' ? '' : url.pathname.slice(1);
  const outputPath = join(browserRoot, routePath, 'index.html');
  const html = await readFile(outputPath, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1];
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1];
  const twitterUrl = html.match(/<meta\s+name="twitter:url"\s+content="([^"]*)"/i)?.[1];
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1];
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;

  assert.ok(title, `${url.pathname}: missing title.`);
  assert.ok(description, `${url.pathname}: missing meta description.`);
  assert.equal(canonical, url.href, `${url.pathname}: canonical does not match the sitemap URL.`);
  assert.equal(twitterUrl, url.href, `${url.pathname}: twitter:url does not match the canonical.`);
  assert.match(
    robots || '',
    /^index,\s*follow$/i,
    `${url.pathname}: sitemap URL is not indexable.`,
  );
  assert.equal(h1Count, 1, `${url.pathname}: expected exactly one h1, found ${h1Count}.`);
  assert.ok(title.length <= 65, `${url.pathname}: title is longer than 65 characters.`);
  assert.ok(
    description.length <= 165,
    `${url.pathname}: description is longer than 165 characters.`,
  );

  const duplicate = titles.get(title);
  assert.ok(!duplicate, `${url.pathname}: duplicate title also used by ${duplicate}.`);
  titles.set(title, url.pathname);

  for (const match of html.matchAll(
    /<script\s+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis,
  )) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${url.pathname}: invalid JSON-LD.`);
  }
}

const privateShell = await readFile(join(browserRoot, 'private-shell.html'), 'utf8');
assert.match(privateShell, /noindex,\s*nofollow/i, 'Private shell must be noindex, nofollow.');
assert.ok(
  !/rel="canonical"/i.test(privateShell),
  'Private shell must not contain a canonical URL.',
);

const routeList = sitemapUrls.map((url) => url.pathname).join(', ');
console.log(`Verified SEO output for ${sitemapUrls.length} indexable routes: ${routeList}`);
