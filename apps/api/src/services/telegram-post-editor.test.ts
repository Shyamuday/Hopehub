import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostEditor } from './telegram-post-editor.js';

test('private draft is isolated by group/user and creates one paused media campaign only after saving', async (t) => {
  const db: any = {
    telegramCommunityState: { upsert() {}, findUnique() {}, deleteMany() {} },
    telegramCampaign: { upsert() {} }
  };
  const { postEditorAction, postEditorInput } = createPostEditor(db);
  const states = new Map<string, any>();
  const campaigns = new Map<string, any>();
  const stateKey = (arg: any) => arg.where.bot_chatId.chatId;
  t.mock.method(db.telegramCommunityState, 'upsert', async (arg: any) => {
    states.set(stateKey(arg), { ...arg.create });
    return arg.create;
  });
  t.mock.method(
    db.telegramCommunityState,
    'findUnique',
    async (arg: any) => states.get(stateKey(arg)) || null
  );
  t.mock.method(db.telegramCommunityState, 'deleteMany', async (arg: any) => ({
    count: Number(states.delete(arg.where.chatId))
  }));
  t.mock.method(db.telegramCampaign, 'upsert', async (arg: any) => {
    if (!campaigns.has(arg.where.id)) campaigns.set(arg.where.id, arg.create);
    return campaigns.get(arg.where.id);
  });
  const message = {
    message_id: 1,
    chat: { id: 1, type: 'private' },
    video: { file_id: 'video-file' },
    caption: 'Scheduled video'
  };
  await postEditorAction('posts:new', '-100', 1);
  assert.equal(await postEditorInput('-200', 1, message), null);
  assert.equal(await postEditorInput('-100', 2, message), null);
  const preview = await postEditorInput('-100', 1, message);
  assert.match(preview!.text, /Video/);
  assert.equal(campaigns.size, 0);
  await Promise.all([
    postEditorAction('posts:save', '-100', 1),
    postEditorAction('posts:save', '-100', 1)
  ]);
  assert.equal(campaigns.size, 1);
  const campaign = [...campaigns.values()][0];
  assert.equal(campaign.chatId, '-100');
  assert.equal(campaign.isActive, false);
  assert.equal(campaign.repeat, false);
  assert.equal(campaign.items.create.imageUrl, 'video:video-file');
  await assert.rejects(postEditorAction('posts:save', '-100', 1), /expired/);
});

test('item edits must belong to the selected group and expired drafts cannot save', async (t) => {
  const db: any = {
    telegramCampaignItem: { findFirst() {} },
    telegramCommunityState: { findUnique() {} }
  };
  const { postEditorAction } = createPostEditor(db);
  t.mock.method(db.telegramCampaignItem, 'findFirst', async (arg: any) => {
    assert.deepEqual(arg.where, { id: 'other-item', campaign: { chatId: '-100' } });
    return null;
  });
  await assert.rejects(
    postEditorAction('posts:edit:other-item:content', '-100', 1),
    /no longer exists/
  );
  t.mock.method(db.telegramCommunityState, 'findUnique', async () => ({
    payload: { field: 'new' },
    expiresAt: new Date(0)
  }));
  await assert.rejects(postEditorAction('posts:save', '-100', 1), /expired/);
});
