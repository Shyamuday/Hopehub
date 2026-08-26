import assert from 'node:assert/strict';
import test from 'node:test';
import { withPublicCommunityLinks } from './telegram-public-community-links.js';

const links = {
  telegramGroupHelpMainGroupUrl: 'https://t.me/hopehubindia',
  telegramGroupHelpOffTopicGroupUrl: 'https://t.me/hopehubtalks'
};

test('public bot menus include both Hope Hub communities', () => {
  const keyboard = withPublicCommunityLinks(
    { inline_keyboard: [[{ text: 'Continue', callback_data: 'continue' }]] },
    links
  );
  assert.deepEqual(keyboard?.inline_keyboard.at(-1), [
    { text: 'HopeHub group', url: 'https://t.me/hopehubindia', style: 'success' },
    { text: 'Off-topic group', url: 'https://t.me/hopehubtalks', style: 'success' }
  ]);
});

test('public bot menus keep an existing community link only once', () => {
  const keyboard = withPublicCommunityLinks(
    { inline_keyboard: [[{ text: 'Community', url: 'https://t.me/hopehubindia' }]] },
    links
  );
  assert.equal(
    keyboard?.inline_keyboard
      .flat()
      .filter((button) => button.url === links.telegramGroupHelpMainGroupUrl).length,
    1
  );
  assert.equal(
    keyboard?.inline_keyboard
      .flat()
      .filter((button) => button.url === links.telegramGroupHelpOffTopicGroupUrl).length,
    1
  );
});
