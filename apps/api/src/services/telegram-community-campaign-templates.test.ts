import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRefreshTelegramCampaignTemplate } from './telegram-community-campaign-templates.js';

test('newer system templates refresh system-owned campaigns', () => {
  assert.equal(
    shouldRefreshTelegramCampaignTemplate({ source: 'SYSTEM', templateVersion: 1 }, 2),
    true
  );
});

test('deployment never overwrites an admin-owned campaign', () => {
  assert.equal(
    shouldRefreshTelegramCampaignTemplate({ source: 'ADMIN', templateVersion: 0 }, 2),
    false
  );
});

test('the same system template version is idempotent', () => {
  assert.equal(
    shouldRefreshTelegramCampaignTemplate({ source: 'SYSTEM', templateVersion: 2 }, 2),
    false
  );
});
