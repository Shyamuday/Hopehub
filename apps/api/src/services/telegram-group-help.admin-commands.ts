import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  endTelegramCommunityLockdown,
  startTelegramCommunityLockdown
} from './telegram-community-group-policy.js';
import {
  sendGroupHelpActivityLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { canUseGroupHelpAdminCommand } from './telegram-group-help.permissions.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { groupHelpPrivateSettingsKeyboard } from './telegram-group-help.menu.js';
import {
  messageForGroupHelpTarget,
  resolveGroupHelpCommandContext
} from './telegram-group-help.command-context.js';
import { sendGroupHelpPermissionDenied } from './telegram-group-help.permissions.js';
import { requestGroupHelpCommandConfirmation } from './telegram-group-help.command-confirmation.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

export async function handleGroupHelpAdminCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (
    ![
      '/settings',
      '/lockdown',
      '/unlock',
      '/pin',
      '/unpin',
      '/pinned',
      '/unpinall',
      '/promote',
      '/demote',
      '/unadmin',
      '/title',
      '/untitle',
      '/welcome',
      '/filter',
      '/unfilter',
      '/filters'
    ].includes(command)
  )
    return false;
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);
  const context = await resolveGroupHelpCommandContext(message);
  const targetChatId = context.targetChatId;
  const permissionMessage = messageForGroupHelpTarget(message, targetChatId);
  if (!message.from || !(await canUseGroupHelpAdminCommand(permissionMessage, values, command))) {
    await sendGroupHelpPermissionDenied(message, 'ADMIN', chatId, values);
    return true;
  }
  if (
    ['/unpinall', '/promote', '/demote', '/unadmin', '/lockdown'].includes(command) &&
    (await requestGroupHelpCommandConfirmation({ message, targetChatId, command }))
  ) {
    return true;
  }
  const resolveMainGroupMember = async (argument: string) => {
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
    if (!targetId) return undefined;
    const member = await callCommunityTelegramApi<{
      user?: { id: number; first_name?: string; username?: string };
    }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
      chat_id: targetChatId,
      user_id: targetId
    }).catch(() => null);
    return member?.user;
  };
  if (command === '/settings') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      '⚙️ *Hope Hub group settings*\n\nOpen the editor privately. Your access is checked against this group before every change.',
      {
        parse_mode: 'Markdown',
        reply_markup: groupHelpPrivateSettingsKeyboard(targetChatId)
      }
    );
    return true;
  }
  if (command === '/pin') {
    const target = message.reply_to_message;
    const explicitMessageId = context.isControlGroup ? Number(parts[1] || 0) : 0;
    const targetMessageId = target?.message_id || explicitMessageId;
    if (!Number.isInteger(targetMessageId) || targetMessageId <= 0) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /pin <main_group_message_id> [notify] from this private admin group.'
          : 'Reply to a message, then use /pin.',
        values
      );
      return true;
    }
    const notify = parts.includes('notify');
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'pinChatMessage', {
      chat_id: targetChatId,
      message_id: targetMessageId,
      disable_notification: !notify
    });
    await sendTemporaryGroupHelpMessage(chatId, 'Pinned the selected message.', values);
    return true;
  }
  if (command === '/unpin') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unpinChatMessage', {
      chat_id: targetChatId
    });
    await sendTemporaryGroupHelpMessage(chatId, 'Unpinned the current message.', values);
    return true;
  }
  if (command === '/pinned') {
    const chat = await callCommunityTelegramApi<{
      username?: string;
      pinned_message?: { message_id?: number };
    }>(GROUP_HELP_BOT_SLUG, 'getChat', { chat_id: targetChatId });
    const messageId = Number(chat.pinned_message?.message_id || 0);
    const link = chat.username
      ? `https://t.me/${chat.username}/${messageId}`
      : targetChatId.startsWith('-100') && messageId
        ? `https://t.me/c/${targetChatId.slice(4)}/${messageId}`
        : '';
    await sendTemporaryGroupHelpMessage(
      chatId,
      link ? `Current pinned message:\n${link}` : 'There is no pinned message.',
      values
    );
    return true;
  }
  if (command === '/unpinall') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unpinAllChatMessages', {
      chat_id: targetChatId
    });
    await sendTemporaryGroupHelpMessage(chatId, '📌 All pinned messages unpinned.', values);
    return true;
  }

  if (command === '/promote') {
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(parts[1] || '') : undefined);
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /promote <user_id or @username> [title] from this private admin group.'
          : "Reply to a member's message, then use /promote.",
        values
      );
      return true;
    }
    const title =
      parts
        .slice(context.isControlGroup ? 2 : 1)
        .join(' ')
        .trim() || '';
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'promoteChatMember', {
      chat_id: targetChatId,
      user_id: target.id,
      can_manage_chat: true,
      can_delete_messages: true,
      can_restrict_members: true,
      can_invite_users: true,
      can_pin_messages: true,
      can_manage_video_chats: true
    });
    if (title) {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatAdministratorCustomTitle', {
        chat_id: targetChatId,
        user_id: target.id,
        custom_title: title.slice(0, 16)
      });
    }
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ ${target.first_name || 'Member'} promoted to admin.${title ? ` Title: ${title}` : ''}`,
      values
    );
    await sendGroupHelpActivityLog(values, 'Member promoted to admin', [
      `Group ID: ${targetChatId}`,
      `Member: ${telegramPersonLogLabel(target)}`,
      `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
    ]);
    return true;
  }

  if (command === '/demote' || command === '/unadmin') {
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(parts[1] || '') : undefined);
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /unadmin <user_id or @username> from this private admin group.'
          : "Reply to a member's message, then use /unadmin.",
        values
      );
      return true;
    }
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'promoteChatMember', {
      chat_id: targetChatId,
      user_id: target.id,
      can_manage_chat: false,
      can_delete_messages: false,
      can_restrict_members: false,
      can_invite_users: false,
      can_pin_messages: false,
      can_manage_video_chats: false
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ ${target.first_name || 'Member'} demoted from admin.`,
      values
    );
    await sendGroupHelpActivityLog(values, 'Member demoted from admin', [
      `Group ID: ${targetChatId}`,
      `Member: ${telegramPersonLogLabel(target)}`,
      `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
    ]);
    return true;
  }

  if (command === '/title') {
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(parts[1] || '') : undefined);
    const title = parts
      .slice(context.isControlGroup ? 2 : 1)
      .join(' ')
      .trim();
    if (!target || !title) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /title <user_id or @username> <title text> from this private admin group.'
          : 'Reply to an admin and use /title <title text>.',
        values
      );
      return true;
    }
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatAdministratorCustomTitle', {
      chat_id: targetChatId,
      user_id: target.id,
      custom_title: title.slice(0, 16)
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ Title set to "${title}" for ${target.first_name || 'admin'}.`,
      values
    );
    return true;
  }

  if (command === '/untitle') {
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(parts[1] || '') : undefined);
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /untitle <user_id or @username> from this private admin group.'
          : 'Reply to an admin, then use /untitle.',
        values
      );
      return true;
    }
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatAdministratorCustomTitle', {
      chat_id: targetChatId,
      user_id: target.id,
      custom_title: ''
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ Title removed from ${target.first_name || 'admin'}.`,
      values
    );
    return true;
  }

  if (command === '/welcome') {
    const arg = parts[1]?.toLowerCase();
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    if (arg === 'off') {
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramCommunityWelcomeEnabled: 'Disabled'
      });
      await sendTemporaryGroupHelpMessage(chatId, '✅ Welcome messages disabled.', values);
    } else if (arg === 'on') {
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramCommunityWelcomeEnabled: 'Enabled'
      });
      await sendTemporaryGroupHelpMessage(chatId, '✅ Welcome messages enabled.', values);
    } else {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `Welcome messages are currently ${values.telegramCommunityWelcomeEnabled === 'Disabled' ? 'OFF' : 'ON'}.\nUse /welcome on or /welcome off to change.`,
        values
      );
    }
    return true;
  }

  if (command === '/filters') {
    const banned = (values.telegramGroupHelpBannedWords || '')
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    await sendTemporaryGroupHelpMessage(
      chatId,
      banned.length
        ? `🚫 Active word filters (${banned.length}):\n\n${banned.map((w) => `• ${w}`).join('\n')}`
        : 'No word filters are active.',
      values
    );
    return true;
  }

  if (command === '/filter' || command === '/unfilter') {
    const word = parts.slice(1).join(' ').trim();
    if (!word) {
      await sendTemporaryGroupHelpMessage(chatId, `Usage: ${command} <word or phrase>`, values);
      return true;
    }
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    const current = (values.telegramGroupHelpBannedWords || '')
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    const normalized = word.toLowerCase();
    const without = current.filter((w) => w.toLowerCase() !== normalized);
    const updated = command === '/filter' ? [...without, word] : without;
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpBannedWords: updated.join('\n')
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      command === '/filter'
        ? `✅ Added "${word}" to word filters.`
        : without.length < current.length
          ? `✅ Removed "${word}" from word filters.`
          : `"${word}" was not in the filter list.`,
      values
    );
    return true;
  }

  if (command === '/lockdown') {
    const minutes = Math.max(1, Math.min(720, Number(parts[1]) || 30));
    const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: targetChatId }
    );
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatPermissions', {
      chat_id: targetChatId,
      permissions: { can_send_messages: false }
    });
    await startTelegramCommunityLockdown({
      chatId: targetChatId,
      minutes,
      originalPermissions: chat.permissions || { can_send_messages: true }
    });
    await sendTemporaryGroupHelpMessage(chatId, `🔒 Chat locked for ${minutes} minutes.`, values);
    await sendGroupHelpActivityLog(values, 'Chat locked', [
      `Group ID: ${targetChatId}`,
      `Duration: ${minutes} minutes`,
      `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
    ]);
    return true;
  }
  const policy = await prisma.telegramCommunityGroupPolicy.findUnique({
    where: { chatId: targetChatId }
  });
  const saved =
    policy && typeof policy.settings === 'object' && !Array.isArray(policy.settings)
      ? (policy.settings as Record<string, unknown>).__lockdownPermissions
      : null;
  const permissions = typeof saved === 'string' ? JSON.parse(saved) : { can_send_messages: true };
  await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatPermissions', {
    chat_id: targetChatId,
    permissions
  });
  await endTelegramCommunityLockdown(targetChatId);
  await sendTemporaryGroupHelpMessage(chatId, '🔓 Chat unlocked.', values);
  await sendGroupHelpActivityLog(values, 'Chat unlocked', [
    `Group ID: ${targetChatId}`,
    `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
  ]);
  return true;
}
