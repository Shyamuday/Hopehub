/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const test = require('node:test');

const source = readFileSync(require.resolve('./frontend-host-router.js'), 'utf8');
const patientSitemap = readFileSync(
  require.resolve('../../apps/user-web/public/sitemap.xml'),
  'utf8'
);
const context = {};
runInNewContext(source + '\nthis.testHandler = handler;', context);

function route(host, uri, querystring = {}) {
  return context.testHandler({ request: { headers: { host: { value: host } }, uri, querystring } });
}

test('redirects the www host and preserves its query string', () => {
  const response = route('www.hopehub.in', '/services', { ref: { value: 'google ads' } });

  assert.equal(response.statusCode, 301);
  assert.equal(response.headers.location.value, 'https://hopehub.in/services?ref=google%20ads');
});

test('redirects duplicate public paths', () => {
  assert.equal(
    route('hopehub.in', '/psychologists').headers.location.value,
    'https://hopehub.in/care-team'
  );
  assert.equal(
    route('hopehub.in', '/resources/articles/understanding-anxiety-disorders').headers.location
      .value,
    'https://hopehub.in/articles/understanding-anxiety-disorders'
  );
});

test('serves crawler-ready HTML for assessments and known concerns', () => {
  assert.equal(route('hopehub.in', '/anxiety-test').uri, '/healing/anxiety-test/index.html');
  assert.equal(
    route('hopehub.in', '/concerns/anxiety').uri,
    '/healing/concerns/anxiety/index.html'
  );
});

test('serves a noindex shell for private routes and 404 for unknown concerns', () => {
  assert.equal(route('hopehub.in', '/profile').uri, '/healing/private-shell.html');
  assert.equal(route('hopehub.in', '/concerns/not-real').statusCode, 404);
});

test('serves patient private routes from the noindex shell', () => {
  assert.equal(route('care.hopehub.in', '/patient/dashboard').uri, '/patient/private-shell.html');
  assert.equal(
    route('care.hopehub.in', '/patient/account/profile').uri,
    '/patient/private-shell.html'
  );
  assert.equal(route('care.hopehub.in', '/auth/reset').uri, '/patient/private-shell.html');
});

test('serves only known patient treatment pages and returns real 404s for unknown slugs', () => {
  assert.equal(
    route('care.hopehub.in', '/treatments/hair-fall').uri,
    '/patient/treatments/hair-fall/index.html'
  );
  assert.equal(route('care.hopehub.in', '/treatments/not-real').statusCode, 404);
  assert.equal(route('care.hopehub.in', '/blog/not-real').statusCode, 404);
});

test('redirects legacy and trailing-slash patient URLs to their care host canonical', () => {
  assert.equal(
    route('care.hopehub.in', '/hair-fall', { ref: { value: 'legacy' } }).headers.location.value,
    'https://care.hopehub.in/treatments/hair-fall?ref=legacy'
  );
  assert.equal(
    route('care.hopehub.in', '/privacy-terms').headers.location.value,
    'https://care.hopehub.in/legal'
  );
  assert.equal(
    route('care.hopehub.in', '/faq/').headers.location.value,
    'https://care.hopehub.in/faq'
  );
});

test('routes every User Web sitemap URL to its prerendered patient HTML', () => {
  const locations = [...patientSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1])
  );

  assert.ok(locations.length > 0);
  for (const location of locations) {
    const result = route('care.hopehub.in', location.pathname);
    const expected =
      location.pathname === '/' ? '/patient/index.html' : `/patient${location.pathname}/index.html`;
    assert.equal(result.uri, expected, location.pathname);
  }
});
