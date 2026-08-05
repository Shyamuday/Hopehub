import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Bot, Context } from 'grammy';
import { GrammyError } from 'grammy';
import { config } from './config.js';

type WarningStore = Record<string, number>;

const warningPath = resolve(config.moderationDataPath);
let warningStore: WarningStore | null = null;

function warningKey(chatId: number | string, userId: number) {
  return `${chatId}:${userId}`;
}

function userLabel(user: NonNullable<Context['from']>) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || (user.username ? `@${user.username}` : `user ${user.id}`);
}

async function loadWarningStore() {
  if (warningStore) return warningStore;

  try {
    warningStore = JSON.parse(await readFile(warningPath, 'utf8')) as WarningStore;
  } catch {
    warningStore = {};
  }

  return warningStore;
}

async function saveWarningStore(store: WarningStore) {
  await mkdir(dirname(warningPath), { recursive: true });
  await writeFile(warningPath, JSON.stringify(store, null, 2));
}

async function isGroupAdmin(ctx: Context, userId: number) {
  if (!ctx.chat) return false;

  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch {
    return false;
  }
}

async function requireAdmin(ctx: Context) {
  if (!ctx.from) return false;
  const allowed = await isGroupAdmin(ctx, ctx.from.id);
  if (!allowed) {
    await ctx.reply('Only group admins can use this command.');
  }
  return allowed;
}

async function deleteEditedMessage(ctx: Context) {
  const editedMessage = ctx.editedMessage;
  if (!editedMessage) return;

  try {
    await ctx.api.deleteMessage(editedMessage.chat.id, editedMessage.message_id);
  } catch (error) {
    if (error instanceof GrammyError) {
      console.warn('Could not delete edited message:', error.description);
      return;
    }
    throw error;
  }
}

async function warnOrBanEditedMessage(ctx: Context) {
  const editedMessage = ctx.editedMessage;
  const user = editedMessage?.from;
  const chat = editedMessage?.chat;
  if (!editedMessage || !user || !chat || user.is_bot) return;

  if (await isGroupAdmin(ctx, user.id)) return;

  await deleteEditedMessage(ctx);

  const store = await loadWarningStore();
  const key = warningKey(chat.id, user.id);
  const warnings = (store[key] ?? 0) + 1;
  store[key] = warnings;
  await saveWarningStore(store);

  const limit = Math.max(1, config.editWarningsBeforeBan);
  const name = userLabel(user);

  if (warnings >= limit) {
    await ctx.api.banChatMember(chat.id, user.id);
    await ctx.reply(
      `🚫 ${name} has been banned after ${warnings}/${limit} warnings for editing messages after posting.`
    );
    return;
  }

  await ctx.reply(
    `⚠️ ${name}, edited messages are not allowed in this group. Your edited message was removed. Warning ${warnings}/${limit}.`
  );
}

async function unbanUser(ctx: Context) {
  if (!ctx.chat || !(await requireAdmin(ctx))) return;

  const text = ctx.message?.text ?? '';
  const userIdText = text.split(/\s+/)[1];
  const userId = Number(userIdText);

  if (!Number.isInteger(userId) || userId <= 0) {
    await ctx.reply('Usage: /unban <telegram_user_id>');
    return;
  }

  await ctx.api.unbanChatMember(ctx.chat.id, userId, {
    only_if_banned: true
  });

  const store = await loadWarningStore();
  delete store[warningKey(ctx.chat.id, userId)];
  await saveWarningStore(store);

  await ctx.reply(`✅ User ${userId} has been unbanned and their edit warnings were cleared.`);
}

export function registerModeration(bot: Bot<Context>) {
  bot.on('edited_message', warnOrBanEditedMessage);
  bot.command('unban', unbanUser);
}
