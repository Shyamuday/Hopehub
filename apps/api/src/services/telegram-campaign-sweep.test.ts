import assert from 'node:assert/strict';
import test from 'node:test';
import { drainDueTelegramCampaigns } from './telegram-campaign-sweep.js';

test('three simultaneously due posts are all attempted even when the middle post fails', async () => {
  const due = ['blogs', 'rules', 'image'].map((id) => ({ campaign: { id } }));
  const sent: string[] = [],
    failed: string[] = [];
  const count = await drainDueTelegramCampaigns({
    claim: async () => due.shift() || null,
    deliver: async ({ campaign }) => {
      sent.push(campaign.id);
      if (campaign.id === 'rules') throw new Error('Telegram unavailable');
    },
    onError: ({ campaign }) => {
      failed.push(campaign.id);
    },
    limit: 20
  });
  assert.equal(count, 3);
  assert.deepEqual(sent, ['blogs', 'rules', 'image']);
  assert.deepEqual(failed, ['rules']);
});

test('a full sweep leaves the remaining due work queued for the next sweep', async () => {
  const due = Array.from({ length: 25 }, (_, i) => ({ campaign: { id: String(i) } }));
  const input = {
    claim: async () => due.shift() || null,
    deliver: async () => {},
    onError: () => {},
    limit: 20
  };
  assert.equal(await drainDueTelegramCampaigns(input), 20);
  assert.equal(due.length, 5);
  assert.equal(await drainDueTelegramCampaigns(input), 5);
});
