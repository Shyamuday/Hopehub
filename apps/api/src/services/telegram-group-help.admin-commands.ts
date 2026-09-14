import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  syncGroupHelpChatCommands
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
import { canManageGroupHelpPins } from './telegram-group-help.pin-rights.js';
import { resolveGroupHelpMember } from './telegram-group-help.member-resolution.js';
import {
  groupHelpWarnPolicySummary,
  parseGroupHelpWarnMode,
  parseGroupHelpWarnTime
} from './telegram-group-help.warning-policy.js';
import {
  disabledGroupHelpCommands,
  isGroupHelpCommandDisableable,
  normalizeGroupHelpCommandName
} from './telegram-group-help.command-disabling.js';
import {
  filterControlOptions,
  groupHelpFilterCommandSuggestions,
  groupHelpFilterMediaFromMessage,
  parseGroupHelpFilterCommand,
  parseGroupHelpFilters,
  serializeGroupHelpFilters
} from './telegram-group-help.filters.js';
import {
  configuredCleaningTypes,
  GROUP_HELP_CLEAN_COMMAND_TYPES,
  GROUP_HELP_CLEAN_MESSAGE_TYPES,
  GROUP_HELP_CLEAN_SERVICE_TYPES,
  updatedCleaningTypes
} from './telegram-group-help.cleaning.js';
import {
  normalizeGroupHelpNoteName,
  parseGroupHelpNotes,
  parseGroupHelpSaveCommand,
  serializeGroupHelpNotes
} from './telegram-group-help.notes.js';

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
      '/stop',
      '/stopall',
      '/filters',
      '/blockword',
      '/unblockword',
      '/blockwords',
      '/setwarnlimit',
      '/setwarnmode',
      '/setwarntime',
      '/warntime',
      '/reports',
      '/disable',
      '/enable',
      '/disabledel',
      '/disableadmin',
      '/cleancommand',
      '/keepcommand',
      '/cleanmsg',
      '/keepmsg',
      '/cleanservice',
      '/nocleanservice',
      '/save',
      '/clear',
      '/privatenotes'
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
  if (['/pin', '/unpin', '/unpinall'].includes(command)) {
    const membership = await callCommunityTelegramApi<{
      status?: string;
      user?: { username?: string };
    }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
      chat_id: targetChatId,
      user_id: message.from.id
    }).catch(() => null);
    if (
      !canManageGroupHelpPins({
        status: membership?.status,
        username: membership?.user?.username || message.from.username
      })
    ) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Only the group owner and @spiritualspirit can change pinned messages.',
        values
      );
      return true;
    }
  }
  if (
    ['/unpinall', '/promote', '/demote', '/unadmin', '/lockdown'].includes(command) &&
    (await requestGroupHelpCommandConfirmation({ message, targetChatId, command }))
  ) {
    return true;
  }
  if (command === '/save' || command === '/clear' || command === '/privatenotes') {
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    if (command === '/privatenotes') {
      const mode = parts[1]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) {
        await sendTemporaryGroupHelpMessage(chatId, 'Usage: /privatenotes <on|off>', values);
        return true;
      }
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramGroupHelpPrivateNotes: mode
      });
      await sendTemporaryGroupHelpMessage(
        chatId,
        `✅ Private notes ${mode === 'on' ? 'enabled' : 'disabled'}.`,
        values
      );
      return true;
    }
    const notes = parseGroupHelpNotes(values.telegramGroupHelpNotes);
    if (command === '/clear') {
      const name = normalizeGroupHelpNoteName(parts[1]);
      if (!name) {
        await sendTemporaryGroupHelpMessage(chatId, 'Usage: /clear <single_word>', values);
        return true;
      }
      const updated = notes.filter((note) => note.name !== name);
      if (updated.length === notes.length) {
        await sendTemporaryGroupHelpMessage(chatId, `No note named #${name} exists.`, values);
        return true;
      }
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramGroupHelpNotes: serializeGroupHelpNotes(updated)
      });
      await sendTemporaryGroupHelpMessage(chatId, `✅ Cleared note #${name}.`, values);
      return true;
    }
    const parsed = parseGroupHelpSaveCommand(message);
    const media = groupHelpFilterMediaFromMessage(message.reply_to_message);
    if (!parsed || (!parsed.text && !media)) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Usage: /save <single_word> <note>\nFor a media note, reply to the attachment with /save <single_word>.',
        values
      );
      return true;
    }
    if (/\{(?:repeat|repeated)\s+/i.test(message.text || '') && !parsed.repeatSeconds) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Invalid repeat time. Use 15m or longer, for example {repeat 6h}.',
        values
      );
      return true;
    }
    const note = { ...parsed, ...(media ? { media } : {}) };
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpNotes: serializeGroupHelpNotes([
        ...notes.filter((item) => item.name !== note.name),
        note
      ])
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ ${notes.some((item) => item.name === note.name) ? 'Updated' : 'Saved'} note #${note.name}.`,
      values
    );
    return true;
  }
  if (
    [
      '/cleancommand',
      '/keepcommand',
      '/cleanmsg',
      '/keepmsg',
      '/cleanservice',
      '/nocleanservice'
    ].includes(command)
  ) {
    const isCommand = command === '/cleancommand' || command === '/keepcommand';
    const isMessage = command === '/cleanmsg' || command === '/keepmsg';
    const allowed = isCommand
      ? GROUP_HELP_CLEAN_COMMAND_TYPES
      : isMessage
        ? GROUP_HELP_CLEAN_MESSAGE_TYPES
        : GROUP_HELP_CLEAN_SERVICE_TYPES;
    const key = isCommand
      ? 'telegramGroupHelpCleanCommandTypes'
      : isMessage
        ? 'telegramGroupHelpCleanMessageTypes'
        : 'telegramGroupHelpCleanServiceTypes';
    let requested = parts.slice(1).map((part) => part.toLowerCase());
    let enable = ['/cleancommand', '/cleanmsg', '/cleanservice'].includes(command);
    if (command === '/cleanservice' && ['on', 'off'].includes(requested[0] || '')) {
      enable = requested[0] === 'on';
      requested = ['all'];
    }
    const updated = updatedCleaningTypes({
      current: values[key],
      requested,
      allowed,
      enable,
      defaultToAll: isCommand || isMessage
    });
    if (!updated) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `Usage: ${command} <all|${allowed.join('|')}>`,
        values
      );
      return true;
    }
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      [key]: updated,
      ...(isCommand &&
      enable &&
      updated !== 'none' &&
      Number(values.telegramGroupHelpCommandDeleteSeconds || 3) <= 0
        ? { telegramGroupHelpCommandDeleteSeconds: '3' }
        : {})
    });
    const active = configuredCleaningTypes(updated, allowed);
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ ${isCommand ? 'Command' : isMessage ? 'Bot-message' : 'Service-message'} cleanup updated. Active: ${active.length ? active.join(', ') : 'none'}.`,
      values
    );
    return true;
  }
  if (['/disable', '/enable', '/disabledel', '/disableadmin'].includes(command)) {
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);

    if (command === '/disable' || command === '/enable') {
      const targetCommand = normalizeGroupHelpCommandName(parts[1]);
      if (!targetCommand || !isGroupHelpCommandDisableable(targetCommand)) {
        await sendTemporaryGroupHelpMessage(
          chatId,
          `Usage: ${command} <commandname>\nUse /disableable to see supported commands.`,
          values
        );
        return true;
      }
      const current = disabledGroupHelpCommands(values.telegramGroupHelpDisabledCommands);
      const updated =
        command === '/disable'
          ? [...new Set([...current, targetCommand])].sort()
          : current.filter((candidate) => candidate !== targetCommand);
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramGroupHelpDisabledCommands: updated.join('\n')
      });
      await sendTemporaryGroupHelpMessage(
        chatId,
        command === '/disable'
          ? `✅ ${targetCommand} disabled for non-admin users.`
          : `✅ ${targetCommand} enabled.`,
        values
      );
      return true;
    }

    const mode = parts[1]?.toLowerCase();
    if (!['on', 'off'].includes(mode)) {
      await sendTemporaryGroupHelpMessage(chatId, `Usage: ${command} <on|off>`, values);
      return true;
    }
    const key =
      command === '/disabledel'
        ? 'telegramGroupHelpDisabledDelete'
        : 'telegramGroupHelpDisableAdmin';
    await saveTelegramCommunityGroupPolicy(targetChatId, { ...policy, [key]: mode });
    await sendTemporaryGroupHelpMessage(
      chatId,
      command === '/disabledel'
        ? `✅ Deleting disabled commands is ${mode.toUpperCase()}.`
        : `✅ Disabled commands now ${mode === 'on' ? 'also apply to admins' : 'allow admins to bypass them'}.`,
      values
    );
    return true;
  }
  if (['/setwarnlimit', '/setwarnmode', '/setwarntime', '/warntime'].includes(command)) {
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);

    if (command === '/setwarnlimit') {
      const limit = Number(parts[1]);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        await sendTemporaryGroupHelpMessage(chatId, 'Usage: /setwarnlimit <1-100>', values);
        return true;
      }
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramGroupHelpWarnLimit: String(limit)
      });
      await sendTemporaryGroupHelpMessage(chatId, `✅ Warning limit set to ${limit}.`, values);
      return true;
    }

    if (command === '/setwarnmode') {
      const mode = parseGroupHelpWarnMode(parts.slice(1).join(' '));
      if (!mode) {
        await sendTemporaryGroupHelpMessage(
          chatId,
          'Usage: /setwarnmode <kick|ban|mute|tban TIME|tmute TIME>\nExample: /setwarnmode tmute 1w',
          values
        );
        return true;
      }
      await saveTelegramCommunityGroupPolicy(targetChatId, {
        ...policy,
        telegramGroupHelpWarnAction: mode.value
      });
      await sendTemporaryGroupHelpMessage(
        chatId,
        `✅ Warning-limit action set to ${mode.value}.`,
        values
      );
      return true;
    }

    const rawTime = parts[1];
    if (!rawTime && command === '/warntime') {
      const summary = groupHelpWarnPolicySummary(values);
      await sendTemporaryGroupHelpMessage(
        chatId,
        `Warning expiry is ${summary.expiry.value}.`,
        values
      );
      return true;
    }
    const warningTime = parseGroupHelpWarnTime(rawTime);
    if (!warningTime) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `Usage: ${command} <Xm|Xh|Xd|Xw|off>\nExample: ${command} 12w`,
        values
      );
      return true;
    }
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpWarnTime: warningTime.value
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      warningTime.value === 'off'
        ? '✅ Warning expiry disabled.'
        : `✅ Warnings will expire after ${warningTime.value}.`,
      values
    );
    return true;
  }
  if (command === '/reports') {
    const mode = parts[1]?.toLowerCase();
    if (!mode) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `User reports are ${values.telegramGroupHelpReportsMode === 'off' ? 'OFF' : 'ON'}.\nUse /reports on or /reports off.`,
        values
      );
      return true;
    }
    if (!['on', 'off'].includes(mode)) {
      await sendTemporaryGroupHelpMessage(chatId, 'Usage: /reports <on|off>', values);
      return true;
    }
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpReportsMode: mode === 'on' ? 'admins' : 'off'
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ User reports ${mode === 'on' ? 'enabled' : 'disabled'}.`,
      values
    );
    return true;
  }
  if (command === '/settings') {
    await sendTemporaryGroupHelpMessage(
      chatId,
      '⚙️ *Hope Hub group settings*\n\nOpen the editor privately. Your access is checked against this group before every change.',
      { ...values, telegramGroupHelpAutoDeleteSeconds: '60' },
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
    const replyTarget = message.reply_to_message?.from;
    const target = replyTarget || (await resolveGroupHelpMember(targetChatId, parts[1] || ''));
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member, or use /promote <user_id or @username> [title].',
        values
      );
      return true;
    }
    const title =
      parts
        .slice(replyTarget ? 1 : 2)
        .join(' ')
        .trim() || '';
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'promoteChatMember', {
      chat_id: targetChatId,
      user_id: target.id,
      can_manage_chat: true,
      can_delete_messages: true,
      can_restrict_members: true,
      can_invite_users: true,
      can_pin_messages: canManageGroupHelpPins({
        status: 'administrator',
        username: target.username
      }),
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
      (await resolveGroupHelpMember(targetChatId, parts[1] || ''));
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member, or use /unadmin <user_id or @username>.',
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
    const replyTarget = message.reply_to_message?.from;
    const target = replyTarget || (await resolveGroupHelpMember(targetChatId, parts[1] || ''));
    const title = parts
      .slice(replyTarget ? 1 : 2)
      .join(' ')
      .trim();
    if (!target || !title) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to an admin and use /title <title text>, or use /title <user_id or @username> <title text>.',
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
      (await resolveGroupHelpMember(targetChatId, parts[1] || ''));
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to an admin, or use /untitle <user_id or @username>.',
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
    const { filters } = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '');
    const labels = filters.flatMap((filter) =>
      filter.triggers.map((trigger) =>
        [trigger.mode === 'contains' ? '' : `${trigger.mode}:`, trigger.value].join('')
      )
    );
    await sendTemporaryGroupHelpMessage(
      chatId,
      labels.length
        ? `Active reply filters (${labels.length}):\n\n${labels.map((label) => `• ${label}`).join('\n')}`
        : 'No reply filters are active.',
      values
    );
    return true;
  }

  if (command === '/filter') {
    const parsed = parseGroupHelpFilterCommand(message.text || '');
    const media = groupHelpFilterMediaFromMessage(message.reply_to_message);
    if (!parsed || (!parsed.response && !media)) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Usage: /filter <word|"phrase"|(one, two)> <reply>\nFor media replies, reply to the photo, sticker, or file with /filter <trigger>.',
        values
      );
      return true;
    }
    const controls = filterControlOptions(parsed.response);
    const current = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '');
    const keys = new Set(
      parsed.triggers.map((trigger) => `${trigger.mode}:${trigger.value.toLocaleLowerCase()}`)
    );
    const filters = current.filters
      .map((filter) => ({
        ...filter,
        triggers: filter.triggers.filter(
          (trigger) => !keys.has(`${trigger.mode}:${trigger.value.toLocaleLowerCase()}`)
        )
      }))
      .filter((filter) => filter.triggers.length);
    filters.push({
      triggers: parsed.triggers,
      ...(controls.text ? { text: controls.text } : {}),
      ...(media ? { media } : {}),
      audience: controls.audience,
      allowBots: controls.allowBots,
      ...(controls.commandDescription ? { commandDescription: controls.commandDescription } : {})
    });
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    const serialized = serializeGroupHelpFilters(filters, current.passthrough);
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpCustomReplies: serialized
    });
    await syncGroupHelpChatCommands(
      targetChatId,
      groupHelpFilterCommandSuggestions(serialized)
    ).catch(() => null);
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ Saved ${parsed.triggers.length} reply filter${parsed.triggers.length === 1 ? '' : 's'}.`,
      values
    );
    return true;
  }

  if (command === '/stop' || command === '/unfilter') {
    const parsed = parseGroupHelpFilterCommand(
      `/filter ${(message.text || '').trim().replace(/^\/(?:stop|unfilter)(?:@\w+)?\s*/i, '')}`
    );
    if (!parsed?.triggers.length) {
      await sendTemporaryGroupHelpMessage(chatId, `Usage: ${command} <word or "phrase">`, values);
      return true;
    }
    const keys = new Set(
      parsed.triggers.map((trigger) => `${trigger.mode}:${trigger.value.toLocaleLowerCase()}`)
    );
    const current = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '');
    let removed = 0;
    const filters = current.filters
      .map((filter) => ({
        ...filter,
        triggers: filter.triggers.filter((trigger) => {
          const remove = keys.has(`${trigger.mode}:${trigger.value.toLocaleLowerCase()}`);
          if (remove) removed += 1;
          return !remove;
        })
      }))
      .filter((filter) => filter.triggers.length);
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    const serialized = serializeGroupHelpFilters(filters, current.passthrough);
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpCustomReplies: serialized
    });
    await syncGroupHelpChatCommands(
      targetChatId,
      groupHelpFilterCommandSuggestions(serialized)
    ).catch(() => null);
    await sendTemporaryGroupHelpMessage(
      chatId,
      removed
        ? `✅ Removed ${removed} reply filter${removed === 1 ? '' : 's'}.`
        : 'No matching reply filter was found.',
      values
    );
    return true;
  }

  if (command === '/stopall') {
    const membership = await callCommunityTelegramApi<{ status?: string }>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: targetChatId, user_id: message.from.id }
    ).catch(() => null);
    if (!['creator', 'owner'].includes(membership?.status || '')) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Only the Telegram group owner can remove all reply filters.',
        values
      );
      return true;
    }
    if (await requestGroupHelpCommandConfirmation({ message, targetChatId, command })) return true;
    const current = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '');
    const { saveTelegramCommunityGroupPolicy, getTelegramCommunityGroupPolicy } =
      await import('./telegram-community-group-policy.js');
    const policy = await getTelegramCommunityGroupPolicy(targetChatId);
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpCustomReplies: current.passthrough.join('\n')
    });
    await syncGroupHelpChatCommands(targetChatId, []).catch(() => null);
    await sendTemporaryGroupHelpMessage(chatId, '✅ All reply filters removed.', values);
    return true;
  }

  if (command === '/blockwords') {
    const banned = (values.telegramGroupHelpBannedWords || '')
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    await sendTemporaryGroupHelpMessage(
      chatId,
      banned.length
        ? `🚫 Active blocked words (${banned.length}):\n\n${banned.map((w) => `• ${w}`).join('\n')}`
        : 'No blocked words are active.',
      values
    );
    return true;
  }

  if (command === '/blockword' || command === '/unblockword') {
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
    const updated = command === '/blockword' ? [...without, word] : without;
    await saveTelegramCommunityGroupPolicy(targetChatId, {
      ...policy,
      telegramGroupHelpBannedWords: updated.join('\n')
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      command === '/blockword'
        ? `✅ Added "${word}" to blocked words.`
        : without.length < current.length
          ? `✅ Removed "${word}" from blocked words.`
          : `"${word}" was not in the blocked-word list.`,
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
