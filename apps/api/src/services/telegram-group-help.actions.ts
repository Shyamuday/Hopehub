import { randomUUID } from 'node:crypto';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { prisma } from '../db.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  getTelegramCommunityGroupPolicy,
  saveTelegramCommunityGroupPolicy
} from './telegram-community-group-policy.js';
import { bannedPhrases, groupHelpConfig } from './telegram-group-help.config.js';
import {
  removeLatestTelegramGroupWarning,
  scheduleCommunityMessageCleanup
} from './telegram-community-bots.store.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';

const MODERATION_ACTION_STATE = 'group-moderation-action';

function blockedPhraseFromReason(reason: string) {
  return /^blocked phrase:\s*[“"](.+?)[”"]\s*$/i.exec(reason.trim())?.[1]?.trim() || null;
}

async function updateBlockedPhraseForGroup(input: {
  chatId: string;
  phrase: string;
  shouldBlock: boolean;
}) {
  const [values, policy] = await Promise.all([
    groupHelpConfig(input.chatId),
    getTelegramCommunityGroupPolicy(input.chatId)
  ]);
  const normalizedPhrase = input.phrase.normalize('NFKC').toLocaleLowerCase().trim();
  const current = bannedPhrases(values.telegramGroupHelpBannedWords || '');
  const withoutPhrase = current.filter(
    (candidate) => candidate.normalize('NFKC').toLocaleLowerCase().trim() !== normalizedPhrase
  );
  const next = input.shouldBlock ? [...withoutPhrase, input.phrase.trim()] : withoutPhrase;
  await saveTelegramCommunityGroupPolicy(input.chatId, {
    ...policy,
    telegramGroupHelpBannedWords: next.join('\n')
  });
}

export async function sendModerationLog(
  values: Record<string, string>,
  message: CommunityTelegramMessage,
  reason: string,
  action: string
) {
  const destination =
    values.telegramGroupHelpStaffGroupId?.trim() || values.telegramGroupHelpLogChannelId?.trim();
  if (!destination) return;
  const rawText = `${message.text || message.caption || ''}`.trim();
  const normalizedText = rawText.replace(/\s+/g, ' ');
  const preview = normalizedText
    ? normalizedText.length > 700
      ? `${normalizedText.slice(0, 700)}…`
      : normalizedText
    : '[No text — media or service message]';
  const member = message.from
    ? `${message.from.first_name || 'Telegram member'}${message.from.username ? ` (@${message.from.username})` : ''} (${message.from.id})`
    : message.sender_chat
      ? `${message.sender_chat.title || 'Channel sender'} (${message.sender_chat.id})`
      : 'Unknown sender';
  const media = [
    message.photo?.length ? 'photo' : '',
    message.video ? 'video' : '',
    message.video_note ? 'video note' : '',
    message.animation ? 'GIF' : '',
    message.document ? 'document' : '',
    message.audio ? 'audio' : '',
    message.voice ? 'voice' : '',
    message.sticker ? 'sticker' : ''
  ]
    .filter(Boolean)
    .join(', ');
  const actionId = randomUUID();
  const normalizedAction = action.toLowerCase();
  const buttons = [] as Array<{ text: string; callback_data: string }>;
  const phraseButtons = [] as Array<{ text: string; callback_data: string }>;
  const blockedPhrase = blockedPhraseFromReason(reason);
  if (message.from && ['mute', 'warn'].includes(normalizedAction)) {
    buttons.push({
      text: normalizedAction === 'mute' ? 'Unmute member' : 'Remove warning',
      callback_data: `hh_mod:${actionId}:${normalizedAction === 'mute' ? 'unmute' : 'unwarn'}`
    });
  }
  if (message.from && ['ban', 'kick'].includes(normalizedAction)) {
    buttons.push({ text: 'Unban member', callback_data: `hh_mod:${actionId}:unban` });
  }
  if (rawText) {
    buttons.push({ text: 'Repost text', callback_data: `hh_mod:${actionId}:repost` });
  }
  if (blockedPhrase) {
    phraseButtons.push(
      {
        text: 'Allow phrase in future',
        callback_data: `hh_mod:${actionId}:allowphrase`
      },
      {
        text: 'Block phrase in future',
        callback_data: `hh_mod:${actionId}:blockphrase`
      }
    );
  }
  if (buttons.length || phraseButtons.length) {
    await prisma.telegramCommunityState.create({
      data: {
        bot: MODERATION_ACTION_STATE,
        chatId: actionId,
        state: 'OPEN',
        payload: {
          targetChatId: String(message.chat.id),
          targetUserId: message.from ? String(message.from.id) : null,
          targetUserName: message.from?.first_name?.trim() || null,
          targetUsername: message.from?.username?.trim() || null,
          text: rawText || null,
          messageThreadId: message.message_thread_id || null,
          action: normalizedAction,
          blockedPhrase
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000)
      }
    });
  }
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    destination,
    [
      '🛡 Moderation action',
      `Action: ${action.toUpperCase()}`,
      `Rule / reason: ${reason}`,
      `Group: ${message.chat.title || message.chat.id} (${message.chat.id})`,
      `Message: ${message.message_id}${message.message_thread_id ? ` · topic ${message.message_thread_id}` : ''}`,
      `Member: ${member}`,
      `Content: ${media || 'text'} · ${rawText.length} character${rawText.length === 1 ? '' : 's'}`,
      `Text: ${preview}`
    ].join('\n'),
    buttons.length || phraseButtons.length
      ? { reply_markup: { inline_keyboard: [buttons, phraseButtons].filter((row) => row.length) } }
      : undefined
  ).catch(() => null);
}

/** Handles staff-group undo/repost controls for a recorded moderation action. */
export async function handleGroupHelpModerationActionCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  const data = callback?.data;
  if (!callback || !data?.startsWith('hh_mod:')) return false;
  const [, actionId, requestedAction] = data.split(':');
  if (!actionId || !requestedAction) return false;
  const state = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: MODERATION_ACTION_STATE, chatId: actionId } }
  });
  if (!state || state.expiresAt <= new Date() || state.state !== 'OPEN') return 'expired';
  const payload = (state.payload || {}) as {
    targetChatId?: string;
    targetUserId?: string | null;
    targetUserName?: string | null;
    targetUsername?: string | null;
    text?: string | null;
    messageThreadId?: number | null;
    blockedPhrase?: string | null;
  };
  if (!payload.targetChatId) return 'expired';
  const membership = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    { chat_id: payload.targetChatId, user_id: callback.from.id }
  ).catch(() => null);
  if (!membership || !['creator', 'administrator'].includes(membership.status || ''))
    return 'denied';

  if (requestedAction === 'unmute' && payload.targetUserId) {
    const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: payload.targetChatId }
    );
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
      chat_id: payload.targetChatId,
      user_id: Number(payload.targetUserId),
      permissions: chat.permissions || { can_send_messages: true }
    });
  } else if (requestedAction === 'unban' && payload.targetUserId) {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
      chat_id: payload.targetChatId,
      user_id: Number(payload.targetUserId),
      only_if_banned: true
    });
  } else if (requestedAction === 'unwarn' && payload.targetUserId) {
    await removeLatestTelegramGroupWarning(payload.targetChatId, payload.targetUserId);
  } else if (requestedAction === 'repost' && payload.text) {
    const originalSender = [
      payload.targetUserName || 'Telegram member',
      payload.targetUsername ? `(@${payload.targetUsername.replace(/^@/, '')})` : '',
      payload.targetUserId ? `· Telegram ID: ${payload.targetUserId}` : ''
    ]
      .filter(Boolean)
      .join(' ');
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      payload.targetChatId,
      `Reposted by a community administrator\nOriginal sender: ${originalSender}\n\n${payload.text}`,
      payload.messageThreadId ? { message_thread_id: payload.messageThreadId } : undefined
    );
  } else if (
    (requestedAction === 'allowphrase' || requestedAction === 'blockphrase') &&
    payload.blockedPhrase
  ) {
    await updateBlockedPhraseForGroup({
      chatId: payload.targetChatId,
      phrase: payload.blockedPhrase,
      shouldBlock: requestedAction === 'blockphrase'
    });
  } else {
    return 'expired';
  }
  await prisma.telegramCommunityState.update({
    where: { bot_chatId: { bot: MODERATION_ACTION_STATE, chatId: actionId } },
    data: { state: 'COMPLETED', expiresAt: new Date() }
  });
  return requestedAction;
}

/** Records a privacy-safe operational event in the configured staff log channel. */
export async function sendGroupHelpActivityLog(
  values: Record<string, string>,
  title: string,
  details: Array<string | null | undefined> = []
) {
  const destination = values.telegramGroupHelpLogChannelId?.trim();
  if (!destination) return;
  const body = details.filter((detail): detail is string => Boolean(detail?.trim())).join('\n');
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    destination,
    ['📋 ' + title, body].filter(Boolean).join('\n\n')
  ).catch(() => null);
}

export async function deleteGroupHelpMessage(chatId: string, messageId: number) {
  await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

export async function sendTemporaryGroupHelpMessage(
  chatId: string,
  text: string,
  values: Record<string, string>,
  options: Parameters<typeof sendCommunityMessage>[3] = {}
) {
  const defaultTopicId = Number(values.telegramCommunityDefaultTopicId || 0) || undefined;
  const sent = await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text, {
    ...options,
    ...(options.message_thread_id || !defaultTopicId ? {} : { message_thread_id: defaultTopicId })
  });
  const delaySeconds = Math.max(0, Number(values.telegramGroupHelpAutoDeleteSeconds || 300));
  if (delaySeconds > 0) {
    await scheduleCommunityMessageCleanup({
      bot: GROUP_HELP_BOT_SLUG,
      chatId,
      messageId: sent.message_id,
      kind: 'transient',
      deleteAfter: new Date(Date.now() + delaySeconds * 1000)
    });
  }
  return sent;
}

export async function applyGroupHelpMemberAction(
  chatId: string,
  userId: number,
  action: string,
  muteMinutes = 60
) {
  if (action === 'ban' || action === 'kick') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'banChatMember', {
      chat_id: chatId,
      user_id: userId,
      revoke_messages: false
    });
    if (action === 'kick') {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
        chat_id: chatId,
        user_id: userId,
        only_if_banned: true
      });
    }
  } else if (action === 'mute') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + Math.max(1, Math.min(10_080, muteMinutes)) * 60
    });
  } else if (action === 'unban') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
      chat_id: chatId,
      user_id: userId,
      only_if_banned: true
    });
  }
}
