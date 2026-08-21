import { prisma } from '../db.js';

const BAN_COOLDOWN_STATE = 'group-help:ban-cooldown';

export function groupHelpBanCooldownSeconds(value: string | undefined) {
  const seconds = Number(value || 60);
  return Number.isFinite(seconds) ? Math.max(0, Math.min(3600, Math.floor(seconds))) : 60;
}

function cooldownKey(targetChatId: string, actorUserId: string, targetUserId: string) {
  return `${targetChatId}:${actorUserId}:${targetUserId}`;
}

/** Returns the remaining duplicate-ban protection window for this exact action. */
export async function groupHelpBanCooldownRemainingSeconds(input: {
  targetChatId: string;
  actorUserId: string;
  targetUserId: string;
}) {
  const row = await prisma.telegramCommunityState.findUnique({
    where: {
      bot_chatId: {
        bot: BAN_COOLDOWN_STATE,
        chatId: cooldownKey(input.targetChatId, input.actorUserId, input.targetUserId)
      }
    },
    select: { expiresAt: true }
  });
  if (!row || row.expiresAt <= new Date()) return 0;
  return Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000));
}

/** Stores the cooldown only after Telegram confirms the ban action succeeded. */
export async function recordGroupHelpBanCooldown(input: {
  targetChatId: string;
  actorUserId: string;
  targetUserId: string;
  seconds: number;
}) {
  if (input.seconds <= 0) return;
  const expiresAt = new Date(Date.now() + input.seconds * 1000);
  await prisma.telegramCommunityState.upsert({
    where: {
      bot_chatId: {
        bot: BAN_COOLDOWN_STATE,
        chatId: cooldownKey(input.targetChatId, input.actorUserId, input.targetUserId)
      }
    },
    create: {
      bot: BAN_COOLDOWN_STATE,
      chatId: cooldownKey(input.targetChatId, input.actorUserId, input.targetUserId),
      state: 'ACTIVE',
      payload: {
        targetChatId: input.targetChatId,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId
      },
      expiresAt
    },
    update: { state: 'ACTIVE', expiresAt }
  });
}
