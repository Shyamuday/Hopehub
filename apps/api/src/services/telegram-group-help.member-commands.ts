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
  isModerationExempt
} from './telegram-group-help.permissions.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import { forgetGroupHelpMemberData } from './telegram-group-help.privacy.js';
import { forgetAllGroupHelpMemberData } from './telegram-group-help.privacy.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import { groupHelpMainMenuKeyboard } from './telegram-group-help.menu.js';

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
  if (command === '/forget' && message.from) {
    if (!['group', 'supergroup'].includes(message.chat.type || '')) {
      await forgetAllGroupHelpMemberData(String(message.from.id));
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Your retained Hope Hub Group Help data has been removed from all communities. Telegram message history is managed by Telegram and each group’s administrators.',
        values
      );
      return true;
    }
    await forgetGroupHelpMemberData(chatId, String(message.from.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      'Your Hope Hub bot data for this group has been removed. Telegram message history is managed by Telegram and the group administrators.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/admin' && message.from) {
    await sendGroupHelpActivityLog(values, 'Member requested administrator support', [
      `Group: ${message.chat.title || chatId}`,
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
      (await canUseGroupHelpCommand(message, values, '/warnings', 'HELPER'))
        ? message.reply_to_message.from
        : message.from;
    const count = await telegramGroupWarningCount(chatId, String(target.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      `${target.id === message.from.id ? 'You currently have' : `${target.first_name || 'This member'} has`} ${count} warning${count === 1 ? '' : 's'}.`,
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/perms') {
    if (!(await canUseGroupHelpCommand(message, values, '/perms', 'HELPER'))) return true;
    const target = message.reply_to_message?.from;
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member’s message, then use /perms.',
        values
      );
      return true;
    }
    const targetMessage = { ...message, from: target };
    const role = await assignedCommunityRole(chatId, String(target.id));
    const customAssignment = await prisma.telegramCommunityRoleAssignment.findFirst({
      where: { chatId, telegramUserId: String(target.id), customRoleId: { not: null } },
      include: { customRole: { select: { name: true } } }
    });
    const telegramAdmin = await isModerationExempt(
      targetMessage,
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
          (await canUseGroupHelpCommand(targetMessage, values, candidate, fallback))
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
    if (!(await canUseGroupHelpCommand(message, values, '/geturl', 'HELPER'))) return true;
    const targetMessage = message.reply_to_message;
    if (!targetMessage) {
      await sendTemporaryGroupHelpMessage(chatId, 'Reply to a message, then use /geturl.', values);
      return true;
    }
    const chat = await callCommunityTelegramApi<{ username?: string }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: chatId }
    ).catch(() => null);
    const link = chat?.username
      ? `https://t.me/${chat.username}/${targetMessage.message_id}`
      : chatId.startsWith('-100')
        ? `https://t.me/c/${chatId.slice(4)}/${targetMessage.message_id}`
        : '';
    await sendTemporaryGroupHelpMessage(
      chatId,
      link ? `Message link:\n${link}` : 'Telegram could not create a direct link for this chat.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/info' || command === '/member' || command === '/me') {
    if (command !== '/me' && !(await canUseGroupHelpCommand(message, values, command, 'HELPER')))
      return true;
    const targetArgument = (message.text || '').trim().split(/\s+/)[1] || '';
    const replyTarget = message.reply_to_message?.from;
    let targetId =
      command === '/me'
        ? message.from?.id || 0
        : replyTarget?.id || (/^\d+$/.test(targetArgument) ? Number(targetArgument) : 0);
    if (!targetId && targetArgument.startsWith('@')) {
      const known = await prisma.telegramCommunityMember.findFirst({
        where: { chatId, username: targetArgument.slice(1) },
        select: { telegramUserId: true }
      });
      targetId = Number(known?.telegramUserId || 0);
    }
    if (!targetId) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member’s message, or use /info followed by their Telegram numeric ID.',
        values
      );
      return true;
    }
    const telegramMember = await callCommunityTelegramApi<TelegramMemberSnapshot>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: chatId, user_id: targetId }
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
    const [member, role, warnings, openCases] = await Promise.all([
      prisma.telegramCommunityMember.findUnique({
        where: { chatId_telegramUserId: { chatId, telegramUserId: String(target.id) } }
      }),
      assignedCommunityRole(chatId, String(target.id)),
      telegramGroupWarningDetails(chatId, String(target.id)),
      prisma.telegramCommunityModerationCase.count({
        where: { chatId, targetUserId: String(target.id), status: 'OPEN' }
      })
    ]);
    const fullName =
      [target.first_name, target.last_name].filter(Boolean).join(' ') || 'Telegram member';
    const warningLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
    const adminPermissions = administratorPermissions(telegramMember);
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
      adminPermissions.length ? `Admin permissions: ${adminPermissions.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    await deliverStaffResult(details);
    return true;
  }
  if (command === '/clearwarnings') {
    if (!(await canUseGroupHelpCommand(message, values, '/clearwarnings', 'MODERATOR')))
      return true;
    const target = message.reply_to_message?.from;
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member’s message, then use /clearwarnings.',
        values
      );
      return true;
    }
    await clearTelegramGroupWarnings(chatId, String(target.id));
    await sendTemporaryGroupHelpMessage(
      chatId,
      `✅ Cleared warnings for ${target.first_name || 'this member'}.`,
      values
    );
    return true;
  }
  if (command === '/stats') {
    if (!(await canUseGroupHelpCommand(message, values, '/stats', 'MODERATOR'))) return true;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeMembers, joinedThisWeek, openReports, staff] = await Promise.all([
      prisma.telegramCommunityMember.count({ where: { chatId, leftAt: null } }),
      prisma.telegramCommunityMember.count({
        where: { chatId, joinedAt: { gte: since }, leftAt: null }
      }),
      prisma.telegramCommunityModerationCase.count({ where: { chatId, status: 'OPEN' } }),
      prisma.telegramCommunityRoleAssignment.count({ where: { chatId } })
    ]);
    await deliverStaffResult(
      `📊 Group snapshot\n\nActive members tracked: ${activeMembers}\nJoined this week: ${joinedThisWeek}\nOpen reports: ${openReports}\nCustom staff roles: ${staff}`
    );
    return true;
  }
  if (command === '/staff') {
    if (!(await canUseGroupHelpCommand(message, values, '/staff', 'HELPER'))) return true;
    const staff = await prisma.telegramCommunityRoleAssignment.findMany({
      where: { chatId },
      select: { telegramUserId: true, role: true, customRole: { select: { name: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
    const members = staff.length
      ? await prisma.telegramCommunityMember.findMany({
          where: { chatId, telegramUserId: { in: staff.map((member) => member.telegramUserId) } },
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
    const canUseStaffTools = await canUseGroupHelpCommand(message, values, '/warn', 'HELPER');
    const canUseAdminTools = await isModerationExempt(
      message,
      values.telegramGroupHelpAdminWhitelist || ''
    );
    const helpSections = [
      `💙 *Hope Hub bot help*\n\n*For every member*\n• /rules — read community rules\n• /support — find private Hope Hub support\n• /warnings — check your warning count\n• /me — view your group profile\n• /report — reply to a message, then report it privately\n• /admin — ask the community team to review an urgent group concern\n• /forget — remove your retained Group Help data for this group\n• Send /forget in a private chat with the bot to remove your Group Help data across all communities.`,
      canUseStaffTools
        ? `*For Helpers and Moderators*\nReply to a member’s message, then use:\n• /warn reason or /unwarn — manage warnings\n• /delete reason — remove the replied message\n• /delwarn, /delmute, /delban — remove a harmful message and apply one action\n• /mute reason — temporarily restrict the member\n• /unmute — restore their ability to send messages\n• /ban reason, /unban, /kick — manage membership\n• /info or /perms — view member details and bot access\n• /geturl — get a direct link to a replied message\n• /clearwarnings — remove recorded warnings\n• /staff — view the community team\n• /stats — view the group snapshot`
        : '',
      canUseAdminTools
        ? `*For Telegram administrators*\n• /settings — open the group settings menu\n• /pin — reply to a message; add “notify” to alert members\n• /unpin or /pinned — manage the current pin\n• /lockdown 30 — pause member messages for a chosen number of minutes\n• /unlock — restore normal group access\n• /helper or /moderator — reply to a member to assign a community role\n• /unhelper or /unmoderator — remove that role\n• /settestgroup — register the current group as the bot test group\n• /setlog — register the current private channel/group as the activity log`
        : '',
      'Tip: prefix staff information commands with /* (for example, /*info or /*stats) to receive the result privately. Do not share private personal details in the group.'
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
