import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Bot, Context } from 'grammy';
import { GrammyError } from 'grammy';
import { config } from './config.js';

type WarningStore = Record<string, number>;

const warningPath = resolve(config.moderationDataPath);
const bannedWordsPath = resolve(config.bannedWordsDataPath);
const bannedWordsFilePath = resolve(config.bannedWordsFilePath);
let warningStore: WarningStore | null = null;
let bannedWordsStore: string[] | null = null;

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

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeText(value: string) {
  return normalizeWord(value);
}

function uniqueWords(words: string[]) {
  return [...new Set(words.map(normalizeWord).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linesToWords(value: string) {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('>'));
}

async function loadBannedWordsFile() {
  try {
    return linesToWords(await readFile(bannedWordsFilePath, 'utf8'));
  } catch {
    return [];
  }
}

async function loadBannedWordsStore() {
  if (bannedWordsStore) return bannedWordsStore;

  try {
    const savedWords = JSON.parse(await readFile(bannedWordsPath, 'utf8')) as string[];
    bannedWordsStore = uniqueWords([
      ...config.bannedWords,
      ...(await loadBannedWordsFile()),
      ...savedWords
    ]);
  } catch {
    bannedWordsStore = uniqueWords([...config.bannedWords, ...(await loadBannedWordsFile())]);
  }

  return bannedWordsStore;
}

async function saveBannedWordsStore(words: string[]) {
  bannedWordsStore = uniqueWords(words);
  await mkdir(dirname(bannedWordsPath), { recursive: true });
  await writeFile(bannedWordsPath, JSON.stringify(bannedWordsStore, null, 2));
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

async function addWarningAndMaybeBan(ctx: Context, reason: string) {
  const user = ctx.from;
  const chat = ctx.chat;
  if (!user || !chat || user.is_bot) return;
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
      `🚫 ${name} has been banned after ${warnings}/${limit} warnings. Reason: ${reason}.`
    );
    return;
  }

  await ctx.reply(`⚠️ ${name}, ${reason}. Message removed. Warning ${warnings}/${limit}.`);
}

async function warnOrBanEditedMessage(ctx: Context) {
  const editedMessage = ctx.editedMessage;
  const user = editedMessage?.from;
  const chat = editedMessage?.chat;
  if (!editedMessage || !user || !chat || user.is_bot) return;

  if (await isGroupAdmin(ctx, user.id)) return;

  await deleteEditedMessage(ctx);
  await addWarningAndMaybeBan(ctx, 'edited messages are not allowed in this group');
}

function messageText(ctx: Context) {
  const message = ctx.message;
  if (!message) return '';
  if ('text' in message && message.text) return message.text;
  if ('caption' in message && message.caption) return message.caption;
  return '';
}

function findBannedWord(text: string, words: string[]) {
  const normalizedText = normalizeText(text);

  return words.find((word) => {
    if (word.includes(' ') || word.includes('/') || word.includes('@')) {
      return normalizedText.includes(word);
    }

    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(word)}(?=$|[^\\p{L}\\p{N}_])`, 'u').test(
      normalizedText
    );
  });
}

async function warnOrBanBannedWords(ctx: Context) {
  const user = ctx.from;
  const message = ctx.message;
  const chat = ctx.chat;
  const text = messageText(ctx);

  if (!user || !message || !chat || user.is_bot || !text || text.trim().startsWith('/')) return;
  if (await isGroupAdmin(ctx, user.id)) return;

  const words = await loadBannedWordsStore();
  if (!words.length) return;

  const matchedWord = findBannedWord(text, words);
  if (!matchedWord) return;

  try {
    await ctx.api.deleteMessage(chat.id, message.message_id);
  } catch (error) {
    if (error instanceof GrammyError) {
      console.warn('Could not delete banned-word message:', error.description);
      return;
    }
    throw error;
  }

  await addWarningAndMaybeBan(ctx, 'this group does not allow blocked words');
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

function commandPayload(ctx: Context) {
  return (ctx.message?.text ?? '').split(/\s+/).slice(1).join(' ').trim();
}

async function listBannedWords(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;

  const words = await loadBannedWordsStore();
  if (!words.length) {
    await ctx.reply('No banned words are configured yet.');
    return;
  }

  let chunk = 'Blocked words:\n';
  for (const [index, word] of words.entries()) {
    const line = `${index + 1}. ${word}\n`;
    if (chunk.length + line.length > 3500) {
      await ctx.reply(chunk.trim());
      chunk = '';
    }
    chunk += line;
  }

  if (chunk.trim()) {
    await ctx.reply(chunk.trim());
  }
}

async function addBannedWord(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;

  const word = normalizeWord(commandPayload(ctx));
  if (!word) {
    await ctx.reply('Usage: /banword <word or phrase>');
    return;
  }

  const words = await loadBannedWordsStore();
  await saveBannedWordsStore([...words, word]);
  await ctx.reply(`✅ Added blocked word: ${word}`);
}

async function removeBannedWord(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;

  const word = normalizeWord(commandPayload(ctx));
  if (!word) {
    await ctx.reply('Usage: /allowword <word or phrase>');
    return;
  }

  const words = await loadBannedWordsStore();
  const nextWords = words.filter((item) => item !== word);
  await saveBannedWordsStore(nextWords);
  await ctx.reply(
    nextWords.length === words.length
      ? `No blocked word found for: ${word}`
      : `✅ Removed blocked word: ${word}`
  );
}

export function registerModeration(bot: Bot<Context>) {
  bot.command('unban', unbanUser);
  bot.command('banwords', listBannedWords);
  bot.command('banword', addBannedWord);
  bot.command('allowword', removeBannedWord);
  bot.on('edited_message', warnOrBanEditedMessage);
  bot.on('message', warnOrBanBannedWords);
}
