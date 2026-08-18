import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import {
  clearTelegramGroupWarnings,
  telegramGroupWarningCount
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

export async function handleGroupHelpMemberCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  if (command === '/start') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      'Welcome to Hope Hub 💙\n\nChoose what you need. You can still use commands whenever that feels easier.',
      { reply_markup: groupHelpMainMenuKeyboard(), message_thread_id: message.message_thread_id }
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
  if (command === '/info' || command === '/member') {
    if (!(await canUseGroupHelpCommand(message, values, command, 'HELPER'))) return true;
    const target = message.reply_to_message?.from;
    if (!target) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        'Reply to a member’s message, then use /info.',
        values
      );
      return true;
    }
    const [member, role, warnings] = await Promise.all([
      prisma.telegramCommunityMember.findUnique({
        where: { chatId_telegramUserId: { chatId, telegramUserId: String(target.id) } }
      }),
      assignedCommunityRole(chatId, String(target.id)),
      telegramGroupWarningCount(chatId, String(target.id))
    ]);
    await sendTemporaryGroupHelpMessage(
      chatId,
      `👤 Member details\n\nName: ${target.first_name || 'Telegram member'}\nID: ${target.id}\nRole: ${role ? role.toLowerCase() : 'member'}\nWarnings: ${warnings}\nJoined: ${member?.joinedAt ? member.joinedAt.toLocaleDateString('en-IN') : 'not recorded'}`,
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
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
    await sendTemporaryGroupHelpMessage(
      chatId,
      `📊 Group snapshot\n\nActive members tracked: ${activeMembers}\nJoined this week: ${joinedThisWeek}\nOpen reports: ${openReports}\nCustom staff roles: ${staff}`,
      values,
      { message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (command === '/staff') {
    if (!(await canUseGroupHelpCommand(message, values, '/staff', 'HELPER'))) return true;
    const staff = await prisma.telegramCommunityRoleAssignment.findMany({
      where: { chatId },
      select: { telegramUserId: true, role: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      staff.length
        ? `🛡 Community team\n\n${staff.map((member) => `• ${member.role === 'MODERATOR' ? 'Moderator' : 'Helper'} · ${member.telegramUserId}`).join('\n')}`
        : 'There are no custom Helper or Moderator roles in this group yet.',
      values,
      { message_thread_id: message.message_thread_id }
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
      `💙 *Hope Hub bot help*\n\n*For every member*\n• /rules — read community rules\n• /support — find private Hope Hub support\n• /warnings — check your warning count\n• /report — reply to a message, then report it privately\n• /admin — ask the community team to review an urgent group concern\n• /forget — remove your retained Group Help data for this group\n• Send /forget in a private chat with the bot to remove your Group Help data across all communities.`,
      canUseStaffTools
        ? `*For Helpers and Moderators*\nReply to a member’s message, then use:\n• /warn reason — add a warning\n• /delete reason — remove the replied message\n• /mute reason — temporarily restrict the member\n• /unmute — restore their ability to send messages\n• /ban reason, /unban, /kick — manage membership\n• /info — view recorded member details\n• /clearwarnings — remove recorded warnings\n• /staff — view the community team\n• /stats — view the group snapshot`
        : '',
      canUseAdminTools
        ? `*For Telegram administrators*\n• /settings — open the group settings menu\n• /lockdown 30 — pause member messages for a chosen number of minutes\n• /unlock — restore normal group access\n• /helper or /moderator — reply to a member to assign a community role\n• /unhelper or /unmoderator — remove that role\n• /settestgroup — register the current group as the bot test group\n• /setlog — register the current private channel/group as the activity log`
        : '',
      'Tip: use commands by themselves unless a reason is shown. Do not share private personal details in the group.'
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
