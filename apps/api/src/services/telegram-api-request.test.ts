import assert from 'node:assert/strict';
import test from 'node:test';
import { callTelegramBotApi } from './telegram-api-request.js';

test('Telegram transport retries transient server errors', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return calls === 1
      ? new Response(JSON.stringify({ ok: false, description: 'temporary' }), { status: 503 })
      : new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await callTelegramBotApi('test-token', 'sendMessage', {}), { message_id: 7 });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test(
  'Telegram transport does not wait inside a webhook for a long flood limit',
  { concurrency: false },
  async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ok: false,
          description: 'Too Many Requests',
          parameters: { retry_after: 30 }
        }),
        { status: 429 }
      );
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => callTelegramBotApi('test-token', 'sendMessage', {}),
        /Retry after 30 seconds/
      );
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);
