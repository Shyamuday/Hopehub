import { Prisma } from '@prisma/client';
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
import { createGroupHelpAlertActions } from './telegram-group-help.alert-actions.js';
import { sendGroupHelpRulesMessage } from './telegram-group-help.rules-message.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

type TelegramAdministrator = { user?: CommunityTelegramUser; status?: string };

export function isGroupHelpReportTrigger(text: string | undefined) {
  const trimmed = (text || '').trim();
  const command = trimmed.split(/\s+/)[0].split('@')[0].toLowerCase();
  return command === '/report' || /^@?(admins?|admnns?)$/i.test(trimmed);
}

export function isGroupHelpAdminReportTrigger(text: string | undefined) {
  return /^@?(admins?|admnns?)$/i.test((text || '').normalize('NFKC').trim());
}

export function isTelegramGroupAdministratorStatus(status: string | undefined) {
  return status === 'creator' || status === 'administrator' || status === 'owner';
}

export function telegramGroupMessageUrl(
  chat: Pick<CommunityTelegramMessage['chat'], 'id' | 'username'>,
  messageId: number
) {
  const username = chat.username?.trim().replace(/^@/, '') || '';
  if (/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
    return `https://t.me/${username}/${messageId}`;
  }
  const chatId = String(chat.id);
  return /^-100\d+$/.test(chatId) ? `https://t.me/c/${chatId.slice(4)}/${messageId}` : '';
}

export function groupHelpReportedMessageEvidence(message: CommunityTelegramMessage) {
  const mediaType = message.photo?.length
    ? 'photo'
    : message.video
      ? 'video'
      : message.video_note
        ? 'video note'
        : message.animation
          ? 'animation'
          : message.document
            ? 'document'
            : message.audio
              ? 'audio'
              : message.voice
                ? 'voice note'
                : message.sticker
                  ? 'sticker'
                  : '';
  const content = (message.text || message.caption || '').trim();
  const label = mediaType ? `Reported ${mediaType}` : 'Reported message';
  const evidence = content || (mediaType ? `[${mediaType}]` : '[No text]');
  const characters = Array.from(evidence);
  return `${label}:\n${characters.length <= 1500 ? evidence : `${characters.slice(0, 1497).join('')}...`}`;
}

function memberReportAlertText(input: {
  id: string;
  reporterLabel: string;
  targetLabel: string;
  groupLabel: string;
  chatId: string;
  messageId: number;
  reason: string;
  evidence: string;
  reportCount: number;
  protectedCopy: boolean;
  status?: string;
}) {
  return [
    `🚩 Member report #${input.id.slice(-6)}`,
    input.reportCount > 1 ? `Reports: ${input.reportCount} unique members` : 'Reports: 1 member',
    '',
    `Reporter: ${input.reporterLabel}`,
    `Reported user: ${input.targetLabel}`,
    `Group: ${input.groupLabel} [${input.chatId}]`,
    `Original message ID: ${input.messageId}`,
    `Reason: ${input.reason}`,
    '',
    input.evidence,
    '',
    input.protectedCopy
      ? 'The protected copy above is the exact reported message.'
      : 'Use “Open original message” to inspect it in context.',
    'Choose an action below after review.',
    input.status || null
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
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

  // Whether used alone or as a reply/report shortcut, admin/admins always
  // receives the same configured rules text and image as /rules and moderation.
  if (isGroupHelpAdminReportTrigger(message.text)) {
    await sendGroupHelpRulesMessage({
      chatId,
      values,
      replyToMessageId: message.message_id,
      messageThreadId: message.message_thread_id
    });
  }

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
  const reporterUserId = String(message.from.id);
  const reporterLabel = telegramPersonLogLabel(message.from);
  const targetLabel = reported.from
    ? telegramPersonLogLabel(reported.from)
    : reported.sender_chat?.title || 'Unknown sender';
  const originalMessageUrl = telegramGroupMessageUrl(message.chat, reported.message_id);
  const dedupeKey = `${chatId}:${reported.message_id}`;
  let reportCase = await prisma.telegramCommunityModerationCase.findUnique({
    where: { dedupeKey }
  });
  let isNewCase = false;
  if (!reportCase) {
    try {
      reportCase = await prisma.telegramCommunityModerationCase.create({
        data: {
          dedupeKey,
          chatId,
          sourceMessageId: message.message_id,
          reportedMessageId: reported.message_id,
          reporterUserId,
          reporterLabel,
          reporterUserIds: [reporterUserId],
          targetUserId: reported.from ? String(reported.from.id) : null,
          targetLabel,
          originalMessageUrl: originalMessageUrl || null,
          reason,
          evidence: (reported.text || reported.caption || '[media]').slice(0, 4000)
        }
      });
      isNewCase = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      reportCase = await prisma.telegramCommunityModerationCase.findUniqueOrThrow({
        where: { dedupeKey }
      });
    }
  }
  if (
    !isNewCase &&
    reportCase.status === 'OPEN' &&
    !reportCase.reporterUserIds.includes(reporterUserId)
  ) {
    await prisma.telegramCommunityModerationCase.updateMany({
      where: { id: reportCase.id, NOT: { reporterUserIds: { has: reporterUserId } } },
      data: {
        reporterUserIds: { push: reporterUserId },
        reportCount: { increment: 1 }
      }
    });
    reportCase = await prisma.telegramCommunityModerationCase.findUniqueOrThrow({
      where: { id: reportCase.id }
    });
  }

  const destination =
    reportsMode === 'staff group'
      ? values.telegramGroupHelpStaffGroupId?.trim()
      : values.telegramGroupHelpLogChannelId?.trim() ||
        values.telegramGroupHelpStaffGroupId?.trim();
  if (destination) {
    if (
      !isNewCase &&
      reportCase.status === 'OPEN' &&
      reportCase.staffChatId &&
      reportCase.staffMessageId
    ) {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'editMessageText', {
        chat_id: reportCase.staffChatId,
        message_id: reportCase.staffMessageId,
        text: memberReportAlertText({
          id: reportCase.id,
          reporterLabel: reportCase.reporterLabel || reporterLabel,
          targetLabel: reportCase.targetLabel || targetLabel,
          groupLabel: message.chat.title || chatId,
          chatId,
          messageId: reported.message_id,
          reason: reportCase.reason,
          evidence: groupHelpReportedMessageEvidence(reported),
          reportCount: reportCase.reportCount,
          protectedCopy: true,
          status: reportCase.assignedToLabel
            ? `👤 Claimed by: ${reportCase.assignedToLabel}`
            : undefined
        })
      }).catch(() => null);
    } else if (isNewCase) {
      const protectedCopy = await callCommunityTelegramApi<{ message_id: number }>(
        GROUP_HELP_BOT_SLUG,
        'copyMessage',
        {
          chat_id: destination,
          from_chat_id: chatId,
          message_id: reported.message_id,
          disable_notification: true,
          protect_content: true
        }
      ).catch(() => null);
      const replyMarkup = await createGroupHelpAlertActions({
        targetChatId: chatId,
        targetMessageId: reported.message_id,
        targetUserId: reported.from ? String(reported.from.id) : null,
        reason,
        moderationCaseId: reportCase.id,
        originalMessageUrl,
        replyTargetMessageId: reported.message_id,
        messageThreadId: reported.message_thread_id || message.message_thread_id || null
      });
      const staffMessage = await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        destination,
        memberReportAlertText({
          id: reportCase.id,
          reporterLabel,
          targetLabel,
          groupLabel: message.chat.title || chatId,
          chatId,
          messageId: reported.message_id,
          reason,
          evidence: groupHelpReportedMessageEvidence(reported),
          reportCount: reportCase.reportCount,
          protectedCopy: Boolean(protectedCopy)
        }),
        {
          reply_markup: replyMarkup,
          ...(protectedCopy ? { reply_to_message_id: protectedCopy.message_id } : {})
        }
      ).catch(() => null);
      if (staffMessage) {
        await prisma.telegramCommunityModerationCase.update({
          where: { id: reportCase.id },
          data: {
            staffChatId: destination,
            staffMessageId: staffMessage.message_id,
            staffMessageIsCaption: false
          }
        });
      }
    }
  }

  let mentions = '';
  if (reportsMode === 'admins' && reportCase.status !== 'RESOLVED') {
    const administrators = await callCommunityTelegramApi<TelegramAdministrator[]>(
      GROUP_HELP_BOT_SLUG,
      'getChatAdministrators',
      { chat_id: chatId }
    ).catch(() => []);
    mentions = hiddenAdministratorMentions(administrators);
  }
  await sendTemporaryGroupHelpMessage(
    chatId,
    reportCase.status === 'RESOLVED'
      ? 'This message was already reviewed by the administrators.'
      : `Thank you. The administrators have been notified.${mentions}`,
    values,
    {
      parse_mode: 'Markdown',
      reply_to_message_id: message.message_id,
      message_thread_id: message.message_thread_id
    }
  );
  return true;
}
