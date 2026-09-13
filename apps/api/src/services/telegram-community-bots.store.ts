import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import type { CommunityBotSlug } from './telegram-community-bots.types.js';
import type { CommunitySubmissionBotSlug } from '../constants/telegram-community-bot.constants.js';
import { controlNumber, getTelegramBotControls } from './telegram-bot-controls.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';

const STATE_TTL_MS = 24 * 60 * 60 * 1000;
const RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CommunityState<T = Record<string, unknown>> = {
  state: string;
  payload: T | null;
};

export type CommunitySubmissionInput = {
  reference: string;
  bot: CommunitySubmissionBotSlug;
  userChatId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  category?: string | null;
  text: string;
  status: string;
};

export async function getCommunityState<T = Record<string, unknown>>(
  bot: CommunityBotSlug,
  chatId: string
): Promise<CommunityState<T> | null> {
  const current = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot, chatId } },
    select: { state: true, payload: true, expiresAt: true }
  });
  if (!current) return null;
  if (current.expiresAt.getTime() <= Date.now()) {
    await clearCommunityState(bot, chatId);
    return null;
  }
  return { state: current.state, payload: current.payload as T | null };
}

export async function setCommunityState(
  bot: CommunityBotSlug,
  chatId: string,
  state: string,
  payload?: Record<string, unknown>,
  ttlMs?: number
) {
  const resolvedTtlMs =
    ttlMs ??
    controlNumber(
      (await getTelegramBotControls()).telegramCommunityStateTtlHours,
      STATE_TTL_MS / (60 * 60 * 1000)
    ) *
      60 *
      60 *
      1000;
  return prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot, chatId } },
    create: {
      bot,
      chatId,
      state,
      payload: payload as Prisma.InputJsonValue | undefined,
      expiresAt: new Date(Date.now() + resolvedTtlMs)
    },
    update: {
      state,
      payload: payload as Prisma.InputJsonValue | undefined,
      expiresAt: new Date(Date.now() + resolvedTtlMs)
    }
  });
}

export async function checkTelegramPrivateRateLimit(input: {
  bot: string;
  chatId: string;
  limit: number;
  blockMinutes: number;
}) {
  const now = new Date();
  const rateBot = `rate:${input.bot}`;
  return prisma.$transaction(async (tx) => {
    const current = await tx.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot: rateBot, chatId: input.chatId } },
      select: { payload: true, expiresAt: true }
    });
    const payload = (current?.payload || {}) as {
      count?: number;
      windowStartedAt?: string;
      blockedUntil?: string;
    };
    const blockedUntil = payload.blockedUntil ? new Date(payload.blockedUntil) : null;
    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        newlyBlocked: false,
        retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000))
      };
    }

    const windowStartedAt = payload.windowStartedAt ? new Date(payload.windowStartedAt) : now;
    const sameWindow = now.getTime() - windowStartedAt.getTime() < 60_000;
    const count = sameWindow ? Number(payload.count || 0) + 1 : 1;
    const shouldBlock = count > input.limit;
    const nextBlockedUntil = shouldBlock
      ? new Date(now.getTime() + input.blockMinutes * 60_000)
      : null;
    const nextPayload = {
      count,
      windowStartedAt: (sameWindow ? windowStartedAt : now).toISOString(),
      blockedUntil: nextBlockedUntil?.toISOString()
    };
    const expiresAt = new Date(
      Math.max(now.getTime() + 2 * 60_000, nextBlockedUntil?.getTime() || 0)
    );
    await tx.telegramCommunityState.upsert({
      where: { bot_chatId: { bot: rateBot, chatId: input.chatId } },
      create: {
        bot: rateBot,
        chatId: input.chatId,
        state: 'rate-limit',
        payload: nextPayload,
        expiresAt
      },
      update: { payload: nextPayload, expiresAt }
    });
    return {
      allowed: !shouldBlock,
      newlyBlocked: shouldBlock,
      retryAfterSeconds: shouldBlock ? input.blockMinutes * 60 : 0
    };
  });
}

export async function checkTelegramGroupFlood(input: {
  chatId: string;
  telegramUserId: string;
  limit: number;
  windowSeconds: number;
}) {
  const now = new Date();
  const bot = `group-flood:${input.chatId}`;
  const chatId = input.telegramUserId;
  return prisma.$transaction(async (tx) => {
    const current = await tx.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot, chatId } },
      select: { payload: true, expiresAt: true }
    });
    const payload = (current?.payload || {}) as { count?: number; startedAt?: string };
    const startedAt = payload.startedAt ? new Date(payload.startedAt) : now;
    const inWindow = now.getTime() - startedAt.getTime() <= input.windowSeconds * 1000;
    const count = inWindow ? Number(payload.count || 0) + 1 : 1;
    const nextStart = inWindow ? startedAt : now;
    const expiresAt = new Date(nextStart.getTime() + input.windowSeconds * 1000);
    await tx.telegramCommunityState.upsert({
      where: { bot_chatId: { bot, chatId } },
      create: {
        bot,
        chatId,
        state: 'group-flood',
        payload: { count, startedAt: nextStart.toISOString() },
        expiresAt
      },
      update: {
        payload: { count, startedAt: nextStart.toISOString() },
        expiresAt
      }
    });
    return { exceeded: count > input.limit, count };
  });
}

export async function checkTelegramGroupRepeatedSpam(input: {
  chatId: string;
  telegramUserId: string;
  text: string;
}) {
  const now = new Date();
  const bot = `group-spam:${input.chatId}`;
  const chatId = input.telegramUserId;
  const normalizedText = input.text.trim().replace(/\s+/g, ' ').toLowerCase();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const current = await tx.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot, chatId } },
      select: { payload: true, expiresAt: true }
    });
    const payload = (current?.payload || {}) as { text?: string; count?: number };
    const matches =
      current?.expiresAt && current.expiresAt > now && payload.text === normalizedText;
    const count = matches ? Number(payload.count || 0) + 1 : 1;
    await tx.telegramCommunityState.upsert({
      where: { bot_chatId: { bot, chatId } },
      create: {
        bot,
        chatId,
        state: 'group-spam',
        payload: { text: normalizedText, count },
        expiresAt
      },
      update: {
        payload: { text: normalizedText, count },
        expiresAt
      }
    });
    return { repeated: count >= 3, count };
  });
}

export async function addTelegramGroupWarning(input: {
  chatId: string;
  telegramUserId: string;
  reason: string;
}) {
  const bot = `group-warnings:${input.chatId}`;
  const chatId = input.telegramUserId;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const current = await tx.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot, chatId } },
      select: { payload: true }
    });
    const payload = (current?.payload || {}) as { count?: number; reasons?: string[] };
    const count = Number(payload.count || 0) + 1;
    const reasons = [
      ...(Array.isArray(payload.reasons) ? payload.reasons : []),
      input.reason
    ].slice(-10);
    await tx.telegramCommunityState.upsert({
      where: { bot_chatId: { bot, chatId } },
      create: {
        bot,
        chatId,
        state: 'group-warnings',
        payload: { count, reasons },
        expiresAt
      },
      update: { payload: { count, reasons }, expiresAt }
    });
    return count;
  });
}

export async function telegramGroupWarningCount(chatId: string, telegramUserId: string) {
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: `group-warnings:${chatId}`, chatId: telegramUserId } },
    select: { payload: true }
  });
  return Number((row?.payload as { count?: number } | null)?.count || 0);
}

export async function telegramGroupWarningDetails(chatId: string, telegramUserId: string) {
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: `group-warnings:${chatId}`, chatId: telegramUserId } },
    select: { payload: true }
  });
  const payload = (row?.payload || {}) as { count?: unknown; reasons?: unknown };
  return {
    count: Number(payload.count || 0),
    reasons: Array.isArray(payload.reasons)
      ? payload.reasons.map(String).filter(Boolean).slice(-5)
      : []
  };
}

/** Removes the newest recorded warning while preserving the older audit reasons. */
export async function removeLatestTelegramGroupWarning(chatId: string, telegramUserId: string) {
  const bot = `group-warnings:${chatId}`;
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot, chatId: telegramUserId } },
    select: { payload: true, expiresAt: true }
  });
  const payload = (row?.payload || {}) as { count?: unknown; reasons?: unknown };
  const count = Math.max(0, Number(payload.count || 0) - 1);
  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.map(String).filter(Boolean).slice(0, -1)
    : [];
  if (!row || count === 0) {
    await prisma.telegramCommunityState.deleteMany({ where: { bot, chatId: telegramUserId } });
    return { count: 0, removed: Boolean(row) };
  }
  await prisma.telegramCommunityState.update({
    where: { bot_chatId: { bot, chatId: telegramUserId } },
    data: { payload: { count, reasons }, expiresAt: row.expiresAt }
  });
  return { count, removed: true };
}

export async function clearTelegramGroupWarnings(chatId: string, telegramUserId: string) {
  return prisma.telegramCommunityState.deleteMany({
    where: {
      bot: `group-warnings:${chatId}`,
      chatId: telegramUserId
    }
  });
}

export async function communitySubmissionLimitReached(input: {
  bot: CommunitySubmissionBotSlug;
  userChatId: string;
  limit: number;
}) {
  const count = await prisma.telegramCommunitySubmission.count({
    where: {
      bot: input.bot,
      userChatId: input.userChatId,
      status: { not: 'draft' },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  return count >= input.limit;
}

export function clearCommunityState(bot: CommunityBotSlug, chatId: string) {
  return prisma.telegramCommunityState.deleteMany({ where: { bot, chatId } });
}

export function createCommunitySubmission(input: CommunitySubmissionInput) {
  return prisma.telegramCommunitySubmission.create({ data: input });
}

export function findCommunitySubmission(reference: string) {
  return prisma.telegramCommunitySubmission.findUnique({ where: { reference } });
}

export function updateCommunitySubmission(
  reference: string,
  data: {
    status?: string;
    groupChatId?: string | null;
    groupMessageId?: number | null;
  }
) {
  return prisma.telegramCommunitySubmission.update({ where: { reference }, data });
}

export function recordCommunitySubmissionOwnerReply(reference: string) {
  return prisma.telegramCommunitySubmission.update({
    where: { reference },
    data: {
      ownerReplyCount: { increment: 1 },
      lastOwnerReplyAt: new Date()
    }
  });
}

export function deleteDraftCommunitySubmission(reference: string, userChatId: string) {
  return prisma.telegramCommunitySubmission.deleteMany({
    where: { reference, userChatId, status: 'draft' }
  });
}

export function latestCommunitySubmission(bot: CommunitySubmissionBotSlug, userChatId: string) {
  return prisma.telegramCommunitySubmission.findFirst({
    where: { bot, userChatId },
    orderBy: { createdAt: 'desc' }
  });
}

export function submissionForGroupMessage(
  bot: CommunitySubmissionBotSlug,
  groupChatId: string,
  groupMessageId: number
) {
  return prisma.telegramCommunitySubmission.findFirst({
    where: { bot, groupChatId, groupMessageId }
  });
}

export async function claimCommunityWebhookUpdate(bot: string, updateId: number, payload: unknown) {
  try {
    await prisma.telegramWebhookReceipt.create({
      data: {
        bot,
        updateId: BigInt(updateId),
        status: 'PROCESSING',
        payload: payload as Prisma.InputJsonValue
      }
    });
    if (updateId % 100 === 0) {
      void cleanupCommunityBotData().catch((error) =>
        console.error('[telegram-community] Cleanup failed.', error)
      );
    }
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

export function completeCommunityWebhookUpdate(bot: string, updateId: number) {
  return prisma.telegramWebhookReceipt.update({
    where: { bot_updateId: { bot, updateId: BigInt(updateId) } },
    data: { status: 'COMPLETED', error: null, nextAttemptAt: null }
  });
}

export async function failCommunityWebhookUpdate(bot: string, updateId: number, error: unknown) {
  const receipt = await prisma.telegramWebhookReceipt.findUnique({
    where: { bot_updateId: { bot, updateId: BigInt(updateId) } },
    select: { attempts: true }
  });
  const attempts = (receipt?.attempts || 0) + 1;
  const deadLetter = attempts >= 5;
  return prisma.telegramWebhookReceipt.update({
    where: { bot_updateId: { bot, updateId: BigInt(updateId) } },
    data: {
      status: deadLetter ? 'DEAD_LETTER' : 'FAILED',
      attempts,
      nextAttemptAt: deadLetter
        ? null
        : new Date(Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (attempts - 1))),
      error: String(error instanceof Error ? error.message : error).slice(0, 1000)
    }
  });
}

export async function cleanupCommunityBotData() {
  const now = new Date();
  const receiptCutoff = new Date(Date.now() - RECEIPT_TTL_MS);
  const controls = await getTelegramBotControls();
  const submissionCutoff = new Date(
    Date.now() - controlNumber(controls.telegramSubmissionRetentionDays, 180) * 86_400_000
  );
  const engagementCutoff = new Date(
    Date.now() - controlNumber(controls.telegramEngagementRetentionDays, 90) * 86_400_000
  );
  const deliveryCutoff = new Date(
    Date.now() - controlNumber(controls.telegramDeliveryRetentionDays, 180) * 86_400_000
  );
  await prisma.$transaction([
    prisma.telegramCommunityState.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.telegramWebhookReceipt.deleteMany({ where: { createdAt: { lt: receiptCutoff } } }),
    prisma.telegramCommunitySubmission.deleteMany({
      where: {
        updatedAt: { lt: submissionCutoff },
        status: { in: ['approved', 'rejected', 'replied', 'closed'] }
      }
    }),
    prisma.telegramCommunityReaction.deleteMany({ where: { reactedAt: { lt: engagementCutoff } } }),
    prisma.telegramPollVote.deleteMany({ where: { votedAt: { lt: engagementCutoff } } }),
    prisma.telegramCommunityMember.deleteMany({
      where: { leftAt: { not: null, lt: engagementCutoff } }
    }),
    prisma.telegramCampaignDelivery.deleteMany({
      where: {
        createdAt: { lt: deliveryCutoff },
        status: { in: ['SENT', 'CLOSED', 'FAILED'] }
      }
    }),
    prisma.telegramCommunityMessageCleanup.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        attempts: { gte: 3 }
      }
    }),
    prisma.telegramGroupHelpCommandAudit.deleteMany({
      where: { createdAt: { lt: deliveryCutoff } }
    })
  ]);
  await runScheduledCommunityMessageCleanup(now);
}

export async function scheduleCommunityMessageCleanup(input: {
  bot: CommunityBotSlug;
  chatId: string | number;
  messageId: number;
  kind: 'welcome' | 'goodbye' | 'transient' | 'join-captcha' | 'identity-alert' | 'voice-reminder';
  deleteAfter: Date;
}) {
  return prisma.telegramCommunityMessageCleanup.upsert({
    where: {
      bot_chatId_messageId: {
        bot: input.bot,
        chatId: String(input.chatId),
        messageId: input.messageId
      }
    },
    create: {
      bot: input.bot,
      chatId: String(input.chatId),
      messageId: input.messageId,
      kind: input.kind,
      deleteAfter: input.deleteAfter
    },
    update: { deleteAfter: input.deleteAfter, kind: input.kind, attempts: 0 }
  });
}

export async function runScheduledCommunityMessageCleanup(now = new Date()) {
  const due = await prisma.telegramCommunityMessageCleanup.findMany({
    where: { deleteAfter: { lte: now } },
    orderBy: { deleteAfter: 'asc' },
    take: 100
  });
  for (const item of due) {
    try {
      await callCommunityTelegramApi(item.bot as CommunityBotSlug, 'deleteMessage', {
        chat_id: item.chatId,
        message_id: item.messageId
      });
      await prisma.telegramCommunityMessageCleanup.delete({ where: { id: item.id } });
    } catch {
      const attempts = item.attempts + 1;
      if (attempts >= 3) {
        await prisma.telegramCommunityMessageCleanup.delete({ where: { id: item.id } });
      } else {
        await prisma.telegramCommunityMessageCleanup.update({
          where: { id: item.id },
          data: { attempts, deleteAfter: new Date(now.getTime() + attempts * 60 * 60 * 1000) }
        });
      }
    }
  }
}
