import assert from 'node:assert/strict';
import test from 'node:test';
import { websiteLiveChatMessageForTelegram } from './telegram-live-chat-bridge.js';

test('website messages mirrored to Telegram clearly identify the website user', () => {
  assert.equal(
    websiteLiveChatMessageForTelegram({
      senderName: 'Asha\nInjected label',
      body: 'I would like to talk.'
    }),
    '🌐 Asha Injected label · Hope Hub website\n\nI would like to talk.'
  );
});

test('website Telegram mirror remains within the Telegram message limit', () => {
  const text = websiteLiveChatMessageForTelegram({ senderName: 'Asha', body: 'x'.repeat(5000) });
  assert.equal(text.length, 4096);
  assert.match(text, /^🌐 Asha · Hope Hub website/);
});
