import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { editCommunityReplyMarkup } from './telegram-community-bots.client.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import {
  canUseGroupHelpBanCommand,
  canUseGroupHelpCommand
} from './telegram-group-help.permissions.js';
import { messageForGroupHelpTarget } from './telegram-group-help.command-context.js';

const ALERT_ACTION_STATE = 'group-help:alert-action';
const ALERT_LIFETIME_MS = 7 * 24 * 60 * 60_000;

export type GroupHelpAlertActionPayload = {
  targetChatId: string;
  targetMessageId: number;
  targetUserId?: string | null;
  reason: string;
  moderationCaseId?: string | null;
};

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
      [button('Warn', 'warn'), button('Mute 1h', 'mute', 'primary')],
      [button('Delete message', 'delete', 'danger'), button('Ban', 'ban', 'danger')],
      [button('Resolve', 'resolve', 'success')]
    ]
  };
  return keyboard;
}

export async function handleGroupHelpAlertActionCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data?.startsWith('hh_alert:')) return false;
  const [, token, action] = callback.data.split(':');
  if (!token || !['warn', 'mute', 'delete', 'ban', 'resolve'].includes(action || '')) return false;
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
    action === 'ban'
      ? await canUseGroupHelpBanCommand(permissionMessage, values)
      : await canUseGroupHelpCommand(
          permissionMessage,
          values,
          permissionCommand,
          action === 'mute' ? 'MODERATOR' : 'HELPER'
        );
  if (!permitted) return 'denied';
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
                resolvedByUserId: String(callback.from.id),
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
  await editCommunityReplyMarkup(
    GROUP_HELP_BOT_SLUG,
    callback.message.chat.id,
    callback.message.message_id,
    { inline_keyboard: [] }
  ).catch(() => null);
  return action;
}
