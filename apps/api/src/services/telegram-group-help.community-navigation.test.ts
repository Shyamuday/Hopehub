import assert from 'node:assert/strict';
import test from 'node:test';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';

const shared = {
  telegramGroupHelpGroupChatId: '-100-main',
  telegramGroupHelpOffTopicGroupChatId: '-100-chat',
  telegramGroupHelpMainGroupUrl: 'https://t.me/hopehubindia',
  telegramGroupHelpOffTopicGroupUrl: 'https://t.me/hopehubtalks'
};

test('main community navigation links to the off-topic group', () => {
  const keyboard = withCrossCommunityButton(undefined, shared, '-100-main');
  assert.deepEqual(keyboard?.inline_keyboard.at(-1)?.[0], {
    text: 'Off-topic group',
    url: 'https://t.me/hopehubtalks',
    style: 'success'
  });
});

test('off-topic community navigation links back to the support group', () => {
  const keyboard = withCrossCommunityButton(
    undefined,
    { ...shared, telegramGroupHelpGroupTitle: 'HopeHub Chit-Chat' },
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
    { inline_keyboard: [[{ text: 'Chat', url: 'https://t.me/hopehubtalks' }]] },
    shared,
    '-100-main'
  );
  assert.equal(keyboard?.inline_keyboard.length, 1);
});
