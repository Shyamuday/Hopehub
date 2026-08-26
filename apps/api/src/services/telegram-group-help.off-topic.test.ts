import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOPE_HUB_OFF_TOPIC_GROUP_POLICY,
  HOPE_HUB_OFF_TOPIC_GROUP_TITLE
} from './telegram-group-help.off-topic.js';

test('off-topic community has an independent, production-safe policy', () => {
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_TITLE, 'HopeHub Chit-Chat');
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpWelcomeMessage, /off-topic/i);
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpRulesMessage, /unwanted private/i);
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpJoinProtection, 'captcha');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiFloodAction, 'mute');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiPornAction, 'review');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpReportsMode, 'staff group');
});
