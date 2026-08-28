import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHelpMainMenuKeyboard } from './telegram-group-help.menu.js';

test('member menu contains useful actions without exposing admin controls', () => {
  const keyboard = groupHelpMainMenuKeyboard('-100-chat', {
    telegramGroupHelpGroupChatId: '-100-main',
    telegramGroupHelpOffTopicGroupChatId: '-100-chat',
    telegramGroupHelpMainGroupUrl: 'https://t.me/hopehubindia',
    telegramGroupHelpGroupTitle: 'HopeHub Chit-Chat'
  });
  const buttons = keyboard.inline_keyboard.flat();
  assert.equal(
    buttons.some((button) => /admin/i.test(button.text)),
    false
  );
  assert.equal(
    buttons.some((button) => button.text === 'Rules'),
    true
  );
  assert.equal(
    buttons.some((button) => button.text === 'Private support'),
    true
  );
  assert.equal(
    buttons.some((button) => button.text === 'HopeHub website'),
    true
  );
  assert.equal(
    buttons.some((button) => button.text === 'HopeHub support group'),
    true
  );
});
