import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  editCommunityReplyMarkup
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import {
  canUseGroupHelpBanCommand,
  canUseGroupHelpCommand,
  canUseGroupHelpAdminCommand
} from './telegram-group-help.permissions.js';
import { messageForGroupHelpTarget } from './telegram-group-help.command-context.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';
import { sendGroupHelpBotContent } from './telegram-group-help.bot-send.js';
import {
  sendGroupHelpActivityLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';

const ALERT_ACTION_STATE = 'group-help:alert-action';
const ALERT_REPLY_STATE = 'group-help:alert-reply';
const ALERT_LIFETIME_MS = 7 * 24 * 60 * 60_000;
const ALERT_REPLY_LIFETIME_MS = 10 * 60_000;

export type GroupHelpAlertActionPayload = {
  targetChatId: string;
  targetMessageId: number;
  targetUserId?: string | null;
  reason: string;
  moderationCaseId?: string | null;
  originalMessageUrl?: string | null;
  replyTargetMessageId?: number | null;
  messageThreadId?: number | null;
  claimedByUserId?: string | null;
  claimedByLabel?: string | null;
};

function alertCopyWithStatus(message: CommunityTelegramMessage, status: string) {
  const source = message.text || message.caption || 'Moderation alert';
  const cleaned = source.replace(
    /\n\n(?:👤 Claimed by|✅ Resolved by):[^\n]*(?:\nAction:[^\n]*)?$/u,
    ''
  );
  const limit = message.caption != null ? 1024 : 4096;
  const suffix = `\n\n${status}`;
  return `${Array.from(cleaned)
    .slice(0, Math.max(0, limit - Array.from(suffix).length))
    .join('')}${suffix}`;
}

async function updateAlertStatus(
  message: CommunityTelegramMessage,
  status: string,
  removeActions = false
) {
  const isCaption = message.caption != null;
  return callCommunityTelegramApi(
    GROUP_HELP_BOT_SLUG,
    isCaption ? 'editMessageCaption' : 'editMessageText',
    {
      chat_id: message.chat.id,
      message_id: message.message_id,
      [isCaption ? 'caption' : 'text']: alertCopyWithStatus(message, status),
      ...(removeActions ? { reply_markup: { inline_keyboard: [] } } : {})
    }
  ).catch(() => null);
}

export async function createGroupHelpAlertActions(payload: GroupHelpAlertActionPayload) {
  const token = randomUUID().replace(/-/g, '').slice(0, 20);
  await prisma.telegramCommunityState.create({
    data: {
      bot: ALERT_ACTION_STATE,
      chatId: token,
      state: 'OPEN',
      payload,
      expiresAt: new Date(Date.now() + ALERT_LIFETIME_MS)
    }
  });
  const button = (text: string, action: string, style?: 'primary' | 'success' | 'danger') => ({
    text,
    callback_data: `hh_alert:${token}:${action}`,
    ...(style ? { style } : {})
  });
  const keyboard: TelegramKeyboard = {
    inline_keyboard: [
      ...(payload.originalMessageUrl
        ? [[{ text: 'Open original message', url: payload.originalMessageUrl }]]
        : []),
      [button('Warn', 'warn'), button('Mute 1h', 'mute', 'primary')],
      [button('Delete message', 'delete', 'danger'), button('Ban', 'ban', 'danger')],
      [
        button('Reply as bot', 'reply', 'primary'),
        button('Claim review', 'claim', 'primary'),
        button('Resolve', 'resolve', 'success')
      ]
    ]
  };
  return keyboard;
}

export async function handleGroupHelpAlertActionCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data?.startsWith('hh_alert:')) return false;
  const [, token, action] = callback.data.split(':');
  if (
    !token ||
    !['reply', 'claim', 'warn', 'mute', 'delete', 'ban', 'resolve'].includes(action || '')
  )
    return false;
  const state = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: ALERT_ACTION_STATE, chatId: token } }
  });
  if (!state || state.state !== 'OPEN' || state.expiresAt <= new Date()) return 'expired';
  const payload = (state.payload || {}) as Partial<GroupHelpAlertActionPayload>;
  if (!payload.targetChatId || !payload.targetMessageId) return 'expired';
  const values = await groupHelpConfig(payload.targetChatId);
  const permissionCommand =
    action === 'mute'
      ? '/tmute'
      : action === 'ban'
        ? '/ban'
        : action === 'delete'
          ? '/del'
          : '/warn';
  const permissionMessage = messageForGroupHelpTarget(
    { ...callback.message, from: callback.from, text: permissionCommand },
    payload.targetChatId
  );
  const permitted =
    action === 'reply'
      ? await canUseGroupHelpAdminCommand(permissionMessage, values, '/send')
      : action === 'ban'
        ? await canUseGroupHelpBanCommand(permissionMessage, values)
        : await canUseGroupHelpCommand(
            permissionMessage,
            values,
            permissionCommand,
            action === 'mute' ? 'MODERATOR' : 'HELPER'
          );
  if (!permitted) return 'denied';
  const actorId = String(callback.from.id);
  const actorLabel = telegramPersonLogLabel(callback.from, 'Administrator');
  if (payload.claimedByUserId && payload.claimedByUserId !== actorId) return 'claimed';
  if (payload.moderationCaseId) {
    const moderationCase = await prisma.telegramCommunityModerationCase.findUnique({
      where: { id: payload.moderationCaseId },
      select: { status: true, assignedToId: true }
    });
    if (!moderationCase || moderationCase.status !== 'OPEN') return 'expired';
    if (moderationCase.assignedToId && moderationCase.assignedToId !== `telegram:${actorId}`) {
      return 'claimed';
    }
  }

  if (action === 'reply') {
    const prompt = await callCommunityTelegramApi<{ message_id: number }>(
      GROUP_HELP_BOT_SLUG,
      'sendMessage',
      {
        chat_id: callback.message.chat.id,
        text: 'Reply here with text or attach media. Hope Hub bot will post it as a reply in the original group. This prompt expires in 10 minutes.',
        reply_to_message_id: callback.message.message_id,
        reply_markup: {
          force_reply: true,
          selective: true,
          input_field_placeholder: 'Reply as Hope Hub bot'
        }
      }
    );
    const replyStateKey = `${callback.message.chat.id}:${prompt.message_id}:${actorId}`;
    await prisma.telegramCommunityState.create({
      data: {
        bot: ALERT_REPLY_STATE,
        chatId: replyStateKey,
        state: 'OPEN',
        payload: {
          targetChatId: payload.targetChatId,
          targetMessageId: payload.replyTargetMessageId || payload.targetMessageId,
          messageThreadId: payload.messageThreadId || null,
          memberLabel: payload.claimedByLabel || 'Telegram member'
        },
        expiresAt: new Date(Date.now() + ALERT_REPLY_LIFETIME_MS)
      }
    });
    return 'reply';
  }

  if (action === 'claim') {
    const locked = await prisma.telegramCommunityState.updateMany({
      where: {
        bot: ALERT_ACTION_STATE,
        chatId: token,
        state: 'OPEN',
        expiresAt: { gt: new Date() }
      },
      data: { state: 'CLAIMING' }
    });
    if (locked.count !== 1) return 'expired';
    try {
      if (payload.moderationCaseId) {
        const assigned = await prisma.telegramCommunityModerationCase.updateMany({
          where: {
            id: payload.moderationCaseId,
            status: 'OPEN',
            OR: [{ assignedToId: null }, { assignedToId: `telegram:${actorId}` }]
          },
          data: {
            assignedToId: `telegram:${actorId}`,
            assignedToLabel: actorLabel,
            assignedAt: new Date()
          }
        });
        if (!assigned.count) {
          await prisma.telegramCommunityState.update({
            where: { bot_chatId: { bot: ALERT_ACTION_STATE, chatId: token } },
            data: { state: 'OPEN' }
          });
          return 'claimed';
        }
      }
      await prisma.telegramCommunityState.update({
        where: { bot_chatId: { bot: ALERT_ACTION_STATE, chatId: token } },
        data: {
          state: 'OPEN',
          payload: { ...payload, claimedByUserId: actorId, claimedByLabel: actorLabel }
        }
      });
      await updateAlertStatus(callback.message, `👤 Claimed by: ${actorLabel}`);
      return 'claim';
    } catch (error) {
      await prisma.telegramCommunityState
        .updateMany({
          where: { bot: ALERT_ACTION_STATE, chatId: token, state: 'CLAIMING' },
          data: { state: 'OPEN' }
        })
        .catch(() => null);
      throw error;
    }
  }
  if (action !== 'resolve' && !payload.targetUserId && action !== 'delete') return 'expired';
  const claimed = await prisma.telegramCommunityState.updateMany({
    where: { bot: ALERT_ACTION_STATE, chatId: token, state: 'OPEN', expiresAt: { gt: new Date() } },
    data: { state: 'PROCESSING' }
  });
  if (claimed.count !== 1) return 'expired';
  try {
    if (action !== 'resolve') {
      const command =
        action === 'warn'
          ? `/warn ${payload.targetUserId} ${payload.reason || 'Reviewed private alert'}`
          : action === 'mute'
            ? `/tmute ${payload.targetUserId} 1h ${payload.reason || 'Reviewed private alert'}`
            : action === 'ban'
              ? `/ban ${payload.targetUserId} ${payload.reason || 'Reviewed private alert'}`
              : `/del ${payload.targetMessageId} ${payload.reason || 'Reviewed private alert'}`;
      const { handleGroupHelpStaffCommand } =
        await import('./telegram-group-help.staff-commands.js');
      await handleGroupHelpStaffCommand(
        { ...callback.message, from: callback.from, text: command, _groupHelpConfirmed: true },
        values
      );
    }
    await prisma.$transaction([
      prisma.telegramCommunityState.update({
        where: { bot_chatId: { bot: ALERT_ACTION_STATE, chatId: token } },
        data: { state: 'COMPLETED', expiresAt: new Date() }
      }),
      ...(payload.moderationCaseId
        ? [
            prisma.telegramCommunityModerationCase.update({
              where: { id: payload.moderationCaseId },
              data: {
                status: 'RESOLVED',
                action: action || 'resolve',
                resolvedByUserId: actorId,
                assignedToId: payload.claimedByUserId
                  ? `telegram:${payload.claimedByUserId}`
                  : `telegram:${actorId}`,
                assignedToLabel: payload.claimedByLabel || actorLabel,
                assignedAt: new Date(),
                resolvedAt: new Date()
              }
            })
          ]
        : [])
    ]);
  } catch (error) {
    await prisma.telegramCommunityState
      .updateMany({
        where: { bot: ALERT_ACTION_STATE, chatId: token, state: 'PROCESSING' },
        data: { state: 'OPEN' }
      })
      .catch(() => null);
    throw error;
  }
  const statusUpdated = await updateAlertStatus(
    callback.message,
    `✅ Resolved by: ${actorLabel}\nAction: ${action}`,
    true
  );
  if (!statusUpdated) {
    await editCommunityReplyMarkup(
      GROUP_HELP_BOT_SLUG,
      callback.message.chat.id,
      callback.message.message_id,
      { inline_keyboard: [] }
    ).catch(() => null);
  }
  return action;
}

type PendingAlertReply = {
  targetChatId: string;
  targetMessageId: number;
  messageThreadId?: number | null;
};

export async function handleGroupHelpAlertReplyInput(message: CommunityTelegramMessage) {
  if (!message.from || !message.reply_to_message) return false;
  const key = `${message.chat.id}:${message.reply_to_message.message_id}:${message.from.id}`;
  const state = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: ALERT_REPLY_STATE, chatId: key } }
  });
  if (!state) return false;
  if (state.state !== 'OPEN' || state.expiresAt <= new Date()) {
    await prisma.telegramCommunityState.deleteMany({
      where: { bot: ALERT_REPLY_STATE, chatId: key }
    });
    await sendTemporaryGroupHelpMessage(
      String(message.chat.id),
      'This reply prompt expired. Open the report and choose “Reply as bot” again.',
      { telegramGroupHelpAutoDeleteSeconds: '60' }
    );
    return true;
  }
  const payload = (state.payload || {}) as Partial<PendingAlertReply>;
  if (!payload.targetChatId || !Number.isInteger(payload.targetMessageId)) return false;
  const values = await groupHelpConfig(payload.targetChatId);
  const permissionMessage = messageForGroupHelpTarget(message, payload.targetChatId);
  if (!(await canUseGroupHelpAdminCommand(permissionMessage, values, '/send'))) {
    await sendTemporaryGroupHelpMessage(
      String(message.chat.id),
      'You no longer have permission to reply as the bot.',
      { telegramGroupHelpAutoDeleteSeconds: '60' }
    );
    return true;
  }
  const posted = await sendGroupHelpBotContent(message, {
    destinationChatId: payload.targetChatId,
    text: message.text || message.caption || '',
    replyToMessageId: payload.targetMessageId,
    ...(payload.messageThreadId ? { messageThreadId: payload.messageThreadId } : {})
  });
  await prisma.telegramCommunityState.delete({
    where: { bot_chatId: { bot: ALERT_REPLY_STATE, chatId: key } }
  });
  await sendTemporaryGroupHelpMessage(
    String(message.chat.id),
    'Reply posted in the original group as Hope Hub bot.',
    { telegramGroupHelpAutoDeleteSeconds: '60' },
    { reply_to_message_id: message.message_id }
  );
  await sendGroupHelpActivityLog(values, 'Administrator response posted', [
    `Posted by: ${telegramPersonLogLabel(message.from, 'Administrator')}`,
    `Group: ${payload.targetChatId}`,
    `In reply to message: ${payload.targetMessageId}`,
    `Bot message: ${posted.message_id}`
  ]);
  return true;
}
