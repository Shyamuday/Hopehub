import assert from 'node:assert/strict';
import test from 'node:test';
import { websiteLiveChatMessageForTelegram } from './telegram-live-chat-bridge.js';

test('website messages mirrored to Telegram clearly identify the website user', () => {
  assert.equal(
    websiteLiveChatMessageForTelegram({
      senderName: 'Asha\nInjected label',
      body: 'I would like to talk.'
    }),
    '👤 <b>Asha Injected label</b>\n🌐 Hope Hub website\n\nI would like to talk.'
  );
});

test('website Telegram mirror remains within the Telegram message limit', () => {
  const text = websiteLiveChatMessageForTelegram({ senderName: 'Asha', body: 'x'.repeat(5000) });
  assert.equal(text.length, 4096);
  assert.match(text, /^👤 <b>Asha<\/b>\n🌐 Hope Hub website/);
});

test('website sender names are escaped before Telegram HTML rendering', () => {
  const text = websiteLiveChatMessageForTelegram({
    senderName: '<Admin & member>',
    body: 'Hello'
  });
  assert.match(text, /^👤 <b>&lt;Admin &amp; member&gt;<\/b>/);
});
