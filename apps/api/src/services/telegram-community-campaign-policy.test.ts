import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EPHEMERAL_CONFESSION_CAMPAIGN_ID,
  shouldApplyTelegramSmartSchedule,
  telegramCampaignDeleteAfter
} from './telegram-community-campaign-policy.js';

test('the hourly confession loop remains exact while explicit schedules bypass editorial throttling', () => {
  assert.equal(shouldApplyTelegramSmartSchedule(EPHEMERAL_CONFESSION_CAMPAIGN_ID), false);
  assert.equal(shouldApplyTelegramSmartSchedule('admin_campaign'), false);
});

test('campaign cleanup expires only the posted bot message at the configured time', () => {
  const now = new Date('2026-09-16T06:00:00.000Z');
  assert.equal(telegramCampaignDeleteAfter(now, 1)?.toISOString(), '2026-09-16T06:01:00.000Z');
  assert.equal(telegramCampaignDeleteAfter(now, null), null);
  assert.equal(telegramCampaignDeleteAfter(now, 0), null);
});

test('all three hourly admin posts bypass activity, gap and daily quota rules', () => {
  for (const id of [
    'admin_hope_blogs_hourly_20261007',
    'admin_hopehub_please_read_hourly_20261007',
    'admin_hopehub_our_story_hourly_20261007'
  ]) {
    assert.equal(shouldApplyTelegramSmartSchedule(id), false);
  }
  assert.equal(shouldApplyTelegramSmartSchedule('seed_telegram_hourly_engagement'), true);
});
