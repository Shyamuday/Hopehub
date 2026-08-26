import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOPE_HUB_OFF_TOPIC_GROUP_POLICY,
  HOPE_HUB_OFF_TOPIC_GROUP_TITLE,
  offTopicPolicyWithPrivateModeration
} from './telegram-group-help.off-topic.js';

test('off-topic community has an independent, production-safe policy', () => {
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_TITLE, 'HopeHub Chit-Chat');
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpWelcomeMessage, /off-topic/i);
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpRulesMessage, /unwanted private/i);
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpJoinProtection, 'captcha');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiFloodAction, 'mute');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiPornAction, 'review');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpReportsMode, 'staff group');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpLogChannelId, '');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpStaffGroupId, '');
});

test('Chit-Chat moderation uses only its dedicated private group', () => {
  const policy = offTopicPolicyWithPrivateModeration(
    {
      telegramGroupHelpLogChannelId: '-100-main-log',
      telegramGroupHelpStaffGroupId: '-100-main-staff'
    },
    '-100-private-chat-log'
  );
  assert.equal(policy.telegramGroupHelpLogChannelId, '-100-private-chat-log');
  assert.equal(policy.telegramGroupHelpStaffGroupId, '-100-private-chat-log');
});
