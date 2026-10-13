import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fixedCampaignNextRun,
  cancelQueuedCampaignDeliveries,
  campaignDeliveryCancelled,
  lockCampaignGroup
} from './telegram-campaign-safety.js';
import {
  competingEditorWhere,
  privateEditorCommand,
  scheduleCommandForHopeHub,
  writeExclusiveEditorDraft
} from './telegram-private-editor-policy.js';

test('concurrent editors leave one active draft for an admin without clearing another admin', async () => {
  const rows = [{ bot: 'group-help:settings-draft', chatId: '-100:456' }];
  let tail = Promise.resolve();
  const db: any = {
    $transaction: async (fn: any) => {
      let release: any;
      const tx: any = {
        $queryRaw: async () => {
          const previous = tail;
          tail = new Promise<void>((resolve) => {
            release = resolve;
          });
          await previous;
        },
        telegramCommunityState: {
          deleteMany: async ({ where }: any) => {
            for (let i = rows.length - 1; i >= 0; i--)
              if (
                where.bot.in.includes(rows[i].bot) &&
                rows[i].chatId.endsWith(where.chatId.endsWith)
              )
                rows.splice(i, 1);
          }
        }
      };
      try {
        return await fn(tx);
      } finally {
        release?.();
      }
    }
  };
  await Promise.all(
    ['group-help:post-editor', 'group-help:filter-builder'].map((bot) =>
      writeExclusiveEditorDraft(db, bot, 123, async () => {
        rows.push({ bot, chatId: '-100:123' });
      })
    )
  );
  assert.equal(rows.filter((r) => r.chatId.endsWith(':123')).length, 1);
  assert.equal(rows.filter((r) => r.chatId.endsWith(':456')).length, 1);
});

test('a delayed repeating post keeps its original phase and skips missed slots', () => {
  const due = new Date('2026-10-13T15:18:00+05:30');
  assert.equal(
    fixedCampaignNextRun(due, new Date('2026-10-13T15:25:00+05:30'), 120).toISOString(),
    new Date('2026-10-13T17:18:00+05:30').toISOString()
  );
  assert.equal(
    fixedCampaignNextRun(due, new Date('2026-10-13T19:20:00+05:30'), 120).toISOString(),
    new Date('2026-10-13T21:18:00+05:30').toISOString()
  );
});
test('pause creates a persistent cutoff and cancels queued work, including late failure after resume', async () => {
  let control: any, where: any;
  const tx: any = {
    telegramCommunityState: {
      upsert: async (a: any) => {
        control = a.create;
      },
      findUnique: async () => control
    },
    telegramCampaignDelivery: {
      updateMany: async (a: any) => {
        where = a.where;
      }
    }
  };
  const old = new Date(Date.now() - 1000);
  await cancelQueuedCampaignDeliveries(tx, 'campaign');
  assert.deepEqual(where.status.in, ['FAILED', 'CLAIMED']);
  assert.equal(await campaignDeliveryCancelled(tx, 'campaign', old), true);
  assert.equal(await campaignDeliveryCancelled(tx, 'campaign', new Date(Date.now() + 1000)), false);
});
test('group locks share a namespace and bind chat IDs as parameters', async () => {
  const keys: string[] = [];
  const tx: any = {
    $queryRaw: async (_strings: any, key: string) => {
      keys.push(key);
    }
  };
  await lockCampaignGroup(tx, '-1001');
  await lockCampaignGroup(tx, '-1001');
  await lockCampaignGroup(tx, '-1002');
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[1], keys[2]);
  assert.match(keys[0], /^telegram-campaign:/);
});
test('private editor commands bypass content capture and another bot retains its schedule command', () => {
  assert.equal(privateEditorCommand('/help'), true);
  assert.equal(privateEditorCommand('Hello /help'), false);
  assert.equal(scheduleCommandForHopeHub('/schedule@OtherBot'), false);
  assert.equal(scheduleCommandForHopeHub('/schedule@Hopehubbot'), true);
  assert.equal(scheduleCommandForHopeHub('/schedu'), true);
  const where = competingEditorWhere('group-help:post-editor', 123);
  assert.ok(!where.bot.in.includes('group-help:post-editor'));
  assert.ok(where.bot.in.includes('group-help:filter-builder'));
  assert.equal(where.chatId.endsWith, ':123');
});
