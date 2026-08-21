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
import {
  canUseGroupHelpCommand,
  canUseGroupHelpAdminCommand,
  sendGroupHelpPermissionDenied
} from './telegram-group-help.permissions.js';
import {
  groupHelpCommandFailureMessage,
  messageForGroupHelpTarget,
  resolveGroupHelpCommandContext
} from './telegram-group-help.command-context.js';
import { requestGroupHelpCommandConfirmation } from './telegram-group-help.command-confirmation.js';
import { groupHelpAdminMentionReplyTarget } from './telegram-group-help.admin-mentions.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

export async function handleGroupHelpStaffCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);

  // Commands from either configured private control group act on the main group.
  const context = await resolveGroupHelpCommandContext(message);
  const targetChatId = context.targetChatId;
  const isCrossGroup = context.isControlGroup;
  const permissionMessage = messageForGroupHelpTarget(message, targetChatId);

  if (command === '/send') {
    if (!message.from || !(await canUseGroupHelpAdminCommand(permissionMessage, values, '/send'))) {
      await sendGroupHelpPermissionDenied(message, 'ADMIN', chatId, values);
      return true;
    }
    const textToSend = parts.slice(1).join(' ').trim();
    if (!textToSend) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        'Usage: reply to an Administrator request with /send <message>, or use /send <message> to post in the main group as Hope Hub bot.'
      );
      return true;
    }
    const replyTarget = isCrossGroup
      ? await groupHelpAdminMentionReplyTarget(chatId, message.reply_to_message?.message_id)
      : null;
    const destinationChatId = replyTarget?.targetChatId || targetChatId;
    const posted = await sendCommunityMessage(GROUP_HELP_BOT_SLUG, destinationChatId, textToSend, {
      ...(replyTarget?.targetMessageId ? { reply_to_message_id: replyTarget.targetMessageId } : {}),
      ...(replyTarget?.messageThreadId
        ? { message_thread_id: replyTarget.messageThreadId }
        : message.message_thread_id && !isCrossGroup
          ? { message_thread_id: message.message_thread_id }
          : {})
    });
    await sendGroupHelpActivityLog(values, 'Administrator response posted', [
      `Posted by: ${telegramPersonLogLabel(message.from, 'Administrator')}`,
      `Group: ${destinationChatId}`,
      replyTarget ? `In reply to: ${replyTarget.memberLabel}` : 'Reply target: main group',
      `Bot message: ${posted.message_id}`
    ]);
    if (isCrossGroup) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        `Posted in the main group as Hope Hub bot${replyTarget ? ` in reply to ${replyTarget.memberLabel}` : ''}.`
      );
    }
    return true;
  }

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

    if (
      !(await canUseGroupHelpCommand(permissionMessage, values, `/${canonicalName}`, requiredRole))
    ) {
      await sendGroupHelpPermissionDenied(message, requiredRole, chatId, values);
      return true;
    }
    if (
      ['ban', 'kick', 'delban', 'delkick'].includes(commandName) &&
      (await requestGroupHelpCommandConfirmation({
        message,
        targetChatId,
        command
      }))
    ) {
      return true;
    }

    const deleteFirst = ['delete', 'del', 'delwarn', 'delmute', 'delban', 'delkick'].includes(
      commandName
    );
    const effectiveAction =
      canonicalName === 'delete' ? 'delete' : canonicalName.replace(/^del/, '') || 'delete';

    // A command in another group cannot reply to a main-group message. Require
    // the exact message ID so the bot never reports a deletion it did not do.
    if (isCrossGroup && effectiveAction === 'delete') {
      const messageId = Number((parts[1] || '').replace(/^message:/i, ''));
      if (!Number.isInteger(messageId) || messageId <= 0) {
        await sendCommunityMessage(
          GROUP_HELP_BOT_SLUG,
          chatId,
          `Usage: ${command} <main_group_message_id> [reason]\nExample: ${command} 12345 harmful content`
        );
        return true;
      }
      const reason = parts.slice(2).join(' ').trim() || 'Manual deletion by community staff';
      await deleteGroupHelpMessage(targetChatId, messageId);
      await sendGroupHelpActivityLog(values, 'Main-group message deleted', [
        `Group ID: ${targetChatId}`,
        `Message ID: ${messageId}`,
        `Reason: ${reason}`,
        `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
      ]);
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        `Deleted main-group message ${messageId}. Reason: ${reason}`
      );
      return true;
    }

    // Resolve target — reply in main group OR user ID/username from staff group
    let target = message.reply_to_message?.from as
      { id: number; first_name?: string; username?: string } | undefined;

    if (isCrossGroup) {
      const arg = parts[1] || '';
      let userId = /^\d+$/.test(arg) ? Number(arg) : 0;

      if (!userId && arg.startsWith('@')) {
        const known = await prisma.telegramCommunityMember.findFirst({
          where: {
            chatId: targetChatId,
            username: { equals: arg.slice(1), mode: 'insensitive' }
          },
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

    let crossGroupMessageId: number | null = null;
    if (isCrossGroup && deleteFirst) {
      crossGroupMessageId = Number((parts[2] || '').replace(/^message:/i, ''));
      if (!Number.isInteger(crossGroupMessageId) || crossGroupMessageId <= 0) {
        await sendCommunityMessage(
          GROUP_HELP_BOT_SLUG,
          chatId,
          `Usage: ${command} <user_id or @username> <main_group_message_id> [reason]`
        );
        return true;
      }
    }

    const reasonStart = isCrossGroup ? (deleteFirst ? 3 : 2) : 1;
    const reason =
      parts.slice(reasonStart).join(' ').trim() || `Manual ${canonicalName} by community staff`;

    if (deleteFirst) {
      const messageId = isCrossGroup
        ? crossGroupMessageId
        : message.reply_to_message?.message_id || null;
      if (messageId) await deleteGroupHelpMessage(targetChatId, messageId);
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
        try {
          await applyGroupHelpMemberAction(
            targetChatId,
            target.id,
            values.telegramGroupHelpWarnAction || 'mute'
          );
        } catch (error) {
          await sendCommunityMessage(
            GROUP_HELP_BOT_SLUG,
            chatId,
            `The warning was recorded, but the configured follow-up action failed. ${groupHelpCommandFailureMessage(error)}`
          );
          await sendModerationLog(values, permissionMessage, reason, 'warn');
          return true;
        }
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
      );
    }

    if (isCrossGroup) {
      await sendGroupHelpActivityLog(values, 'Private admin command applied', [
        `Action: ${effectiveAction}`,
        `Main group ID: ${targetChatId}`,
        `Member: ${target.first_name || 'Telegram member'} (${target.id})`,
        `Reason: ${reason}`,
        `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
      ]);
    } else {
      await sendModerationLog(
        values,
        { ...message, from: target as typeof message.from },
        reason,
        effectiveAction
      );
    }

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

  if (!message.from || !(await canUseGroupHelpAdminCommand(permissionMessage, values, command))) {
    await sendGroupHelpPermissionDenied(message, 'ADMIN', chatId, values);
    return true;
  }

  let target = message.reply_to_message?.from;
  if (isCrossGroup) {
    const argument = parts[1] || '';
    let targetId = /^\d+$/.test(argument) ? Number(argument) : 0;
    if (!targetId && argument.startsWith('@')) {
      const known = await prisma.telegramCommunityMember.findFirst({
        where: {
          chatId: targetChatId,
          username: { equals: argument.slice(1), mode: 'insensitive' }
        },
        select: { telegramUserId: true }
      });
      targetId = Number(known?.telegramUserId || 0);
    }
    if (targetId) {
      const member = await callCommunityTelegramApi<{
        user?: { id: number; first_name?: string; username?: string };
      }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
        chat_id: targetChatId,
        user_id: targetId
      }).catch(() => null);
      target = member?.user;
    }
  }
  if (!target) {
    const usage = isCrossGroup
      ? `Use ${command} <user_id or @username> from this private admin group.`
      : 'Reply to a member, then use this role command.';
    await sendTemporaryGroupHelpMessage(chatId, usage, values);
    return true;
  }

  const roleCommandName = roleCommand[1].toLowerCase();
  const role = ['moderator', 'unmoderator', 'mod', 'unmod'].includes(roleCommandName)
    ? 'MODERATOR'
    : 'HELPER';

  if (roleCommandName.startsWith('un')) {
    await prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId: targetChatId, telegramUserId: String(target.id), role }
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `Removed ${role.toLowerCase()} role from ${target.first_name || 'this member'}.`,
      values
    );
  } else {
    await prisma.$transaction([
      prisma.telegramCommunityRoleAssignment.deleteMany({
        where: { chatId: targetChatId, telegramUserId: String(target.id) }
      }),
      prisma.telegramCommunityRoleAssignment.upsert({
        where: {
          chatId_telegramUserId_role: {
            chatId: targetChatId,
            telegramUserId: String(target.id),
            role
          }
        },
        create: {
          chatId: targetChatId,
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
    `Group ID: ${targetChatId}`,
    `Member: ${target.first_name || 'Telegram member'} (${target.id})`,
    `Role: ${roleCommandName.startsWith('un') ? 'removed' : 'assigned'} ${role.toLowerCase()}`,
    `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
  ]);
  return true;
}
