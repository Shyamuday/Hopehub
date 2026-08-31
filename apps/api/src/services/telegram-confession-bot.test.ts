import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confessionOwnerReviewText,
  confessionPrivateReplyText,
  confessionRejectionReplyText,
  isConfessionReviewer
} from './telegram-confession-bot.js';

test('only the configured spiritualspirirt Telegram account can review confessions', () => {
  assert.equal(isConfessionReviewer({ id: 7217536617, username: 'spiritualspirirt' }), true);
  assert.equal(isConfessionReviewer({ id: 7217536617, username: 'renamed-account' }), true);
  assert.equal(isConfessionReviewer({ id: 1, username: 'spiritualspirirt' }), false);
  assert.equal(isConfessionReviewer(undefined), false);
});

test('owner review includes complete private sender reference details', () => {
  const text = confessionOwnerReviewText(
    {
      reference: 'CONF-ABC123',
      serial: 42n,
      userChatId: '99887766',
      firstName: 'Amit',
      lastName: 'Kumar',
      username: 'amit_help',
      category: 'SAFETY_REVIEW',
      text: 'Private confession text',
      createdAt: new Date('2026-08-31T10:00:00.000Z')
    },
    1000
  );

  assert.match(text, /Confession #1042/);
  assert.match(text, /CONF-ABC123/);
  assert.match(text, /Amit Kumar/);
  assert.match(text, /@amit_help/);
  assert.match(text, /99887766/);
  assert.match(text, /Possible immediate safety risk/);
});

test('private owner response does not expose the reviewer identity', () => {
  const text = confessionPrivateReplyText({ text: 'We received your message.', number: 1042 });
  assert.match(text, /Anonymous Confession #1042/);
  assert.match(text, /We received your message/);
  assert.doesNotMatch(text, /spiritualspirirt|7217536617/i);
});

test('private rejection reply explains the outcome without exposing the reviewer', () => {
  const text = confessionRejectionReplyText({
    text: 'Please remove identifying details and submit it again.',
    number: 1042
  });
  assert.match(text, /wasn't approved for public posting/i);
  assert.match(text, /remove identifying details/i);
  assert.match(text, /Anonymous Confession #1042/);
  assert.doesNotMatch(text, /spiritualspirirt|7217536617/i);
});
