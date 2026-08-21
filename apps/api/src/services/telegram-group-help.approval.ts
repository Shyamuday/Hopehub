import { prisma } from '../db.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  deleteGroupHelpMessage,
  sendGroupHelpActivityLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

const approvalBot = (chatId: string) => `group-first-message-approval:${chatId}`;

type ReviewReason = 'FIRST_MESSAGE_REVIEW' | 'MEDIA_REVIEW';

async function memberApprovalState(chatId: string, userId: string) {
  return prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: approvalBot(chatId), chatId: userId } }
  });
}

/**
 * Telegram cannot hold a message before delivery. Review mode removes it, keeps
 * a staff-only case, then trusts the member after the case is approved.
 */
export async function queueGroupHelpMessageReview(
  message: CommunityTelegramMessage,
  values: Record<string, string>,
  reason: ReviewReason
) {
  if (!message.from) return false;
  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const state = await memberApprovalState(chatId, userId);
  const reviewLimit = Math.max(
    0,
    Math.min(3, Number(values.telegramGroupHelpFirstMessageReview || 0))
  );
  const approvedCount = Number(
    (state?.payload as { approvedCount?: number } | null)?.approvedCount || 0
  );
  if (
    reason === 'FIRST_MESSAGE_REVIEW' &&
    (reviewLimit === 0 || (state?.state === 'APPROVED' && approvedCount >= reviewLimit))
  ) {
    return false;
  }

  await deleteGroupHelpMessage(chatId, message.message_id).catch(() => null);
  // Every held message needs its own review record. Previously, when the
  // member already had one pending review, later configured messages were
  // removed but not shown to staff at all.
  await prisma.telegramCommunityModerationCase.create({
    data: {
      chatId,
      sourceMessageId: message.message_id,
      reportedMessageId: message.message_id,
      targetUserId: userId,
      reason,
      evidence: (message.text || message.caption || '[media]').slice(0, 4000)
    }
  });
  if (state?.state !== 'PENDING') {
    if (reason === 'FIRST_MESSAGE_REVIEW') {
      await prisma.telegramCommunityState.upsert({
        where: { bot_chatId: { bot: approvalBot(chatId), chatId: userId } },
        create: {
          bot: approvalBot(chatId),
          chatId: userId,
          state: 'PENDING',
          payload: { reviewedMessageId: message.message_id, approvedCount },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000)
        },
        update: {
          state: 'PENDING',
          payload: { reviewedMessageId: message.message_id, approvedCount },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000)
        }
      });
    }
  }
  await sendGroupHelpActivityLog(values, 'Message waiting for staff review', [
    `Group: ${message.chat.title || chatId}`,
    `Member: ${telegramPersonLogLabel(message.from)}`,
    `Reason: ${reason === 'FIRST_MESSAGE_REVIEW' ? 'first message' : 'media review'}`
  ]);
  await sendTemporaryGroupHelpMessage(
    chatId,
    reason === 'FIRST_MESSAGE_REVIEW'
      ? 'Thanks for joining. A moderator will review your first message shortly.'
      : 'Thanks. A moderator will review this media before it is shared.',
    values,
    { message_thread_id: message.message_thread_id }
  );
  return true;
}

export async function approveGroupHelpMemberFirstMessage(chatId: string, userId: string) {
  const existing = await memberApprovalState(chatId, userId);
  const previousCount = Number(
    (existing?.payload as { approvedCount?: number } | null)?.approvedCount || 0
  );
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: approvalBot(chatId), chatId: userId } },
    create: {
      bot: approvalBot(chatId),
      chatId: userId,
      state: 'APPROVED',
      payload: { approvedAt: new Date().toISOString(), approvedCount: previousCount + 1 },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60_000)
    },
    update: {
      state: 'APPROVED',
      payload: { approvedAt: new Date().toISOString(), approvedCount: previousCount + 1 },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60_000)
    }
  });
}
