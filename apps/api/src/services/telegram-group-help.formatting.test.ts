import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatGroupHelpMessage,
  selectGroupHelpRandomContent
} from './telegram-group-help.formatting.js';

test('renders Rose markdown as Telegram HTML', () => {
  assert.equal(
    formatGroupHelpMessage('*bold* _italic_ __under__ ~strike~ ||hidden|| `x < y`').text,
    '<b>bold</b> <i>italic</i> <u>under</u> <s>strike</s> <tg-spoiler>hidden</tg-spoiler> <code>x &lt; y</code>'
  );
  assert.equal(
    formatGroupHelpMessage('>first\n>second').text,
    '<blockquote>first\nsecond</blockquote>'
  );
});

test('extracts link buttons, same-row buttons, rules, and delivery controls', () => {
  const result = formatGroupHelpMessage(
    'Visit [Hope Hub](hopehub.in) [One](buttonurl://example.com) [Two](buttonurl://example.org:same) [Menu](buttonurl://#main) {rules} {preview} {nonotif} {protect} {mediaspoiler}'
  );
  assert.match(result.text, /<a href="https:\/\/hopehub\.in\/">Hope Hub<\/a>/);
  assert.equal(result.replyMarkup?.inline_keyboard[0].length, 2);
  assert.deepEqual(result.replyMarkup?.inline_keyboard[1], [
    { text: 'Menu', callback_data: 'hh_note:main' }
  ]);
  assert.deepEqual(result.replyMarkup?.inline_keyboard.at(-1), [
    { text: 'Rules', callback_data: 'hh_menu_rules' }
  ]);
  assert.equal(result.showLinkPreview, true);
  assert.equal(result.disableNotification, true);
  assert.equal(result.protectContent, true);
  assert.equal(result.mediaSpoiler, true);
});

test('selects one random content variant', () => {
  assert.equal(
    selectGroupHelpRandomContent('first\n%%%\nsecond', () => 0),
    'first'
  );
  assert.equal(
    selectGroupHelpRandomContent('first\n%%%\nsecond', () => 0.99),
    'second'
  );
});
