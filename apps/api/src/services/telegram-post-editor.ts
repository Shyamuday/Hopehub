import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { campaignReference, resolveCampaignReference } from './telegram-post-references.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { prisma } from '../db.js';
import type {
  CommunityTelegramMessage,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import {
  postButtons,
  postContent,
  postInteger,
  postSchedule
} from './telegram-post-editor-policy.js';

const STATE = 'group-help:post-editor';
type Draft = {
  field: string;
  campaignId?: string;
  itemId?: string;
  newId?: string;
  value?: Record<string, unknown>;
};
const fields: Record<string, string> = {
  name: 'Send the post name (up to 100 characters).',
  content:
    'Send the replacement text, photo, or video with an optional caption. This replaces the entire content.',
  schedule:
    'Send the next post time: YYYY-MM-DD HH:mm in IST. Saving a time does not enable a paused post.',
  interval: 'Send the repeat interval in minutes (1 to 525600).',
  topic: 'Send the topic ID, or 0 for the group default.',
  delete: 'Send automatic deletion minutes (1 to 2880), or 0 to keep the post.',
  buttons:
    'Send Label | https://example.com, one button per line (up to 8). Send - to remove buttons.'
};
const key = (chatId: string, userId: number) => `${chatId}:${userId}`;
const keyboard = (ready = false): TelegramKeyboard => ({
  inline_keyboard: [
    ...(ready ? [[{ text: 'Save changes', callback_data: 'hh_cfg_posts:save' }]] : []),
    [{ text: 'Cancel', callback_data: 'hh_cfg_posts:cancel' }]
  ]
});
export function createPostEditor(db = prisma) {
  async function write(chatId: string, userId: number, draft: Draft) {
    const expiresAt = new Date(Date.now() + 30 * 60000);
    await db.telegramCommunityState.upsert({
      where: { bot_chatId: { bot: STATE, chatId: key(chatId, userId) } },
      create: {
        bot: STATE,
        chatId: key(chatId, userId),
        state: 'OPEN',
        payload: draft as Prisma.InputJsonValue,
        expiresAt
      },
      update: { payload: draft as Prisma.InputJsonValue, expiresAt }
    });
  }
  async function read(chatId: string, userId: number) {
    const row = await db.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot: STATE, chatId: key(chatId, userId) } }
    });
    return row && row.expiresAt > new Date() ? (row.payload as Draft) : null;
  }
  async function clear(chatId: string, userId: number) {
    await db.telegramCommunityState.deleteMany({
      where: { bot: STATE, chatId: key(chatId, userId) }
    });
  }

  // The caller rechecks the selected group's admin rights before every call.
  async function postEditorAction(action: string, chatId: string, userId: number) {
    const [, operation, reference, field] = action.split(':');
    let id = reference;
    if (id?.startsWith('~')) {
      const ids = await db.telegramCampaign.findMany({ where: { chatId }, select: { id: true } });
      id = resolveCampaignReference(
        id,
        ids.map((row) => row.id)
      );
    }
    if (operation === 'cancel') {
      await clear(chatId, userId);
      return { text: 'Post changes cancelled.', keyboard: keyboard() };
    }
    if (operation === 'new') {
      await write(chatId, userId, { field: 'new', newId: randomUUID().replaceAll('-', '') });
      return {
        text: 'Send your new post: text, a photo, or a video with an optional caption. It will be created paused, ready to configure and schedule.',
        keyboard: keyboard()
      };
    }
    if (operation === 'edit' && id && field && fields[field]) {
      const itemField = ['content', 'topic', 'delete', 'buttons'].includes(field);
      const campaign = itemField
        ? await db.telegramCampaignItem.findFirst({
            where: { id, campaign: { chatId } },
            include: { campaign: true }
          })
        : await db.telegramCampaign.findFirst({ where: { id, chatId } });
      if (!campaign) throw new Error('Post no longer exists in this group.');
      await write(chatId, userId, { field, ...(itemField ? { itemId: id } : { campaignId: id }) });
      return { text: fields[field], keyboard: keyboard() };
    }
    if (operation !== 'save') return null;
    const draft = await read(chatId, userId);
    if (!draft?.value) throw new Error('This draft has expired. Open the editor again.');
    const value = draft.value;
    let campaignId = draft.campaignId;
    if (draft.field === 'new') {
      const content = value as ReturnType<typeof postContent>;
      if (!draft.newId) throw new Error('Open a new post draft again.');
      const campaign = await db.telegramCampaign.upsert({
        where: { id: draft.newId },
        update: {},
        create: {
          id: draft.newId,
          name: content.text.trim().slice(0, 60) || 'New media post',
          chatId,
          bot: GROUP_HELP_BOT_SLUG,
          source: 'ADMIN',
          timezone: 'Asia/Kolkata',
          intervalMinutes: 1440,
          repeat: false,
          isActive: false,
          items: { create: { sortOrder: 0, ...content } }
        }
      });
      campaignId = campaign.id;
    } else if (draft.itemId) {
      const item = await db.telegramCampaignItem.findFirst({
        where: { id: draft.itemId, campaign: { chatId } }
      });
      if (!item) throw new Error('Post no longer exists in this group.');
      await db.telegramCampaignItem.updateMany({
        where: { id: item.id, campaign: { chatId } },
        data: value
      });
      campaignId = item.campaignId;
    } else if (draft.campaignId) {
      const data =
        draft.field === 'schedule' ? { nextRunAt: new Date(String(value.nextRunAt)) } : value;
      const result = await db.telegramCampaign.updateMany({
        where: { id: draft.campaignId, chatId },
        data
      });
      if (!result.count) throw new Error('Post no longer exists in this group.');
    }
    await clear(chatId, userId);
    return {
      text: 'Saved. Changes apply to future posts; already delivered messages are unchanged.',
      keyboard: {
        inline_keyboard: [
          [
            {
              text: 'Configure post',
              callback_data: `hh_cfg_posts:view:${campaignReference(campaignId!)}`
            }
          ]
        ]
      }
    };
  }

  async function postEditorInput(
    chatId: string,
    userId: number,
    message: CommunityTelegramMessage
  ) {
    const draft = await read(chatId, userId);
    if (!draft) return null;
    if (message.text === '/cancel') {
      await clear(chatId, userId);
      return { text: 'Post changes cancelled.', keyboard: keyboard() };
    }
    const text = (message.text || '').trim();
    let value: Record<string, unknown>;
    if (draft.field === 'new' || draft.field === 'content') value = postContent(message);
    else if (draft.field === 'name') {
      if (!text || text.length > 100) throw new Error('Send a name from 1 to 100 characters.');
      value = { name: text };
    } else if (draft.field === 'schedule') value = { nextRunAt: postSchedule(text).toISOString() };
    else if (draft.field === 'interval') value = { intervalMinutes: postInteger(text, 1, 525600) };
    else if (draft.field === 'topic')
      value = { messageThreadId: postInteger(text, 0, 2147483647) || null };
    else if (draft.field === 'delete')
      value = { deleteAfterMinutes: postInteger(text, 0, 2880) || null };
    else if (draft.field === 'buttons') value = { buttons: postButtons(text) };
    else return null;
    await write(chatId, userId, { ...draft, value });
    const summary =
      draft.field === 'new' || draft.field === 'content'
        ? `${String(value.imageUrl || '').startsWith('video:') ? 'Video' : value.imageUrl ? 'Photo' : 'Text post'}\n${String(value.text || '(No caption)')}`
        : JSON.stringify(value, null, 2);
    return {
      text: `Review changes:\n${summary.slice(0, 3500)}\n\nSave or send another value.`,
      keyboard: keyboard(true)
    };
  }
  return { postEditorAction, postEditorInput };
}
export const { postEditorAction, postEditorInput } = createPostEditor();
