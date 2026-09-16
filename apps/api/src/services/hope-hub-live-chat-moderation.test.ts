import assert from 'node:assert/strict';
import test from 'node:test';
import { websiteLiveChatRuleViolation } from './hope-hub-live-chat-moderation.js';

const values = {
  telegramGroupHelpMaxMessageLength: '200',
  telegramGroupHelpReviewPhrases: 'dm me\nshare number',
  telegramGroupHelpBannedWords: 'scam',
  telegramGroupHelpLinkPolicy: 'warn'
};

test('website live chat blocks configured unsafe phrases', () => {
  assert.deepEqual(websiteLiveChatRuleViolation('This looks like a scam', values), {
    action: 'warn',
    reason: 'Blocked phrase: “scam”'
  });
});

test('website live chat does not moderate privacy-reminder phrases', () => {
  assert.equal(websiteLiveChatRuleViolation('Please dm me now', values), null);
});

test('facebook and insta are permitted after removal from the managed banned-word list', () => {
  assert.equal(websiteLiveChatRuleViolation('Find us on Facebook and Insta', values), null);
});

test('website live chat applies link and length rules', () => {
  assert.deepEqual(websiteLiveChatRuleViolation('Visit https://example.com', values), {
    action: 'warn',
    reason: 'Unapproved link'
  });
  assert.match(
    websiteLiveChatRuleViolation('x'.repeat(201), values)?.reason || '',
    /Message too long/
  );
});

test('website live chat permits clean text', () => {
  assert.equal(websiteLiveChatRuleViolation('I would like some support today.', values), null);
});
