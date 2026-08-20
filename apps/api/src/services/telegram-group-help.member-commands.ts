import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  clearTelegramGroupWarnings,
  telegramGroupWarningCount,
  telegramGroupWarningDetails
} from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  assignedCommunityRole,
  canUseGroupHelpCommand,
  isModerationExempt,
  sendGroupHelpPermissionDenied
} from './telegram-group-help.permissions.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import { forgetGroupHelpMemberData } from './telegram-group-help.privacy.js';
import { forgetAllGroupHelpMemberData } from './telegram-group-help.privacy.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import { groupHelpMainMenuKeyboard } from './telegram-group-help.menu.js';
import {
  messageForGroupHelpTarget,
  resolveGroupHelpCommandContext
} from './telegram-group-help.command-context.js';
import {
  identityHistoryDisplayName,
  observeTelegramCommunityMember
} from './telegram-community-member-identity.js';

type TelegramMemberSnapshot = {
  status?: string;
  user?: { id: number; first_name?: string; last_name?: string; username?: string };
  until_date?: number;
  can_send_messages?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_video_chats?: boolean;
};

function telegramMemberStatusLabel(member: TelegramMemberSnapshot) {
  const status = member.status || 'unknown';
  if (status === 'creator' || status === 'owner') return 'Group owner';
  if (status === 'administrator') return 'Administrator';
  if (status === 'restricted') {
    const until = member.until_date
      ? new Date(member.until_date * 1000).toLocaleString('en-IN')
      : '';
    return `Restricted${until ? ` until ${until}` : ''}`;
  }
  if (status === 'kicked') return 'Banned';
  if (status === 'left') return 'Left the group';
  return 'Member';
}

function administratorPermissions(member: TelegramMemberSnapshot): string[] {
  if (
    member.status !== 'administrator' &&
    member.status !== 'creator' &&
    member.status !== 'owner'
  ) {
    return [];
  }
  if (member.status === 'creator' || member.status === 'owner') return ['Full owner access'];
  const permissions: Array<[keyof TelegramMemberSnapshot, string]> = [
    ['can_manage_chat', 'Manage chat'],
    ['can_delete_messages', 'Delete messages'],
    ['can_restrict_members', 'Restrict members'],
    ['can_promote_members', 'Promote members'],
    ['can_invite_users', 'Invite members'],
    ['can_pin_messages', 'Pin messages'],
    ['can_manage_video_chats', 'Manage voice chats']
  ];
  return permissions.filter(([key]) => member[key] === true).map(([, label]) => label);
}

export async function handleGroupHelpMemberCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const rawCommand = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const privateResult = rawCommand.startsWith('/*');
  const command = privateResult ? `/${rawCommand.slice(2)}` : rawCommand;
  const chatId = String(message.chat.id);
  const context = await resolveGroupHelpCommandContext(message);
  const targetChatId = context.targetChatId;
  const permissionMessage = messageForGroupHelpTarget(message, targetChatId);
  const commandParts = (message.text || '').trim().split(/\s+/);
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
    const member = await callCommunityTelegramApi<TelegramMemberSnapshot>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: targetChatId, user_id: targetId }
    ).catch(() => null);
    return member?.user;
  };
  const deliverStaffResult = async (text: string) => {
    if (privateResult && message.from) {
      try {
        await sendCommunityMessage(GROUP_HELP_BOT_SLUG, String(message.from.id), text);
        await sendTemporaryGroupHelpMessage(chatId, 'Sent privately.', values, {
          reply_to_message_id: message.message_id,
          message_thread_id: message.message_thread_id
        });
        return;
      } catch {
        await sendTemporaryGroupHelpMessage(
          chatId,
          'Please start this bot in private chat first, then try again.',
          values,
          { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
        );
        return;
      }
    }
    await sendTemporaryGroupHelpMessage(chatId, text, values, {
      reply_to_message_id: message.message_id,
      message_thread_id: message.message_thread_id
    });
  };
  if (command === '/start') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      'Welcome to Hope Hub 💙\n\nChoose what you need. You can still use commands whenever that feels easier.',
      {
        reply_markup: groupHelpMainMenuKeyboard(
          ['group', 'supergroup'].includes(message.chat.type || '') ? chatId : undefined
        ),
        message_thread_id: message.message_thread_id
      }
    );
    return true;
  }
  if (command === '/forget' || command === '/forgot') {
    if (!message.from) return true;
    if (!['group', 'supergroup'].includes(message.chat.type || '')) {
      await forgetAllGroupHelpMemberData(String(message.from.id));
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Your retained Hope Hub Group Help data has been removed from all communities. Telegram message history is managed by Telegram and each group’s administrators.',
        values
      );
      return true;
    }
    await forgetGroupHelpMemberData(targetChatId, String(message.from.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      'Your Hope Hub bot data for this group has been removed. Telegram message history is managed by Telegram and the group administrators.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if ((command === '/admin' || command === '/alertadmin') && message.from) {
    await sendGroupHelpActivityLog(values, 'Member requested administrator support', [
      `Group ID: ${targetChatId}`,
      `Member: ${message.from.first_name || 'Telegram member'} (${message.from.id})`
    ]);
    await sendTemporaryGroupHelpMessage(
      chatId,
      'An administrator has been alerted. If someone is at immediate risk, please contact local emergency services now.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/rules') {
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, values.telegramGroupHelpRulesMessage, {
      message_thread_id: message.message_thread_id
    });
    return true;
  }
  if (command === '/support') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      values.telegramGroupHelpSupportMessage,
      { message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/warnings' && message.from) {
    const target =
      message.reply_to_message?.from &&
      (await canUseGroupHelpCommand(permissionMessage, values, '/warnings', 'HELPER'))
        ? message.reply_to_message.from
        : message.from;
    const count = await telegramGroupWarningCount(targetChatId, String(target.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      `${target.id === message.from.id ? 'You currently have' : `${target.first_name || 'This member'} has`} ${count} warning${count === 1 ? '' : 's'}.`,
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/perms') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/perms', 'HELPER'))) {
      await sendGroupHelpPermissionDenied(message, 'HELPER', chatId, values);
      return true;
    }
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(commandParts[1] || '') : undefined);
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /perms <user_id or @username> from this private admin group.'
          : 'Reply to a member’s message, then use /perms.',
        values
      );
      return true;
    }
    const targetMessage = { ...message, from: target };
    const role = await assignedCommunityRole(targetChatId, String(target.id));
    const customAssignment = await prisma.telegramCommunityRoleAssignment.findFirst({
      where: {
        chatId: targetChatId,
        telegramUserId: String(target.id),
        customRoleId: { not: null }
      },
      include: { customRole: { select: { name: true } } }
    });
    const telegramAdmin = await isModerationExempt(
      messageForGroupHelpTarget(targetMessage, targetChatId),
      values.telegramGroupHelpAdminWhitelist || ''
    );
    const permissions =
      (values.telegramGroupHelpCommandPermissions || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n') || 'Default command roles are in use.';
    const commandAccess = [
      ['/warn', 'HELPER'],
      ['/delete', 'HELPER'],
      ['/unwarn', 'HELPER'],
      ['/info', 'HELPER'],
      ['/perms', 'HELPER'],
      ['/geturl', 'HELPER'],
      ['/mute', 'MODERATOR'],
      ['/unmute', 'MODERATOR'],
      ['/ban', 'MODERATOR'],
      ['/unban', 'MODERATOR'],
      ['/kick', 'MODERATOR'],
      ['/stats', 'MODERATOR'],
      ['/clearwarnings', 'MODERATOR']
    ] as const;
    const effective = (
      await Promise.all(
        commandAccess.map(async ([candidate, fallback]) =>
          (await canUseGroupHelpCommand(
            messageForGroupHelpTarget(targetMessage, targetChatId),
            values,
            candidate,
            fallback
          ))
            ? candidate
            : null
        )
      )
    ).filter(Boolean);
    await deliverStaffResult(
      [
        `Permissions for ${target.first_name || 'member'}`,
        `Telegram administrator: ${telegramAdmin ? 'yes' : 'no'}`,
        `Hope Hub role: ${customAssignment?.customRole?.name || (role ? role.toLowerCase() : 'member')}`,
        `Effective staff commands: ${effective.length ? effective.join(', ') : 'none'}`,
        '',
        'Command access policy:',
        permissions
      ].join('\n')
    );
    return true;
  }
  if (command === '/geturl') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/geturl', 'HELPER'))) {
      await sendGroupHelpPermissionDenied(message, 'HELPER', chatId, values);
      return true;
    }
    const targetMessage = message.reply_to_message;
    const explicitMessageId = context.isControlGroup ? Number(commandParts[1] || 0) : 0;
    const targetMessageId = targetMessage?.message_id || explicitMessageId;
    if (!Number.isInteger(targetMessageId) || targetMessageId <= 0) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /geturl <main_group_message_id> from this private admin group.'
          : 'Reply to a message, then use /geturl.',
        values
      );
      return true;
    }
    const chat = await callCommunityTelegramApi<{ username?: string }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: targetChatId }
    ).catch(() => null);
    const link = chat?.username
      ? `https://t.me/${chat.username}/${targetMessageId}`
      : targetChatId.startsWith('-100')
        ? `https://t.me/c/${targetChatId.slice(4)}/${targetMessageId}`
        : '';
    await sendTemporaryGroupHelpMessage(
      chatId,
      link ? `Message link:\n${link}` : 'Telegram could not create a direct link for this chat.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/info' || command === '/history' || command === '/member' || command === '/me') {
    if (
      command !== '/me' &&
      !(await canUseGroupHelpCommand(permissionMessage, values, command, 'HELPER'))
    ) {
      await sendGroupHelpPermissionDenied(message, 'HELPER', chatId, values);
      return true;
    }
    const targetArgument = (message.text || '').trim().split(/\s+/)[1] || '';
    const replyTarget = message.reply_to_message?.from;
    let targetId =
      command === '/me'
        ? message.from?.id || 0
        : replyTarget?.id || (/^\d+$/.test(targetArgument) ? Number(targetArgument) : 0);
    if (!targetId && targetArgument.startsWith('@')) {
      const known = await prisma.telegramCommunityMember.findFirst({
        where: {
          chatId: targetChatId,
          username: { equals: targetArgument.slice(1), mode: 'insensitive' }
        },
        select: { telegramUserId: true }
      });
      targetId = Number(known?.telegramUserId || 0);
    }
    if (!targetId) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to or forward a member’s message, or use /history followed by their Telegram numeric ID.',
        values
      );
      return true;
    }
    const telegramMember = await callCommunityTelegramApi<TelegramMemberSnapshot>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: targetChatId, user_id: targetId }
    ).catch(() => null);
    if (!telegramMember?.user) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'I could not find that member in this group.',
        values,
        { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
      );
      return true;
    }
    const target = telegramMember.user;
    await observeTelegramCommunityMember({
      chatId: targetChatId,
      member: target,
      source: 'INFO_LOOKUP'
    });
    const [
      member,
      role,
      warnings,
      openCases,
      identityHistory,
      nameChangeCount,
      usernameChangeCount
    ] = await Promise.all([
      prisma.telegramCommunityMember.findUnique({
        where: {
          chatId_telegramUserId: { chatId: targetChatId, telegramUserId: String(target.id) }
        }
      }),
      assignedCommunityRole(targetChatId, String(target.id)),
      telegramGroupWarningDetails(targetChatId, String(target.id)),
      prisma.telegramCommunityModerationCase.count({
        where: { chatId: targetChatId, targetUserId: String(target.id), status: 'OPEN' }
      }),
      prisma.telegramCommunityMemberIdentityHistory.findMany({
        where: { chatId: targetChatId, telegramUserId: String(target.id) },
        orderBy: { observedAt: 'desc' },
        take: 25
      }),
      prisma.telegramCommunityMemberIdentityHistory.count({
        where: {
          chatId: targetChatId,
          telegramUserId: String(target.id),
          changedFields: { has: 'name' }
        }
      }),
      prisma.telegramCommunityMemberIdentityHistory.count({
        where: {
          chatId: targetChatId,
          telegramUserId: String(target.id),
          changedFields: { has: 'username' }
        }
      })
    ]);
    const fullName =
      [target.first_name, target.last_name].filter(Boolean).join(' ') || 'Telegram member';
    const warningLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
    const adminPermissions = administratorPermissions(telegramMember);
    const previousNames = [
      ...new Set(
        identityHistory
          .filter((entry) => entry.changedFields.includes('name'))
          .map((entry) =>
            identityHistoryDisplayName({
              firstName: entry.previousFirstName,
              lastName: entry.previousLastName,
              username: entry.previousUsername,
              displayName: entry.previousDisplayName
            })
          )
          .filter((name) => name !== fullName)
      )
    ].slice(0, 8);
    const previousUsernames = [
      ...new Set(
        identityHistory
          .filter((entry) => entry.changedFields.includes('username'))
          .map((entry) => (entry.previousUsername ? `@${entry.previousUsername}` : 'no username'))
          .filter(
            (username) => username !== (target.username ? `@${target.username}` : 'no username')
          )
      )
    ].slice(0, 8);
    const details = [
      'Member details',
      '',
      `Name: ${fullName}`,
      `ID: ${target.id}`,
      target.username ? `Username: @${target.username}` : 'Username: not set',
      `Telegram status: ${telegramMemberStatusLabel(telegramMember)}`,
      `Hope Hub role: ${role ? role.toLowerCase() : 'member'}`,
      `Warnings: ${warnings.count}/${warningLimit}`,
      warnings.reasons.length ? `Recent warning reasons: ${warnings.reasons.join(' · ')}` : '',
      `Open safety/moderation cases: ${openCases}`,
      `Joined: ${member?.joinedAt ? member.joinedAt.toLocaleDateString('en-IN') : 'not recorded'}`,
      `Name changes observed: ${nameChangeCount}`,
      previousNames.length ? `Previous names: ${previousNames.join(' · ')}` : '',
      `Username changes observed: ${usernameChangeCount}`,
      previousUsernames.length ? `Previous usernames: ${previousUsernames.join(' · ')}` : '',
      adminPermissions.length ? `Admin permissions: ${adminPermissions.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    await deliverStaffResult(details);
    return true;
  }
  if (command === '/clearwarnings') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/clearwarnings', 'MODERATOR'))) {
      await sendGroupHelpPermissionDenied(message, 'MODERATOR', chatId, values);
      return true;
    }
    const target =
      message.reply_to_message?.from ||
      (context.isControlGroup ? await resolveMainGroupMember(commandParts[1] || '') : undefined);
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        context.isControlGroup
          ? 'Use /clearwarnings <user_id or @username> from this private admin group.'
          : 'Reply to a member’s message, then use /clearwarnings.',
        values
      );
      return true;
    }
    await clearTelegramGroupWarnings(targetChatId, String(target.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ Cleared warnings for ${target.first_name || 'this member'}.`,
      values
    );
    return true;
  }
  if (command === '/id' || command === '/staffid') {
    const target = message.reply_to_message?.from || message.from;
    if (!target) return true;
    const isStaff = await canUseGroupHelpCommand(permissionMessage, values, '/id', 'HELPER');
    const lines = [`Your Telegram ID: ${message.from?.id || 'unknown'}`];
    if (
      isStaff &&
      message.reply_to_message?.from &&
      message.reply_to_message.from.id !== message.from?.id
    ) {
      const replied = message.reply_to_message.from;
      lines.push(`Replied member ID: ${replied.id}`);
      if (replied.username) lines.push(`Username: @${replied.username}`);
    }
    lines.push(`Target group ID: ${targetChatId}`);
    await deliverStaffResult(lines.join('\n'));
    return true;
  }

  if (command === '/adminlist') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/adminlist', 'HELPER'))) {
      await sendGroupHelpPermissionDenied(message, 'HELPER', chatId, values);
      return true;
    }
    const admins = await callCommunityTelegramApi<
      Array<{
        status?: string;
        user?: { id: number; first_name?: string; username?: string; is_bot?: boolean };
        custom_title?: string;
      }>
    >(GROUP_HELP_BOT_SLUG, 'getChatAdministrators', { chat_id: targetChatId }).catch(() => []);
    const lines = admins
      .filter((admin) => !admin.user?.is_bot)
      .map((admin) => {
        const name = admin.user?.first_name || 'Admin';
        const username = admin.user?.username ? ` (@${admin.user.username})` : '';
        const title = admin.custom_title ? ` · ${admin.custom_title}` : '';
        const owner = admin.status === 'creator' ? ' 👑' : '';
        return `• ${name}${username}${title}${owner}`;
      });
    await deliverStaffResult(
      lines.length ? `👮 Group admins\n\n${lines.join('\n')}` : 'No admins found.'
    );
    return true;
  }

  if (command === '/stats') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/stats', 'MODERATOR'))) {
      await sendGroupHelpPermissionDenied(message, 'MODERATOR', chatId, values);
      return true;
    }
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeMembers, joinedThisWeek, openReports, staff] = await Promise.all([
      prisma.telegramCommunityMember.count({ where: { chatId: targetChatId, leftAt: null } }),
      prisma.telegramCommunityMember.count({
        where: { chatId: targetChatId, joinedAt: { gte: since }, leftAt: null }
      }),
      prisma.telegramCommunityModerationCase.count({
        where: { chatId: targetChatId, status: 'OPEN' }
      }),
      prisma.telegramCommunityRoleAssignment.count({ where: { chatId: targetChatId } })
    ]);
    await deliverStaffResult(
      `📊 Group snapshot\n\nActive members tracked: ${activeMembers}\nJoined this week: ${joinedThisWeek}\nOpen reports: ${openReports}\nCustom staff roles: ${staff}`
    );
    return true;
  }
  if (command === '/staff') {
    if (!(await canUseGroupHelpCommand(permissionMessage, values, '/staff', 'HELPER'))) {
      await sendGroupHelpPermissionDenied(message, 'HELPER', chatId, values);
      return true;
    }
    const staff = await prisma.telegramCommunityRoleAssignment.findMany({
      where: { chatId: targetChatId },
      select: { telegramUserId: true, role: true, customRole: { select: { name: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
    const members = staff.length
      ? await prisma.telegramCommunityMember.findMany({
          where: {
            chatId: targetChatId,
            telegramUserId: { in: staff.map((member) => member.telegramUserId) }
          },
          select: { telegramUserId: true, firstName: true, lastName: true, username: true }
        })
      : [];
    const memberByTelegramId = new Map(members.map((member) => [member.telegramUserId, member]));
    await deliverStaffResult(
      staff.length
        ? `🛡 Community team\n\n${staff
            .map((member) => {
              const person = memberByTelegramId.get(member.telegramUserId);
              const name =
                [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
                'Telegram member';
              const identity = person?.username ? `${name} (@${person.username})` : name;
              const roleName =
                member.customRole?.name || (member.role === 'MODERATOR' ? 'Moderator' : 'Helper');
              return `• ${roleName} · ${identity}`;
            })
            .join('\n')}`
        : 'There are no custom Helper or Moderator roles in this group yet.'
    );
    return true;
  }
  if (command === '/help') {
    const canUseStaffTools = await canUseGroupHelpCommand(
      permissionMessage,
      values,
      '/warn',
      'HELPER'
    );
    const canUseModTools = await canUseGroupHelpCommand(
      permissionMessage,
      values,
      '/mute',
      'MODERATOR'
    );
    const canUseAdminTools = await isModerationExempt(
      permissionMessage,
      values.telegramGroupHelpAdminWhitelist || ''
    );
    const muteMinutes = values.telegramGroupHelpMuteMinutes || '60';
    const helpSections = [
      `*Hope Hub bot help*\n\n*Member commands*\n/rules — community rules\n/support — private support\n/warnings — your warning count\n/me — your group profile\n/id — Telegram and target-group IDs\n/report — report a replied message\n/admin or /alertadmin — alert the community team\n/forget — delete retained Group Help data`,
      canUseStaffTools
        ? `*Helper tools*\nIn the main group, reply to a message:\n/warn [reason], /unwarn, /delete [reason], /delwarn [reason]\n/info, /history, /perms, /geturl, /clearwarnings\n/adminlist, /staff, /stats`
        : '',
      canUseModTools
        ? `*Moderator tools*\n/mute [reason] — mute for ${muteMinutes} minutes\n/unmute, /ro, /unro, /ban, /unban, /kick\n/delmute, /delban, /delkick — delete plus member action`
        : '',
      canUseAdminTools
        ? `*Administrator tools*\n/promote, /unadmin, /title, /untitle\n/helper, /unhelper, /mod, /unmod\n/pin [notify], /unpin, /unpinall, /pinned\n/filter, /unfilter, /filters\n/welcome on|off, /lockdown [minutes], /unlock\n/settings, /setlog, /settestgroup`
        : '',
      context.isControlGroup && canUseStaffTools
        ? `*Private admin-group syntax*\n/info or /history <user_id or @username>\nForward a member message directly to the bot for /history\n/perms <user_id or @username>\n/warn|mute|ban <user_id or @username> [reason]\n/delete <main_message_id> [reason]\n/delwarn|delmute|delban <user> <main_message_id> [reason]\n/geturl <main_message_id>\n/clearwarnings <user_id or @username>`
        : '',
      context.isControlGroup && canUseAdminTools
        ? `*Private admin-group administration*\n/promote <user> [title]\n/unadmin <user>\n/title <user> <title>, /untitle <user>\n/helper|mod <user>, /unhelper|unmod <user>\n/pin <main_message_id> [notify]\nAll policy commands above apply to the configured main group.`
        : '',
      'For sensitive staff results, run the command in the configured private admin group.'
    ]
      .filter(Boolean)
      .join('\n\n');
    await sendTemporaryGroupHelpMessage(chatId, helpSections, values, {
      message_thread_id: message.message_thread_id,
      parse_mode: 'Markdown'
    });
    return true;
  }
  return false;
}
