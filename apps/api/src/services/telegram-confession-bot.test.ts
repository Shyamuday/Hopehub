import assert from 'node:assert/strict';
import test from 'node:test';
import { isConfessionReviewer } from './telegram-confession-bot.js';

test('only the configured spiritualspirirt Telegram account can review confessions', () => {
  assert.equal(isConfessionReviewer({ id: 7217536617, username: 'spiritualspirirt' }), true);
  assert.equal(isConfessionReviewer({ id: 7217536617, username: 'renamed-account' }), true);
  assert.equal(isConfessionReviewer({ id: 1, username: 'spiritualspirirt' }), false);
  assert.equal(isConfessionReviewer(undefined), false);
});
