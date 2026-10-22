import assert from 'node:assert/strict';
import test from 'node:test';
import { publicTelegramVoiceEventDescription } from './telegram-community-campaigns.js';

test('public voice event descriptions hide host usernames', () => {
  assert.equal(
    publicTelegramVoiceEventDescription(
      'Daily Voice Circle · Host: @example_admin · 09:00 PM–10:00 PM IST. Join quietly.'
    ),
    'Daily Voice Circle · 09:00 PM–10:00 PM IST. Join quietly.'
  );
});

test('public voice event descriptions keep copy without a host label', () => {
  const description = 'Daily Voice Circle · 10:00 AM–11:00 AM IST. Everyone is welcome.';
  assert.equal(publicTelegramVoiceEventDescription(description), description);
});
