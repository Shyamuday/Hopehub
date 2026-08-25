import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderDomain } from '@prisma/client';
import {
  normalizePublicDomains,
  parsePublicContentDomain,
  publicContentDomainForPath
} from './public-content-domain.js';

test('unknown public content domain defaults to homeopathy', () => {
  assert.equal(parsePublicContentDomain(undefined), ProviderDomain.HOMEOPATHY);
  assert.equal(parsePublicContentDomain('invalid'), ProviderDomain.HOMEOPATHY);
});

test('public content uses the canonical Hope Hub provider domain', () => {
  assert.equal(parsePublicContentDomain('hope-hub'), ProviderDomain.HOPE_HUB);
  assert.equal(parsePublicContentDomain('HOPE_HUB'), ProviderDomain.HOPE_HUB);
});

test('domain lists are normalized for intentionally shared content', () => {
  assert.deepEqual(
    normalizePublicDomains([
      ProviderDomain.HOMEOPATHY,
      ProviderDomain.HOPE_HUB,
      ProviderDomain.HOMEOPATHY
    ]),
    [ProviderDomain.HOMEOPATHY, ProviderDomain.HOPE_HUB]
  );
});

test('public route prefixes select the domain without trusting a query parameter', () => {
  assert.equal(publicContentDomainForPath('/blog/example'), ProviderDomain.HOMEOPATHY);
  assert.equal(publicContentDomainForPath('/hope-hub/blog/example'), ProviderDomain.HOPE_HUB);
});
