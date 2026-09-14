import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type TelegramOperationClaim = {
  operation: string;
  key: string;
  expiresAt: Date;
};

type TelegramOperationClaimStore = {
  updateMany(args: unknown): Promise<{ count: number }>;
  create(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<{ count: number }>;
};

const MEMBERSHIP_TRANSITION_CLAIM_MS = 10 * 60_000;

/**
 * Atomically claims a Telegram side effect across every API instance.
 * Expired claims can be reused; active claims make concurrent workers no-op.
 */
export async function claimTelegramOperationWithStore(
  store: TelegramOperationClaimStore,
  input: TelegramOperationClaim
) {
  const now = new Date();
  const refreshed = await store.updateMany({
    where: { bot: input.operation, chatId: input.key, expiresAt: { lte: now } },
    data: { state: 'CLAIMED', expiresAt: input.expiresAt }
  });
  if (refreshed.count) return true;

  try {
    await store.create({
      data: {
        bot: input.operation,
        chatId: input.key,
        state: 'CLAIMED',
        expiresAt: input.expiresAt
      }
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

export function claimTelegramOperation(input: TelegramOperationClaim) {
  return claimTelegramOperationWithStore(prisma.telegramCommunityState, input);
}

export async function releaseTelegramOperationWithStore(
  store: TelegramOperationClaimStore,
  input: Pick<TelegramOperationClaim, 'operation' | 'key'>
) {
  await store.deleteMany({
    where: { bot: input.operation, chatId: input.key }
  });
}

export function releaseTelegramOperation(input: Pick<TelegramOperationClaim, 'operation' | 'key'>) {
  return releaseTelegramOperationWithStore(prisma.telegramCommunityState, input);
}

const membershipOperation = (transition: 'join' | 'leave', chatId: string) =>
  `telegram-membership-${transition}:${chatId}`;

/**
 * Telegram can emit both a service message and a chat_member update for one
 * membership transition. Serialize the member and replace the opposite claim
 * so a genuine leave followed by a rapid rejoin is still handled.
 */
export async function claimTelegramMembershipTransition(input: {
  transition: 'join' | 'leave';
  chatId: string;
  telegramUserId: string | number;
  now?: Date;
}) {
  const now = input.now || new Date();
  const key = String(input.telegramUserId);
  const operation = membershipOperation(input.transition, input.chatId);
  const opposite = membershipOperation(
    input.transition === 'join' ? 'leave' : 'join',
    input.chatId
  );

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.chatId}), hashtext(${key}))`;
    await tx.telegramCommunityState.deleteMany({ where: { bot: opposite, chatId: key } });
    const active = await tx.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot: operation, chatId: key } }
    });
    if (active && active.expiresAt > now) return false;
    await tx.telegramCommunityState.upsert({
      where: { bot_chatId: { bot: operation, chatId: key } },
      create: {
        bot: operation,
        chatId: key,
        state: 'CLAIMED',
        expiresAt: new Date(now.getTime() + MEMBERSHIP_TRANSITION_CLAIM_MS)
      },
      update: {
        state: 'CLAIMED',
        expiresAt: new Date(now.getTime() + MEMBERSHIP_TRANSITION_CLAIM_MS)
      }
    });
    return true;
  });
}

export function releaseTelegramMembershipTransition(input: {
  transition: 'join' | 'leave';
  chatId: string;
  telegramUserId: string | number;
}) {
  return releaseTelegramOperation({
    operation: membershipOperation(input.transition, input.chatId),
    key: String(input.telegramUserId)
  });
}
