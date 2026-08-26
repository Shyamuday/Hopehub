import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredGroupHelpChatIds,
  groupHelpCommandContextFromConfig,
  groupHelpCommandFailureMessage
} from './telegram-group-help.command-context.js';

const config = {
  telegramGroupHelpGroupChatId: '-100-main',
  telegramGroupHelpOffTopicGroupChatId: '-100-off-topic',
  telegramGroupHelpStaffGroupId: '-100-staff',
  telegramGroupHelpLogChannelId: '-100-log'
};

test('main, off-topic, staff and log chats are admitted by the webhook allow-list', () => {
  assert.deepEqual(configuredGroupHelpChatIds(config), [
    '-100-main',
    '-100-off-topic',
    '-100-staff',
    '-100-log'
  ]);
});

test('private staff and log commands target the configured main group', () => {
  assert.deepEqual(groupHelpCommandContextFromConfig('-100-staff', config), {
    sourceChatId: '-100-staff',
    targetChatId: '-100-main',
    isControlGroup: true
  });
  assert.deepEqual(groupHelpCommandContextFromConfig('-100-log', config), {
    sourceChatId: '-100-log',
    targetChatId: '-100-main',
    isControlGroup: true
  });
});

test('main and off-topic group commands remain scoped to their own group', () => {
  assert.deepEqual(groupHelpCommandContextFromConfig('-100-main', config), {
    sourceChatId: '-100-main',
    targetChatId: '-100-main',
    isControlGroup: false
  });
  assert.deepEqual(groupHelpCommandContextFromConfig('-100-off-topic', config), {
    sourceChatId: '-100-off-topic',
    targetChatId: '-100-off-topic',
    isControlGroup: false
  });
});

test('control groups fail closed when the main group is not configured', () => {
  const context = groupHelpCommandContextFromConfig('-100-staff', {
    ...config,
    telegramGroupHelpGroupChatId: ''
  });
  assert.equal(context.isControlGroup, true);
  assert.equal(context.targetChatId, '');
  assert.match(context.configurationError || '', /main Hope Hub group is not configured/i);
});

test('Telegram failures produce actionable and truthful operator messages', () => {
  assert.match(
    groupHelpCommandFailureMessage(new Error('Bad Request: not enough rights')),
    /required Telegram administrator permission/i
  );
  assert.match(
    groupHelpCommandFailureMessage(new Error('Bad Request: message to delete not found')),
    /message no longer exists|message ID is incorrect/i
  );
  assert.match(
    groupHelpCommandFailureMessage(new Error('Too Many Requests: retry after 30')),
    /rate-limited/i
  );
});
