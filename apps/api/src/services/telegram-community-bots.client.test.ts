import assert from 'node:assert/strict';
import test from 'node:test';
import {
  editCommunityReplyMarkup,
  isTelegramMessageNotModifiedError
} from './telegram-community-bots.client.js';

test('recognizes Telegram unchanged-message responses', () => {
  assert.equal(
    isTelegramMessageNotModifiedError(
      new Error('Bad Request: message is not modified: specified reply markup is the same')
    ),
    true
  );
  assert.equal(
    isTelegramMessageNotModifiedError(new Error('Bad Request: message to edit not found')),
    false
  );
});

test('unchanged community markup is a successful no-op', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TELEGRAM_HOPEHUBBOT_TOKEN;
  process.env.TELEGRAM_HOPEHUBBOT_TOKEN = 'test-token';
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ ok: false, description: 'Bad Request: message is not modified' }),
      { status: 400 }
    )) as typeof fetch;

  try {
    await assert.doesNotReject(() =>
      editCommunityReplyMarkup('hopehubai', -100123, 7, { inline_keyboard: [] })
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TELEGRAM_HOPEHUBBOT_TOKEN;
    else process.env.TELEGRAM_HOPEHUBBOT_TOKEN = originalToken;
  }
});
