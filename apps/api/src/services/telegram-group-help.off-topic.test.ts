import assert from 'node:assert/strict';
import test from 'node:test';
import { GROUP_HELP_CONFIG_DEFAULTS } from '../constants/group-help-config.constants.js';
import {
  HOPE_HUB_OFF_TOPIC_BANNED_PHRASES,
  HOPE_HUB_OFF_TOPIC_GROUP_POLICY,
  HOPE_HUB_OFF_TOPIC_GROUP_TITLE,
  HOPE_HUB_OFF_TOPIC_REVIEW_PHRASES,
  HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS,
  offTopicPolicyWithPrivateModeration
} from './telegram-group-help.off-topic.js';

test('off-topic community has an independent, production-safe policy', () => {
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_TITLE, 'chatfrendshiplovevc');
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpWelcomeMessage, /off-topic/i);
  assert.equal(
    HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpWelcomeButtons,
    HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS
  );
  assert.match(HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS, /Talk privately/);
  assert.match(HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS, /Share anonymously/);
  assert.doesNotMatch(HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS, /admin/i);
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpRulesMessage, /unwanted private/i);
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpJoinProtection, 'off');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpCaptchaMode, 'off');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpFirstMessageReview, 'off');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiFloodAction, 'mute');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAntiPornAction, 'off');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpMediaPolicy, 'allow');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpLinkPolicy, 'allow');
  assert.equal(
    HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpBannedWords,
    HOPE_HUB_OFF_TOPIC_BANNED_PHRASES
  );
  assert.equal(
    HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpReviewPhrases,
    HOPE_HUB_OFF_TOPIC_REVIEW_PHRASES
  );
  assert.match(HOPE_HUB_OFF_TOPIC_BANNED_PHRASES, /send nudes/);
  assert.doesNotMatch(
    HOPE_HUB_OFF_TOPIC_BANNED_PHRASES,
    /^(?:harami|chutiya|gandu|randi|lund|loda|pagal|pagla|my number|call me now)$/m
  );
  assert.doesNotMatch(
    HOPE_HUB_OFF_TOPIC_REVIEW_PHRASES,
    /(^|[^a-z])(?:dm|d\s+m|pm|pv|msg|message|text|ping|private)(?:[^a-z]|$)/i
  );
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpForwardPolicy, 'allow');
  assert.equal(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpQuotePolicy, 'allow');
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpAllowedMedia, /sticker/i);
  assert.match(HOPE_HUB_OFF_TOPIC_GROUP_POLICY.telegramGroupHelpRulesMessage, /GIFs, stickers/i);
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

test('direct-message words and aliases are not automatic moderation triggers', () => {
  const directMessageAlias =
    /(^|[^a-z])(?:dm|d\s+m|pm|pv|msg|message|text|ping|private)(?:[^a-z]|$)/i;
  assert.doesNotMatch(GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpBannedWords, directMessageAlias);
  assert.doesNotMatch(
    GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpReviewPhrases,
    directMessageAlias
  );
  assert.doesNotMatch(HOPE_HUB_OFF_TOPIC_BANNED_PHRASES, directMessageAlias);
  assert.doesNotMatch(HOPE_HUB_OFF_TOPIC_REVIEW_PHRASES, directMessageAlias);
});
