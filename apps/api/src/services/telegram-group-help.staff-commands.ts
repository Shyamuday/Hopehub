import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  addTelegramGroupWarning,
  removeLatestTelegramGroupWarning
} from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  applyGroupHelpMemberAction,
  deleteGroupHelpMessage,
  sendGroupHelpActivityLog,
  sendModerationLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { canUseGroupHelpCommand, isModerationExempt } from './telegram-group-help.permissions.js';
import { getSiteConfigMap } from './site-config.service.js';

/**
 * If the command was sent from the configured staff group, return the main
 * group ID so commands apply there instead. Returns null otherwise.
 */
async function crossGroupTarget(chatId: string): Promise<string | null> {
  const config = await getSiteConfigMap([
    'telegramGroupHelpStaffGroupId',
    'telegramGroupHelpGroupChatId'
  ]);
  const staffGroupId = config.telegramGroupHelpStaffGroupId?.trim();
  const mainGroupId = config.telegramGroupHelpGroupChatId?.trim();
  if (staffGroupId && mainGroupId && chatId === staffGroupId) return mainGroupId;
  return null;
}

export async function handleGroupHelpStaffCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);

  // When sent from the private staff group, redirect actions to the main group
  const mainGroupId = await crossGroupTarget(chatId);
  const targetChatId = mainGroupId || chatId;
  const isCrossGroup = Boolean(mainGroupId);

  // ── Moderation commands ──────────────────────────────────────────────────

  const moderationCommand =
    /^\/(warn|unwarn|delete|del|mute|unmute|ban|unban|kick|delwarn|delmute|delban|delkick|ro|unro)$/i.exec(
      command
    );

  if (moderationCommand) {
    const commandName = moderationCommand[1].toLowerCase();
    const canonicalName =
      commandName === 'del' ? 'delete' : commandName === 'delkick' ? 'kick' : commandName;

    const requiredRole = [
      'mute',
      'unmute',
      'ban',
      'unban',
      'kick',
      'delmute',
      'delban',
      'delkick',
      'ro',
      'unro'
    ].includes(commandName)
      ? 'MODERATOR'
      : 'HELPER';

    if (!(await canUseGroupHelpCommand(message, values, `/${canonicalName}`, requiredRole)))
      return true;

    // Resolve target — reply in main group OR user ID/username from staff group
    let target = message.reply_to_message?.from as
      { id: number; first_name?: string; username?: string } | undefined;

    if (isCrossGroup) {
      const arg = parts[1] || '';
      let userId = /^\d+$/.test(arg) ? Number(arg) : 0;

      if (!userId && arg.startsWith('@')) {
        const known = await prisma.telegramCommunityMember.findFirst({
          where: { chatId: targetChatId, username: arg.slice(1) },
          select: { telegramUserId: true }
        });
        if (known) userId = Number(known.telegramUserId);
      }

      if (!userId) {
        await sendCommunityMessage(
          GROUP_HELP_BOT_SLUG,
          chatId,
          `Usage: ${command} <user_id or @username> [reason]\nExample: ${command} 123456789 spam`
        );
        return true;
      }

      const memberInfo = await callCommunityTelegramApi<{
        user?: { id: number; first_name?: string; username?: string };
      }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
        chat_id: targetChatId,
        user_id: userId
      }).catch(() => null);

      if (!memberInfo?.user) {
        await sendCommunityMessage(
          GROUP_HELP_BOT_SLUG,
          chatId,
          `Could not find user ${userId} in the main group.`
        );
        return true;
      }

      target = memberInfo.user;
    } else if (!target || !message.reply_to_message) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member\u2019s message, then use this moderation command.',
        values
      );
      return true;
    }

    if (!target) return true;

    const reasonStart = isCrossGroup ? 2 : 1;
    const reason =
      parts.slice(reasonStart).join(' ').trim() || `Manual ${canonicalName} by community staff`;

    const deleteFirst = ['delete', 'del', 'delwarn', 'delmute', 'delban', 'delkick'].includes(
      commandName
    );

    const effectiveAction =
      canonicalName === 'delete' ? 'delete' : canonicalName.replace(/^del/, '') || 'delete';

    // Delete the replied message (only possible in same group)
    if (deleteFirst && !isCrossGroup && message.reply_to_message) {
      await deleteGroupHelpMessage(targetChatId, message.reply_to_message.message_id).catch(
        () => null
      );
    }

    if (effectiveAction === 'delete') {
      // deletion already done above
    } else if (effectiveAction === 'unwarn') {
      const result = await removeLatestTelegramGroupWarning(targetChatId, String(target.id));
      if (!result.removed) {
        const reply = 'This member has no recorded warnings to remove.';
        if (isCrossGroup) {
          await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, reply);
        } else {
          await sendTemporaryGroupHelpMessage(chatId, reply, values);
        }
        return true;
      }
    } else if (effectiveAction === 'warn') {
      const warnings = await addTelegramGroupWarning({
        chatId: targetChatId,
        telegramUserId: String(target.id),
        reason
      });
      const warnLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
      if (warnings >= warnLimit) {
        await applyGroupHelpMemberAction(
          targetChatId,
          target.id,
          values.telegramGroupHelpWarnAction || 'mute'
        ).catch(() => null);
      }
    } else if (effectiveAction === 'unmute' || effectiveAction === 'unro') {
      const chat = await callCommunityTelegramApi<{
        permissions?: Record<string, boolean>;
      }>(GROUP_HELP_BOT_SLUG, 'getChat', { chat_id: targetChatId });
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
        chat_id: targetChatId,
        user_id: target.id,
        permissions: chat.permissions || { can_send_messages: true }
      });
    } else if (effectiveAction === 'ro') {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
        chat_id: targetChatId,
        user_id: target.id,
        until_date: 0,
        permissions: { can_send_messages: false }
      });
    } else {
      await applyGroupHelpMemberAction(
        targetChatId,
        target.id,
        effectiveAction,
        Number(values.telegramGroupHelpMuteMinutes || 60)
      ).catch(() => null);
    }

    await sendModerationLog(
      values,
      {
        ...message,
        chat: {
          ...message.chat,
          id: Number(targetChatId)
        } as typeof message.chat,
        from: target as typeof message.from
      },
      reason,
      effectiveAction
    );

    const confirmText = `✅ ${effectiveAction[0].toUpperCase()}${effectiveAction.slice(1)} applied to ${target.first_name || target.id}${isCrossGroup ? ' in main group.' : '.'}`;
    if (isCrossGroup) {
      await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, confirmText);
    } else {
      await sendTemporaryGroupHelpMessage(chatId, confirmText, values);
    }
    return true;
  }

  // ── Role commands ────────────────────────────────────────────────────────

  const roleCommand = /^\/(helper|unhelper|moderator|unmoderator|mod|unmod|free|unfree)$/i.exec(
    command
  );
  if (!roleCommand) return false;

  if (
    !message.from ||
    !(await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || ''))
  )
    return true;

  const target = message.reply_to_message?.from;
  if (!target) {
    await sendTemporaryGroupHelpMessage(
      chatId,
      'Reply to a member, then use this role command.',
      values
    );
    return true;
  }

  const roleCommandName = roleCommand[1].toLowerCase();
  const role = ['moderator', 'unmoderator', 'mod', 'unmod'].includes(roleCommandName)
    ? 'MODERATOR'
    : 'HELPER';

  if (roleCommandName.startsWith('un')) {
    await prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId, telegramUserId: String(target.id), role }
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `Removed ${role.toLowerCase()} role from ${target.first_name || 'this member'}.`,
      values
    );
  } else {
    await prisma.$transaction([
      prisma.telegramCommunityRoleAssignment.deleteMany({
        where: { chatId, telegramUserId: String(target.id) }
      }),
      prisma.telegramCommunityRoleAssignment.upsert({
        where: {
          chatId_telegramUserId_role: {
            chatId,
            telegramUserId: String(target.id),
            role
          }
        },
        create: {
          chatId,
          telegramUserId: String(target.id),
          role,
          assignedById: String(message.from.id)
        },
        update: { assignedById: String(message.from.id) }
      })
    ]);
    await sendTemporaryGroupHelpMessage(
      chatId,
      `${target.first_name || 'This member'} is now a ${role.toLowerCase()}.`,
      values
    );
  }

  await sendGroupHelpActivityLog(values, 'Community role updated', [
    `Group: ${message.chat.title || chatId}`,
    `Member: ${target.first_name || 'Telegram member'} (${target.id})`,
    `Role: ${roleCommandName.startsWith('un') ? 'removed' : 'assigned'} ${role.toLowerCase()}`,
    `By: ${message.from.first_name || 'Administrator'} (${message.from.id})`
  ]);
  return true;
}
