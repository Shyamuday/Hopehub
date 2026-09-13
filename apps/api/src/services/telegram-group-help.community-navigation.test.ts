import { TELEGRAM_OFF_TOPIC_GROUP_TITLE } from '../constants/telegram-community-bot.constants.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { TELEGRAM_OFF_TOPIC_GROUP_URL } from '../constants/telegram-community-bot.constants.js';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';

const shared = {
  telegramGroupHelpGroupChatId: '-100-main',
  telegramGroupHelpOffTopicGroupChatId: '-100-chat',
  telegramGroupHelpMainGroupUrl: 'https://t.me/hopehubindia',
  telegramGroupHelpOffTopicGroupUrl: TELEGRAM_OFF_TOPIC_GROUP_URL
};

test('main community navigation links to the off-topic group', () => {
  const keyboard = withCrossCommunityButton(undefined, shared, '-100-main');
  assert.deepEqual(keyboard?.inline_keyboard.at(-1)?.[0], {
    text: 'Off-topic group',
    url: TELEGRAM_OFF_TOPIC_GROUP_URL,
    style: 'success'
  });
});

test('off-topic community navigation links back to the support group', () => {
  const keyboard = withCrossCommunityButton(
    undefined,
    { ...shared, telegramGroupHelpGroupTitle: TELEGRAM_OFF_TOPIC_GROUP_TITLE },
    '-100-chat'
  );
  assert.deepEqual(keyboard?.inline_keyboard.at(-1)?.[0], {
    text: 'HopeHub support group',
    url: 'https://t.me/hopehubindia',
    style: 'success'
  });
});

test('community navigation does not duplicate an existing group link', () => {
  const keyboard = withCrossCommunityButton(
    { inline_keyboard: [[{ text: 'Chat', url: TELEGRAM_OFF_TOPIC_GROUP_URL }]] },
    shared,
    '-100-main'
  );
  assert.equal(keyboard?.inline_keyboard.length, 1);
});
