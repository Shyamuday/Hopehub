import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUser
} from './telegram-community-bots.types.js';

type TelegramAdministrator = { user?: CommunityTelegramUser; status?: string };

export function isGroupHelpReportTrigger(text: string | undefined) {
  const trimmed = (text || '').trim();
  const command = trimmed.split(/\s+/)[0].split('@')[0].toLowerCase();
  return command === '/report' || /^@admins?$/i.test(trimmed);
}

export function isTelegramGroupAdministratorStatus(status: string | undefined) {
  return status === 'creator' || status === 'administrator' || status === 'owner';
}

async function telegramMemberStatus(chatId: string, userId: number) {
  return callCommunityTelegramApi<{ status?: string }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
    chat_id: chatId,
    user_id: userId
  }).catch(() => null);
}

function hiddenAdministratorMentions(administrators: TelegramAdministrator[]) {
  return administrators
    .map((entry) => entry.user)
    .filter((user): user is CommunityTelegramUser => Boolean(user && !user.is_bot))
    .map((user) => `[\u2060](tg://user?id=${user.id})`)
    .join('');
}

export async function handleGroupHelpReportCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  if (!isGroupHelpReportTrigger(message.text)) return false;
  const chatId = String(message.chat.id);
  const reportsMode = values.telegramGroupHelpReportsMode || 'admins';

  if (!message.from) return true;

  // Anonymous administrators send as the group itself. They should not create
  // a report or get routed into the general @admin alert flow.
  if (message.sender_chat && String(message.sender_chat.id) === chatId) return true;

  const reporterMembership = await telegramMemberStatus(chatId, message.from.id);
  if (!reporterMembership || isTelegramGroupAdministratorStatus(reporterMembership.status)) {
    // Match Rose: administrators reporting their own group is a no-op. A
    // failed membership lookup also fails closed instead of creating a report
    // whose privilege checks could not be completed.
    return true;
  }
  if (reportsMode === 'off') {
    await sendTemporaryGroupHelpMessage(
      chatId,
      'User reports are currently disabled in this group.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }

  const reported = message.reply_to_message;
  if (!reported) {
    await sendTemporaryGroupHelpMessage(
      chatId,
      'Reply to the message you want to report, then send /report or @admin.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }

  const anonymousAdminTarget =
    reported.sender_chat && String(reported.sender_chat.id) === String(reported.chat.id);
  const targetMembership = reported.from
    ? await telegramMemberStatus(chatId, reported.from.id)
    : null;
  if (reported.from && !targetMembership) {
    await sendTemporaryGroupHelpMessage(
      chatId,
      'I could not verify the reported member. No report was created; please try again.',
      values,
      { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
    );
    return true;
  }
  if (
    anonymousAdminTarget ||
    (targetMembership && isTelegramGroupAdministratorStatus(targetMembership.status))
  ) {
    await sendTemporaryGroupHelpMessage(
      chatId,
      'Group administrators cannot be reported.',
      values,
      {
        reply_to_message_id: message.message_id,
        message_thread_id: message.message_thread_id
      }
    );
    return true;
  }

  const commandReason = (message.text || '').trim().split(/\s+/).slice(1).join(' ').trim();
  const reason = commandReason || 'Member report';
  const reportCase = await prisma.telegramCommunityModerationCase.create({
    data: {
      chatId,
      sourceMessageId: message.message_id,
      reportedMessageId: reported.message_id,
      reporterUserId: String(message.from.id),
      targetUserId: reported.from ? String(reported.from.id) : null,
      reason,
      evidence: (reported.text || reported.caption || '[media]').slice(0, 4000)
    }
  });

  const destination =
    reportsMode === 'staff group'
      ? values.telegramGroupHelpStaffGroupId?.trim()
      : values.telegramGroupHelpLogChannelId?.trim() ||
        values.telegramGroupHelpStaffGroupId?.trim();
  if (destination) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      destination,
      `🚩 Report #${reportCase.id.slice(-6)}\n\nReporter: ${message.from.first_name || 'Telegram member'} (${message.from.id})\nReported member: ${reported.from?.first_name || 'Unknown'}${reported.from ? ` (${reported.from.id})` : ''}\nGroup: ${message.chat.title || chatId}\nReason: ${reason}\n\nOpen Hope Hub Admin to review the protected message evidence and choose an action.`
    ).catch(() => null);
  }

  let mentions = '';
  if (reportsMode === 'admins') {
    const administrators = await callCommunityTelegramApi<TelegramAdministrator[]>(
      GROUP_HELP_BOT_SLUG,
      'getChatAdministrators',
      { chat_id: chatId }
    ).catch(() => []);
    mentions = hiddenAdministratorMentions(administrators);
  }
  await sendTemporaryGroupHelpMessage(
    chatId,
    `Thank you. The administrators have been notified.${mentions}`,
    values,
    {
      parse_mode: 'Markdown',
      reply_to_message_id: message.message_id,
      message_thread_id: message.message_thread_id
    }
  );
  return true;
}
