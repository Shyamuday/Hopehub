import { GROUP_HELP_CONFIG_DEFAULTS } from '../constants/group-help-config.constants.js';
import { prisma } from '../db.js';
import { getSiteConfigMap } from './site-config.service.js';
import {
  answerCommunityCallback,
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  addTelegramGroupWarning,
  checkTelegramGroupFlood,
  scheduleCommunityMessageCleanup,
  telegramGroupWarningCount
} from './telegram-community-bots.store.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';
import {
  handleTelegramCommunityEventCallback,
  recordTelegramCommunityActivity,
  recordTelegramCampaignPollUpdate,
  recordTelegramCommunityReaction,
  recordTelegramCommunityDeparture,
  welcomeTelegramCommunityMembers
} from './telegram-community-campaigns.js';
import { ingestTelegramLiveChatMessage } from './telegram-live-chat-bridge.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';

const BOT = GROUP_HELP_BOT_SLUG;
const CONFIG_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramGroupHelpTestGroupChatId',
  'telegramGroupHelpRulesMessage',
  'telegramGroupHelpSupportMessage',
  'telegramGroupHelpBannedWords',
  'telegramGroupHelpLinkPolicy',
  'telegramGroupHelpAntiFloodAction',
  'telegramGroupHelpAntiFloodLimit',
  'telegramGroupHelpWarnLimit',
  'telegramGroupHelpWarnAction',
  'telegramGroupHelpForwardPolicy',
  'telegramGroupHelpMediaPolicy',
  'telegramGroupHelpAutoDeleteSeconds',
  'telegramGroupHelpMaxMessageLength',
  'telegramGroupHelpAdminWhitelist'
] as const;

const adminStatusCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const ADMIN_STATUS_TTL_MS = 5 * 60 * 1000;

async function config() {
  const stored = await getSiteConfigMap(CONFIG_KEYS);
  return { ...GROUP_HELP_CONFIG_DEFAULTS, ...stored };
}

function floodThreshold(value: string) {
  const [limit, seconds] = value.trim().split(/\s+/).map(Number);
  return {
    limit: Number.isFinite(limit) ? Math.max(2, limit) : 6,
    seconds: Number.isFinite(seconds) ? Math.max(2, seconds) : 10
  };
}

function bannedPhrases(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function telegramAdminWhitelist(value: string) {
  return new Set(
    value
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function isModerationExempt(message: CommunityTelegramMessage, whitelistValue: string) {
  if (!message.from) return true;
  const whitelist = telegramAdminWhitelist(whitelistValue);
  const userId = String(message.from.id);
  const username = message.from.username?.trim().toLowerCase();
  if (whitelist.has(userId) || (username && whitelist.has(`@${username}`))) return true;

  const chatId = String(message.chat.id);
  const cacheKey = `${chatId}:${userId}`;
  const cached = adminStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.isAdmin;
  const membership = await callCommunityTelegramApi<{ status?: string }>(BOT, 'getChatMember', {
    chat_id: chatId,
    user_id: message.from.id
  }).catch(() => undefined);
  // A temporary Telegram lookup failure must never cause an administrator's post to be removed.
  if (!membership) return true;
  const isAdmin = ['creator', 'administrator'].includes(membership?.status || '');
  adminStatusCache.set(cacheKey, { isAdmin, expiresAt: Date.now() + ADMIN_STATUS_TTL_MS });
  return isAdmin;
}

function containsLink(text: string) {
  return /(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(?:com|in|org|net|io)\b)/i.test(
    text
  );
}

function hasMedia(message: CommunityTelegramMessage) {
  return Boolean(
    message.photo?.length ||
    message.video ||
    message.animation ||
    message.document ||
    message.audio ||
    message.voice ||
    message.sticker
  );
}

function isForward(message: CommunityTelegramMessage) {
  return Boolean(message.forward_origin || message.forward_from || message.forward_from_chat);
}

async function deleteMessage(chatId: string, messageId: number) {
  await callCommunityTelegramApi(BOT, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

async function sendTemporaryMessage(
  chatId: string,
  text: string,
  values: Record<string, string>,
  options: Parameters<typeof sendCommunityMessage>[3] = {}
) {
  const sent = await sendCommunityMessage(BOT, chatId, text, options);
  const delaySeconds = Math.max(0, Number(values.telegramGroupHelpAutoDeleteSeconds || 300));
  if (delaySeconds > 0) {
    await scheduleCommunityMessageCleanup({
      bot: BOT,
      chatId,
      messageId: sent.message_id,
      kind: 'transient',
      deleteAfter: new Date(Date.now() + delaySeconds * 1000)
    });
  }
  return sent;
}

async function applyMemberAction(chatId: string, userId: number, action: string) {
  if (action === 'ban' || action === 'kick') {
    await callCommunityTelegramApi(BOT, 'banChatMember', {
      chat_id: chatId,
      user_id: userId,
      revoke_messages: false
    });
    if (action === 'kick') {
      await callCommunityTelegramApi(BOT, 'unbanChatMember', {
        chat_id: chatId,
        user_id: userId,
        only_if_banned: true
      });
    }
  } else if (action === 'mute') {
    await callCommunityTelegramApi(BOT, 'restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + 60 * 60
    });
  }
}

async function moderate(
  message: CommunityTelegramMessage,
  reason: string,
  action: string,
  warnLimit: number,
  warnAction: string
) {
  const chatId = String(message.chat.id);
  if (action === 'off' || !message.from) return false;
  await deleteMessage(chatId, message.message_id).catch(() => null);
  if (action === 'delete') return true;
  const warnings = await addTelegramGroupWarning({
    chatId,
    telegramUserId: String(message.from.id),
    reason
  });
  const finalAction = warnings >= warnLimit ? warnAction : action;
  if (['mute', 'kick', 'ban'].includes(finalAction)) {
    await applyMemberAction(chatId, message.from.id, finalAction).catch(() => null);
  }
  await sendCommunityMessage(
    BOT,
    chatId,
    warnings >= warnLimit
      ? `Community safety action applied after ${warnings} warnings.`
      : `Please follow the community rules. Warning ${warnings}/${warnLimit}.`,
    { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
  ).catch(() => null);
  return true;
}

async function handleCommand(message: CommunityTelegramMessage, values: Record<string, string>) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  if (command === '/rules') {
    await sendCommunityMessage(BOT, chatId, values.telegramGroupHelpRulesMessage, {
      message_thread_id: message.message_thread_id
    });
    return true;
  }
  if (command === '/support') {
    await sendCommunityMessage(BOT, chatId, values.telegramGroupHelpSupportMessage, {
      message_thread_id: message.message_thread_id
    });
    return true;
  }
  if (command === '/warnings' && message.from) {
    const count = await telegramGroupWarningCount(chatId, String(message.from.id));
    await sendTemporaryMessage(
      chatId,
      `You currently have ${count} warning${count === 1 ? '' : 's'}.`,
      values,
      {
        reply_to_message_id: message.message_id,
        message_thread_id: message.message_thread_id
      }
    );
    return true;
  }
  if (command === '/help') {
    await sendTemporaryMessage(
      chatId,
      'Use /rules for community rules, /support for private support, /report while replying to a message, and /warnings to review your warnings.',
      values,
      { message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/report') {
    await sendTemporaryMessage(
      chatId,
      message.reply_to_message
        ? 'Thank you. This message has been flagged for administrator review.'
        : 'Reply to the message you want to report, then send /report.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  return false;
}

async function registerTestGroup(message: CommunityTelegramMessage) {
  if (!message.from || !['group', 'supergroup'].includes(message.chat.type || '')) return false;
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command !== '/settestgroup') return false;
  const member = await callCommunityTelegramApi<{ status?: string }>(BOT, 'getChatMember', {
    chat_id: message.chat.id,
    user_id: message.from.id
  }).catch(() => null);
  if (!member || !['creator', 'administrator'].includes(member.status || '')) {
    await sendCommunityMessage(
      BOT,
      message.chat.id,
      'Only a group administrator can register this test group.'
    );
    return true;
  }
  await prisma.siteConfig.upsert({
    where: { key: 'telegramGroupHelpTestGroupChatId' },
    create: {
      key: 'telegramGroupHelpTestGroupChatId',
      value: String(message.chat.id),
      label: 'Test Telegram group ID'
    },
    update: { value: String(message.chat.id), label: 'Test Telegram group ID' }
  });
  await sendCommunityMessage(
    BOT,
    message.chat.id,
    `✅ ${message.chat.title || 'This group'} is now the HopeHub bot test group. Admin previews and test messages will arrive here.`
  );
  return true;
}

export async function handleHopeHubAiBotUpdate(update: CommunityTelegramUpdate) {
  if (update.message_reaction) {
    await recordTelegramCommunityReaction(update);
    return;
  }
  if (update.poll || update.poll_answer) {
    await recordTelegramCampaignPollUpdate(update);
    return;
  }
  const callback = update.callback_query;
  if (callback?.message && callback.data) {
    if (await handleTelegramCommunityEventCallback(update)) {
      await answerCommunityCallback(BOT, callback.id, 'You’re on the list 💙');
      return;
    }
    await answerCommunityCallback(BOT, callback.id);
    return;
  }
  const message = update.message;
  const membership = update.chat_member;
  const chat = message?.chat || membership?.chat;
  if (!chat) return;
  if (message && message.from?.is_bot) return;
  if (message && (await registerTestGroup(message))) return;
  const chatId = String(chat.id);
  const values = await config();
  const allowedGroups = [
    values.telegramGroupHelpGroupChatId,
    values.telegramGroupHelpTestGroupChatId
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  const chatUsername = chat.username ? `@${chat.username.toLowerCase()}` : '';
  if (
    allowedGroups.length &&
    !allowedGroups.includes(chatId.toLowerCase()) &&
    (!chatUsername || !allowedGroups.includes(chatUsername))
  )
    return;
  if (await recordTelegramCommunityDeparture(update)) return;
  if (await welcomeTelegramCommunityMembers(update)) return;
  if (!message) return;
  if (message.chat.type === 'private') {
    await sendCommunityMessage(BOT, chatId, values.telegramGroupHelpSupportMessage);
    return;
  }
  if (message.text?.startsWith('/') && (await handleCommand(message, values))) return;
  if (!message.from) return;
  if (await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || '')) {
    await recordTelegramCommunityActivity(
      chatId,
      message.date ? new Date(message.date * 1000) : undefined
    );
    await ingestTelegramLiveChatMessage(message);
    return;
  }

  const warnLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
  const warnAction = values.telegramGroupHelpWarnAction || 'mute';
  const text = `${message.text || ''}\n${message.caption || ''}`.trim();
  const maxLength = Math.max(100, Number(values.telegramGroupHelpMaxMessageLength || 4000));
  if (text.length > maxLength) {
    await moderate(message, 'Message too long', 'warn', warnLimit, warnAction);
    return;
  }
  if (
    bannedPhrases(values.telegramGroupHelpBannedWords).some((item) =>
      text.toLowerCase().includes(item)
    )
  ) {
    await moderate(message, 'Blocked phrase', 'warn', warnLimit, warnAction);
    return;
  }
  if (containsLink(text) && values.telegramGroupHelpLinkPolicy !== 'allow') {
    await moderate(
      message,
      'Unapproved link',
      values.telegramGroupHelpLinkPolicy,
      warnLimit,
      warnAction
    );
    return;
  }
  if (isForward(message) && values.telegramGroupHelpForwardPolicy !== 'allow') {
    await moderate(
      message,
      'Forwarded message',
      values.telegramGroupHelpForwardPolicy,
      warnLimit,
      warnAction
    );
    return;
  }
  if (hasMedia(message) && ['delete', 'warn'].includes(values.telegramGroupHelpMediaPolicy)) {
    await moderate(
      message,
      'Media policy',
      values.telegramGroupHelpMediaPolicy,
      warnLimit,
      warnAction
    );
    return;
  }

  const threshold = floodThreshold(values.telegramGroupHelpAntiFloodLimit || '6 10');
  const flood = await checkTelegramGroupFlood({
    chatId,
    telegramUserId: String(message.from.id),
    limit: threshold.limit,
    windowSeconds: threshold.seconds
  });
  if (flood.exceeded) {
    await moderate(
      message,
      'Rapid messages',
      values.telegramGroupHelpAntiFloodAction || 'mute',
      warnLimit,
      warnAction
    );
    return;
  }
  await recordTelegramCommunityActivity(
    chatId,
    message.date ? new Date(message.date * 1000) : undefined
  );
  await ingestTelegramLiveChatMessage(message);
}
