import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import type { CommunityBotSlug } from './telegram-community-bots.types.js';

const STATE_TTL_MS = 24 * 60 * 60 * 1000;
const RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CommunityState<T = Record<string, unknown>> = {
  state: string;
  payload: T | null;
};

export type CommunitySubmissionInput = {
  reference: string;
  bot: 'contact' | 'confession';
  userChatId: string;
  firstName?: string | null;
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
  ttlMs = STATE_TTL_MS
) {
  return prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot, chatId } },
    create: {
      bot,
      chatId,
      state,
      payload: payload as Prisma.InputJsonValue | undefined,
      expiresAt: new Date(Date.now() + ttlMs)
    },
    update: {
      state,
      payload: payload as Prisma.InputJsonValue | undefined,
      expiresAt: new Date(Date.now() + ttlMs)
    }
  });
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

export function deleteDraftCommunitySubmission(reference: string, userChatId: string) {
  return prisma.telegramCommunitySubmission.deleteMany({
    where: { reference, userChatId, status: 'draft' }
  });
}

export function latestCommunitySubmission(bot: 'contact' | 'confession', userChatId: string) {
  return prisma.telegramCommunitySubmission.findFirst({
    where: { bot, userChatId },
    orderBy: { createdAt: 'desc' }
  });
}

export function submissionForGroupMessage(
  bot: 'contact' | 'confession',
  groupChatId: string,
  groupMessageId: number
) {
  return prisma.telegramCommunitySubmission.findFirst({
    where: { bot, groupChatId, groupMessageId }
  });
}

export async function claimCommunityWebhookUpdate(bot: string, updateId: number) {
  try {
    await prisma.telegramWebhookReceipt.create({
      data: { bot, updateId: BigInt(updateId), status: 'PROCESSING' }
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
    data: { status: 'COMPLETED', error: null }
  });
}

export function failCommunityWebhookUpdate(bot: string, updateId: number, error: unknown) {
  return prisma.telegramWebhookReceipt.update({
    where: { bot_updateId: { bot, updateId: BigInt(updateId) } },
    data: {
      status: 'FAILED',
      error: String(error instanceof Error ? error.message : error).slice(0, 1000)
    }
  });
}

export async function cleanupCommunityBotData() {
  const now = new Date();
  const receiptCutoff = new Date(Date.now() - RECEIPT_TTL_MS);
  await prisma.$transaction([
    prisma.telegramCommunityState.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.telegramWebhookReceipt.deleteMany({ where: { createdAt: { lt: receiptCutoff } } })
  ]);
}
