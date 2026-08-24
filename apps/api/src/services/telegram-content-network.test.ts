import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSyndicationFeed, validPublicHttpsUrl } from './telegram-content-network.js';

test('RSS parsing produces short attributed-safe candidate fields', () => {
  const items = parseSyndicationFeed(
    `<?xml version="1.0"?><rss><channel><item><title><![CDATA[<b>Sleep &amp; rest</b>]]></title><link>https://example.org/article</link><description><![CDATA[<p>Small practical advice.</p>]]></description><pubDate>Tue, 01 Jan 2026 10:00:00 GMT</pubDate></item></channel></rss>`
  );
  assert.deepEqual(items[0], {
    title: 'Sleep & rest',
    url: 'https://example.org/article',
    summary: 'Small practical advice.',
    imageUrl: undefined,
    publishedAt: new Date('2026-01-01T10:00:00.000Z')
  });
});

test('content sources reject non-public and non-HTTPS URLs', () => {
  assert.equal(validPublicHttpsUrl('http://example.org/feed'), '');
  assert.equal(validPublicHttpsUrl('https://localhost/feed'), '');
  assert.equal(validPublicHttpsUrl('https://127.0.0.1/feed'), '');
  assert.equal(validPublicHttpsUrl('https://example.org/feed'), 'https://example.org/feed');
});
