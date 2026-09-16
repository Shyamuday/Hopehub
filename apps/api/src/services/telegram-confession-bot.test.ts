import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confessionApprovalAction,
  confessionOwnerReviewText,
  confessionPrivateReplyText,
  confessionPublicReplyUrl,
  confessionRejectionReplyText,
  isConfessionReviewer,
  normalizeConfessionText,
  parseConfessionPublicReplyStart,
  publishedConfessionMedia,
  publishedConfessionText
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

test('nested preview wrappers are removed before a confession is published', () => {
  const wrapped = `📝 Preview your confession
━━━━━━━━━━━━━━
📝 Preview your confession
━━━━━━━━━━━━━━
This is the real confession.
━━━━━━━━━━━━━━
🔒 This will be submitted anonymously.
━━━━━━━━━━━━━━
🔒 This will be submitted anonymously.`;

  assert.equal(normalizeConfessionText(wrapped), 'This is the real confession.');
  const published = publishedConfessionText({
    text: wrapped,
    destinationName: 'Hope Hub Community',
    number: 1043
  });
  assert.equal(published.match(/This is the real confession\./g)?.length, 1);
  assert.doesNotMatch(published, /Preview your confession|This will be submitted anonymously/i);
});

test('confession approval callbacks distinguish publish from publish and pin', () => {
  assert.deepEqual(confessionApprovalAction('approve_CONF-ONE'), {
    approved: true,
    pin: false,
    reference: 'CONF-ONE'
  });
  assert.deepEqual(confessionApprovalAction('approve_pin_CONF-TWO'), {
    approved: true,
    pin: true,
    reference: 'CONF-TWO'
  });
  assert.deepEqual(confessionApprovalAction('reject_CONF-THREE'), {
    approved: false,
    pin: false,
    reference: 'CONF-THREE'
  });
  assert.equal(confessionApprovalAction('reject_reply_CONF-FOUR'), null);
});

test('public confession reply links preserve the confession and target group', () => {
  const url = confessionPublicReplyUrl('CONF-ABC123', '-1004348855227');
  assert.equal(url, 'https://t.me/Hopehubconfessionbot?start=reply_CONF-ABC123_-1004348855227');
  assert.deepEqual(parseConfessionPublicReplyStart('/start reply_CONF-ABC123_-1004348855227'), {
    reference: 'CONF-ABC123',
    chatId: '-1004348855227'
  });
  assert.deepEqual(
    parseConfessionPublicReplyStart('/start@Hopehubconfessionbot reply_conf-abc123_-1004348855227'),
    { reference: 'CONF-ABC123', chatId: '-1004348855227' }
  );
  assert.equal(parseConfessionPublicReplyStart('/start reply_invalid'), null);
});

test('approved group confessions use the image caption and preserve long text below it', () => {
  const short = publishedConfessionMedia({
    text: 'I am learning to ask for help.',
    destinationName: 'Hope Hub Community',
    number: 1044
  });
  assert.match(short.caption, /I am learning to ask for help/);
  assert.equal(short.followUpText, null);

  const longText = 'A'.repeat(1500);
  const long = publishedConfessionMedia({
    text: longText,
    destinationName: 'Hope Hub Community',
    number: 1045
  });
  assert.ok(long.caption.length <= 1024);
  assert.match(long.caption, /complete anonymous confession directly below/i);
  assert.match(long.followUpText || '', new RegExp(longText));
});
