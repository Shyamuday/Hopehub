import assert from 'node:assert/strict';
import test from 'node:test';
import { TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS } from './telegram-community-content.constants.js';

test('community engagement pool supports a month without repeating', () => {
  assert.equal(TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.length, 90);
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter((item) => item.kind === 'MESSAGE').length,
    70
  );
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter((item) => item.kind === 'POLL').length,
    20
  );
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter(
      (item) => item.kind === 'POLL' && 'pollQuiz' in item && item.pollQuiz
    ).length,
    10
  );
});
