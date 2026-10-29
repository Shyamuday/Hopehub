import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpModerationReviewButtons,
  sendGroupHelpModerationNotice
} from './telegram-group-help.actions.js';
import { prisma } from '../db.js';

test('moderation notices contain the exact feedback notice and queue deletion 24 hours later', async (t) => {
  const previousToken = process.env.TELEGRAM_HOPEHUBBOT_TOKEN;
  process.env.TELEGRAM_HOPEHUBBOT_TOKEN = 'test-token';
  t.after(() => {
    if (previousToken === undefined) delete process.env.TELEGRAM_HOPEHUBBOT_TOKEN;
    else process.env.TELEGRAM_HOPEHUBBOT_TOKEN = previousToken;
  });
  const sent: Array<{ text: string; message_thread_id?: number }> = [];
  const scheduled: Array<{
    create: { messageId: number; chatId: string; deleteAfter: Date };
  }> = [];
  t.mock.method(globalThis, 'fetch', (async (_url, options) => {
    sent.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ ok: true, result: { message_id: sent.length } }));
  }) as typeof fetch);
  const cleanup = prisma.telegramCommunityMessageCleanup;
  const originalUpsert = cleanup.upsert;
  cleanup.upsert = (async (input: unknown) => {
    scheduled.push(input as (typeof scheduled)[number]);
    return {} as never;
  }) as typeof cleanup.upsert;
  t.after(() => {
    cleanup.upsert = originalUpsert;
  });
  const footer = [
    '❌ DO NOT REPLY, COMMENT, OR REACT to this message or any admin action.',
    'All feedback or complaints must be sent ONLY via the official Contact Bot, never in GC or VC.',
    'Violations may result in immediate further action against you.',
    '📩 CONTACT ADMIN: @Contacthopehubb'
  ].join('\n');
  const before = Date.now();
  for (const action of ['ban', 'mute', 'warn']) {
    await sendGroupHelpModerationNotice(
      '-100123',
      `Action: ${action}`,
      action,
      {
        telegramGroupHelpAutoDeleteSeconds: '3',
        telegramGroupHelpCleanMessageTypes: 'all'
      },
      { message_thread_id: 7 }
    );
    assert.equal(sent.at(-1)?.text, `Action: ${action}\n\n${footer}`);
    assert.equal(sent.at(-1)?.message_thread_id, 7);
    assert.equal(scheduled.at(-1)?.create.chatId, '-100123');
    assert.equal(scheduled.at(-1)?.create.messageId, sent.length);
    const due = scheduled.at(-1)!.create.deleteAfter.getTime();
    assert.ok(due >= before + 86_400_000 && due <= Date.now() + 86_400_000);
  }
  const priorSent = sent.length,
    priorScheduled = scheduled.length;
  assert.equal(
    await sendGroupHelpModerationNotice('-100123', 'Banned', 'ban', {
      telegramGroupHelpModNoticeEnabled: 'Disabled'
    }),
    null
  );
  assert.equal(
    await sendGroupHelpModerationNotice('-100123', 'Warned', 'warn', {
      telegramGroupHelpModNoticeActions: 'ban'
    }),
    null
  );
  assert.equal(sent.length, priorSent);
  assert.equal(scheduled.length, priorScheduled);
  await sendGroupHelpModerationNotice('-100123', 'Muted', 'mute', {
    telegramGroupHelpModNoticeSeconds: '3600',
    telegramGroupHelpModFooter: 'Contact @DifferentBot'
  });
  assert.equal(sent.at(-1)?.text, 'Muted\n\nContact @DifferentBot');
  assert.ok(scheduled.at(-1)!.create.deleteAfter.getTime() <= Date.now() + 3_600_000);
  const queued = scheduled.length;
  await sendGroupHelpModerationNotice('-100123', 'Banned', 'ban', {
    telegramGroupHelpModNoticeSeconds: '0',
    telegramGroupHelpModFooterEnabled: 'Disabled'
  });
  assert.equal(sent.at(-1)?.text, 'Banned');
  assert.equal(scheduled.length, queued);
  await sendGroupHelpModerationNotice('-100123', 'Unmuted', 'unmute', {});
  assert.equal(sent.at(-1)?.text, 'Unmuted');
  assert.ok(scheduled.at(-1)!.create.deleteAfter.getTime() < Date.now() + 61_000);
});

test('automatic moderation review offers human actions without applying one', () => {
  const buttons = groupHelpModerationReviewButtons('case-1');
  assert.deepEqual(
    buttons.map((button) => button.text),
    [
      'Warn',
      'Mute 1 hour',
      'Mute 24 hours',
      'Delete message',
      'Delete + mute',
      'Reply with notice',
      'Dismiss'
    ]
  );
  assert.deepEqual(
    buttons.map((button) => button.callback_data.split(':').at(-1)),
    ['warn', 'mute', 'mute24h', 'delete', 'deletemute', 'reply', 'dismiss']
  );
});

test('cross-group review omits message actions when no source message is known', () => {
  const buttons = groupHelpModerationReviewButtons('case-2', false);
  assert.deepEqual(
    buttons.map((button) => button.text),
    ['Warn', 'Mute 1 hour', 'Mute 24 hours', 'Dismiss']
  );
});

test('deleted abusive messages offer warning removal and human mute decisions', () => {
  const buttons = groupHelpModerationReviewButtons('case-3', false, true);
  assert.deepEqual(
    buttons.map((button) => button.text),
    ['Remove warning', 'Mute 1 hour', 'Mute 24 hours', 'Dismiss']
  );
});
