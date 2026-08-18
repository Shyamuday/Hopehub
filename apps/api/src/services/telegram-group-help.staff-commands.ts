import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import { addTelegramGroupWarning } from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  applyGroupHelpMemberAction,
  deleteGroupHelpMessage,
  sendModerationLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { canUseGroupHelpCommand, isModerationExempt } from './telegram-group-help.permissions.js';

export async function handleGroupHelpStaffCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);
  const moderationCommand = /^\/(warn|delete|mute|unmute|ban|unban|kick)$/i.exec(command);
  if (moderationCommand) {
    const commandName = moderationCommand[1].toLowerCase();
    const requiredRole = ['mute', 'unmute', 'ban', 'unban', 'kick'].includes(commandName)
      ? 'MODERATOR'
      : 'HELPER';
    if (!(await canUseGroupHelpCommand(message, values, `/${commandName}`, requiredRole)))
      return true;
    const targetMessage = message.reply_to_message;
    const target = targetMessage?.from;
    if (!target || !targetMessage) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member’s message, then use this moderation command.',
        values
      );
      return true;
    }
    const reason = parts.slice(1).join(' ').trim() || `Manual ${commandName} by community staff`;
    if (commandName === 'delete') {
      await deleteGroupHelpMessage(chatId, targetMessage.message_id).catch(() => null);
    } else if (commandName === 'warn') {
      const warnings = await addTelegramGroupWarning({
        chatId,
        telegramUserId: String(target.id),
        reason
      });
      const warnLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
      if (warnings >= warnLimit) {
        await applyGroupHelpMemberAction(
          chatId,
          target.id,
          values.telegramGroupHelpWarnAction || 'mute'
        ).catch(() => null);
      }
    } else if (commandName === 'unmute') {
      const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
        GROUP_HELP_BOT_SLUG,
        'getChat',
        { chat_id: chatId }
      );
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
        chat_id: chatId,
        user_id: target.id,
        permissions: chat.permissions || { can_send_messages: true }
      });
    } else {
      await applyGroupHelpMemberAction(chatId, target.id, commandName).catch(() => null);
    }
    await sendModerationLog(
      values,
      { ...message, from: target, text: reason },
      reason,
      commandName
    );
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ ${commandName[0].toUpperCase()}${commandName.slice(1)} applied to ${target.first_name || 'this member'}.`,
      values
    );
    return true;
  }
  const roleCommand = /^\/(helper|unhelper|moderator|unmoderator|mod|unmod)$/i.exec(command);
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
  const commandName = roleCommand[1].toLowerCase();
  const role = ['moderator', 'unmoderator', 'mod', 'unmod'].includes(commandName)
    ? 'MODERATOR'
    : 'HELPER';
  if (commandName.startsWith('un')) {
    await prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId, telegramUserId: String(target.id), role }
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `Removed ${role.toLowerCase()} role from ${target.first_name || 'this member'}.`,
      values
    );
  } else {
    await prisma.telegramCommunityRoleAssignment.upsert({
      where: { chatId_telegramUserId_role: { chatId, telegramUserId: String(target.id), role } },
      create: {
        chatId,
        telegramUserId: String(target.id),
        role,
        assignedById: String(message.from.id)
      },
      update: { assignedById: String(message.from.id) }
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `${target.first_name || 'This member'} is now a ${role.toLowerCase()}.`,
      values
    );
  }
  return true;
}
