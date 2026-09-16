import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EPHEMERAL_CONFESSION_CAMPAIGN_ID,
  shouldApplyTelegramSmartSchedule,
  telegramCampaignDeleteAfter
} from './telegram-community-campaign-policy.js';

test('the hourly confession loop remains exact while ordinary campaigns use smart scheduling', () => {
  assert.equal(shouldApplyTelegramSmartSchedule(EPHEMERAL_CONFESSION_CAMPAIGN_ID), false);
  assert.equal(shouldApplyTelegramSmartSchedule('admin_campaign'), true);
});

test('campaign cleanup expires only the posted bot message at the configured time', () => {
  const now = new Date('2026-09-16T06:00:00.000Z');
  assert.equal(telegramCampaignDeleteAfter(now, 1)?.toISOString(), '2026-09-16T06:01:00.000Z');
  assert.equal(telegramCampaignDeleteAfter(now, null), null);
  assert.equal(telegramCampaignDeleteAfter(now, 0), null);
});
