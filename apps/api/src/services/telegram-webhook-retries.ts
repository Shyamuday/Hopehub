import { prisma } from '../db.js';
import {
  communityBotFromSlug,
  handleCommunityBotUpdate,
  type CommunityTelegramUpdate
} from './telegram-community-bots.js';
import {
  completeCommunityWebhookUpdate,
  failCommunityWebhookUpdate
} from './telegram-community-bots.store.js';
import {
  handleTelegramUpdate,
  telegramBotKindFromSlug,
  type TelegramUpdate
} from './telegram-bots.js';

const BATCH_SIZE = 20;
const STALE_PROCESSING_MS = 2 * 60_000;

async function dispatchStoredUpdate(bot: string, payload: unknown) {
  const kind = telegramBotKindFromSlug(bot);
  if (kind) {
    await handleTelegramUpdate(kind, payload as TelegramUpdate);
    return;
  }
  const communityBot = communityBotFromSlug(bot);
  if (communityBot) {
    await handleCommunityBotUpdate(communityBot, payload as CommunityTelegramUpdate);
    return;
  }
  throw new Error(`Unknown Telegram bot slug: ${bot}`);
}

/** Replays transient webhook failures with a bounded, multi-instance-safe claim. */
export async function retryFailedTelegramWebhookUpdates() {
  const now = new Date();
  await prisma.telegramWebhookReceipt.updateMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: new Date(now.getTime() - STALE_PROCESSING_MS) }
    },
    data: {
      status: 'FAILED',
      nextAttemptAt: now,
      error: 'Webhook worker stopped before completing this update.'
    }
  });

  const candidates = await prisma.telegramWebhookReceipt.findMany({
    where: { status: 'FAILED', nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: 'asc' },
    take: BATCH_SIZE,
    select: { id: true, bot: true, updateId: true, payload: true }
  });

  let completed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const claimed = await prisma.telegramWebhookReceipt.updateMany({
      where: { id: candidate.id, status: 'FAILED', nextAttemptAt: { lte: now } },
      data: { status: 'PROCESSING', nextAttemptAt: null }
    });
    if (!claimed.count) continue;
    try {
      if (!candidate.payload) throw new Error('Stored Telegram update payload is missing.');
      await dispatchStoredUpdate(candidate.bot, candidate.payload);
      await completeCommunityWebhookUpdate(candidate.bot, Number(candidate.updateId));
      completed += 1;
    } catch (error) {
      await failCommunityWebhookUpdate(candidate.bot, Number(candidate.updateId), error);
      failed += 1;
    }
  }
  return { claimed: candidates.length, completed, failed };
}
