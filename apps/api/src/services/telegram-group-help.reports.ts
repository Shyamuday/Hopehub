import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export async function handleGroupHelpReportCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command !== '/report') return false;
  const chatId = String(message.chat.id);
  const reportsMode = values.telegramGroupHelpReportsMode || 'admins';
  const destination =
    reportsMode === 'staff group'
      ? values.telegramGroupHelpStaffGroupId?.trim()
      : values.telegramGroupHelpLogChannelId?.trim() ||
        values.telegramGroupHelpStaffGroupId?.trim();
  if (message.reply_to_message && reportsMode !== 'off' && message.from) {
    const reported = message.reply_to_message;
    const reportCase = await prisma.telegramCommunityModerationCase.create({
      data: {
        chatId,
        sourceMessageId: message.message_id,
        reportedMessageId: reported.message_id,
        reporterUserId: String(message.from.id),
        targetUserId: reported.from ? String(reported.from.id) : null,
        reason: 'Member report',
        evidence: (reported.text || reported.caption || '[media]').slice(0, 4000)
      }
    });
    if (destination) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        destination,
        `🚩 Report #${reportCase.id.slice(-6)}\n\nReporter: ${message.from.first_name || 'Telegram member'} (${message.from.id})\nReported member: ${reported.from?.first_name || 'Unknown'}${reported.from ? ` (${reported.from.id})` : ''}\nGroup: ${message.chat.title || chatId}\n\nOpen Hope Hub Admin to review the protected message evidence and choose an action.`
      ).catch(() => null);
    }
  }
  await sendTemporaryGroupHelpMessage(
    chatId,
    message.reply_to_message
      ? 'Thank you. This message has been flagged for administrator review.'
      : 'Reply to the message you want to report, then send /report.',
    values,
    { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
  );
  return true;
}
