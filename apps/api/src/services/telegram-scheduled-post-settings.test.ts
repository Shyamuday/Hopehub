import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignReference, resolveCampaignReference } from './telegram-post-references.js';
import { scheduledPostSettings } from './telegram-scheduled-post-settings.js';

const group = '-1001';
const campaigns = [
  'admin_hopehub_please_read_hourly_20261007',
  'seed_telegram_support_safety_awareness'
].map((id, index) => ({
  id,
  chatId: group,
  name: `Schedule ${index}`,
  isActive: index === 0,
  repeat: true,
  intervalMinutes: 60,
  nextRunAt: null,
  lastRunAt: null,
  deliveries: [],
  items: Array.from({ length: 6 }, (_, i) => ({
    id: `item_${index}_${i}`,
    campaignId: id,
    sortOrder: i,
    kind: 'MESSAGE',
    text: `Post ${index}-${i}`
  }))
}));
const db: any = {
  telegramCampaign: {
    findMany: async (arg: any) => (arg.where.chatId === group ? campaigns : []),
    findFirst: async (arg: any) =>
      campaigns.find((p) => p.id === arg.where.id && p.chatId === arg.where.chatId) || null
  },
  telegramCampaignItem: {
    findFirst: async (arg: any) => {
      const post = campaigns.find(
        (p) => p.chatId === arg.where.campaign.chatId && p.items.some((i) => i.id === arg.where.id)
      );
      return post ? { ...post.items.find((i) => i.id === arg.where.id), campaign: post } : null;
    }
  },
  telegramCampaignDelivery: { aggregate: async () => ({ _max: { sentAt: null } }) }
};
test('flat browse includes every item from enabled and paused schedules with pagination', async () => {
  const home = await scheduledPostSettings('posts', group, db);
  assert.match(home.text, /Post items: 12/);
  const first = await scheduledPostSettings('posts:items:0', group, db);
  const last = await scheduledPostSettings('posts:items:1', group, db);
  const refs = (panel: any) =>
    panel.keyboard.inline_keyboard
      .flat()
      .filter((b: any) => b.callback_data.includes(':item:'))
      .map((b: any) => b.callback_data);
  assert.equal(refs(first).length, 10);
  assert.equal(refs(last).length, 2);
  assert.equal(new Set([...refs(first), ...refs(last)]).size, 12);
});
test('all schedule and item callbacks fit Telegram byte limit; item lookup stays group scoped', async () => {
  for (const p of campaigns) {
    const panel = await scheduledPostSettings(`posts:view:${campaignReference(p.id)}`, group, db);
    for (const b of panel.keyboard.inline_keyboard!.flat())
      assert.ok(Buffer.byteLength(b.callback_data || '') <= 64);
  }
  const item = await scheduledPostSettings('posts:item:item_1_0', group, db);
  assert.match(item.text, /Paused/);
  assert.match(item.text, /Post 1-0/);
  await assert.rejects(
    scheduledPostSettings('posts:item:item_1_0', '-1002', db),
    /no longer exists/
  );
});
test('compact references fail closed if missing or ambiguous', () => {
  const id = campaigns[0].id,
    ref = campaignReference(id);
  assert.equal(resolveCampaignReference(ref, [id]), id);
  assert.throws(() => resolveCampaignReference(ref, []));
  assert.throws(() => resolveCampaignReference(ref, [id, id]));
});
