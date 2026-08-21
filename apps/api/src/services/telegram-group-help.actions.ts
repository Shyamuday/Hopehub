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
import { messageForGroupHelpTarget } from './telegram-group-help.command-context.js';
import {
  canUseGroupHelpAdminCommand,
  canUseGroupHelpCommand
} from './telegram-group-help.permissions.js';
import {
  removeLatestTelegramGroupWarning,
  scheduleCommunityMessageCleanup
} from './telegram-community-bots.store.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

const MODERATION_ACTION_STATE = 'group-moderation-action';

const NORMAL_MEMBER_PERMISSIONS = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_change_info: false,
  can_invite_users: true,
  can_pin_messages: false,
  can_manage_topics: false
};

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
  const staffDestination = values.telegramGroupHelpStaffGroupId?.trim() || '';
  const logDestination = values.telegramGroupHelpLogChannelId?.trim() || '';
  if (!staffDestination && !logDestination) return;
  const rawText = `${message.text || message.caption || ''}`.trim();
  const normalizedText = rawText.replace(/\s+/g, ' ');
  const preview = normalizedText
    ? normalizedText.length > 700
      ? `${normalizedText.slice(0, 700)}…`
      : normalizedText
    : '[No text — media or service message]';
  const member = message.from
    ? telegramPersonLogLabel(message.from)
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
  const actionDestination = staffDestination || logDestination;
  if (actionDestination && (buttons.length || phraseButtons.length)) {
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
  const body = [
    '🛡 Moderation action',
    `Action: ${action.toUpperCase()}`,
    `Rule / reason: ${reason}`,
    'Outcome: completed',
    'Performed by: Hope Hub bot (automatic moderation)',
    `Group: ${message.chat.title || message.chat.id} (${message.chat.id})`,
    `Message: ${message.message_id}${message.message_thread_id ? ` · topic ${message.message_thread_id}` : ''}`,
    `Member: ${member}`,
    `Content: ${media || 'text'} · ${rawText.length} character${rawText.length === 1 ? '' : 's'}`,
    `Text: ${preview}`
  ].join('\n');

  // The log channel remains a complete audit trail. The private staff group
  // gets the same alert with the controls that can change a member's access.
  // When a separate staff group has not been configured, retain the old
  // single-destination behavior so existing installations do not lose actions.
  const deliveries = [] as Promise<unknown>[];
  if (staffDestination) {
    if (logDestination && logDestination !== staffDestination) {
      deliveries.push(
        sendCommunityMessage(GROUP_HELP_BOT_SLUG, logDestination, body).catch(() => null)
      );
    }
    deliveries.push(
      sendCommunityMessage(GROUP_HELP_BOT_SLUG, staffDestination, body, {
        reply_markup: { inline_keyboard: [buttons, phraseButtons].filter((row) => row.length) }
      }).catch(() => null)
    );
  } else if (logDestination) {
    deliveries.push(
      sendCommunityMessage(GROUP_HELP_BOT_SLUG, logDestination, body, {
        ...(buttons.length || phraseButtons.length
          ? {
              reply_markup: {
                inline_keyboard: [buttons, phraseButtons].filter((row) => row.length)
              }
            }
          : {})
      }).catch(() => null)
    );
  }
  await Promise.all(deliveries);
}

/** Handles staff-group undo/repost controls for a recorded moderation action. */
export async function handleGroupHelpModerationActionCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  const callbackMessage = callback?.message;
  const data = callback?.data;
  if (!callback || !callbackMessage || !data?.startsWith('hh_mod:')) return false;
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
  const values = await groupHelpConfig(payload.targetChatId);
  const commandByAction: Record<string, string> = {
    unmute: '/unmute',
    unban: '/unban',
    unwarn: '/unwarn',
    repost: '/delete',
    allowphrase: '/unfilter',
    blockphrase: '/filter'
  };
  const command = commandByAction[requestedAction];
  const permissionMessage = messageForGroupHelpTarget(
    {
      ...callbackMessage,
      text: command,
      from: callback.from
    },
    payload.targetChatId
  );
  const permitted = command
    ? ['/filter', '/unfilter'].includes(command)
      ? await canUseGroupHelpAdminCommand(permissionMessage, values, command)
      : await canUseGroupHelpCommand(
          permissionMessage,
          values,
          command,
          ['/unmute', '/unban'].includes(command) ? 'MODERATOR' : 'HELPER'
        )
    : false;
  if (!permitted) {
    await sendGroupHelpActivityLog(values, 'Private staff action denied', [
      `Action: ${requestedAction}`,
      `By: ${telegramPersonLogLabel(callback.from)}`,
      `From group: ${callbackMessage.chat.id}`,
      `Target group: ${payload.targetChatId}`,
      'Reason: this member does not have the required bot permission.'
    ]);
    return 'denied';
  }

  if (requestedAction === 'unmute' && payload.targetUserId) {
    const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: payload.targetChatId }
    );
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
      chat_id: payload.targetChatId,
      user_id: Number(payload.targetUserId),
      permissions: {
        ...NORMAL_MEMBER_PERMISSIONS,
        ...(chat.permissions || {}),
        can_send_messages: true
      }
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
      payload.targetUserId ? `[${payload.targetUserId}]` : ''
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
  await sendGroupHelpActivityLog(values, 'Private staff action applied', [
    `Action: ${requestedAction}`,
    `By: ${telegramPersonLogLabel(callback.from, 'Telegram staff')}`,
    `From group: ${callbackMessage.chat.id}`,
    `Target group: ${payload.targetChatId}`,
    payload.targetUserId
      ? `Target member: ${telegramPersonLogLabel({
          firstName: payload.targetUserName,
          username: payload.targetUsername,
          telegramUserId: payload.targetUserId
        })}`
      : null,
    payload.blockedPhrase ? `Phrase: ${payload.blockedPhrase}` : null
  ]);
  return requestedAction;
}

/** Records a privacy-safe operational event in the configured staff log channel. */
export async function sendGroupHelpActivityLog(
  values: Record<string, string>,
  title: string,
  details: Array<string | null | undefined> = []
) {
  const destinations = [
    values.telegramGroupHelpLogChannelId?.trim(),
    values.telegramGroupHelpStaffGroupId?.trim()
  ].filter((value): value is string => Boolean(value));
  if (!destinations.length) return;
  const body = details.filter((detail): detail is string => Boolean(detail?.trim())).join('\n');
  await Promise.all(
    [...new Set(destinations)].map((destination) =>
      sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        destination,
        ['📋 ' + title, body].filter(Boolean).join('\n\n')
      ).catch(() => null)
    )
  );
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
