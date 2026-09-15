import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import type { CommunityTelegramUser } from './telegram-community-bots.types.js';

export type TelegramIdentityObservationSource =
  'JOIN' | 'MESSAGE' | 'STAFF_GROUP' | 'DIRECTORY_SYNC' | 'INFO_LOOKUP';

export type TelegramObservedIdentity = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

const IDENTITY_ALERT_COOLDOWN_STATE = 'group-help-identity-alert-cooldown';
export const GROUP_HELP_IDENTITY_ALERT_COOLDOWN_MS = 24 * 60 * 60_000;

function identityAlertCooldownChatId(chatId: string, telegramUserId: string | number) {
  return `${chatId}:${telegramUserId}`;
}

export async function claimTelegramIdentityPublicAlert(input: {
  chatId: string;
  telegramUserId: string | number;
  now?: Date;
}) {
  const now = input.now || new Date();
  const expiresAt = new Date(now.getTime() + GROUP_HELP_IDENTITY_ALERT_COOLDOWN_MS);
  const chatId = identityAlertCooldownChatId(input.chatId, input.telegramUserId);

  // If an active (non-expired) cooldown row already exists, the alert was
  // already posted within the window — suppress the duplicate.
  const suppressed = await prisma.telegramCommunityState.updateMany({
    where: { bot: IDENTITY_ALERT_COOLDOWN_STATE, chatId, expiresAt: { gt: now } },
    data: { state: 'ACTIVE' }
  });
  if (suppressed.count) return false;

  // No active cooldown — delete any stale expired row and create a fresh one.
  await prisma.telegramCommunityState.deleteMany({
    where: { bot: IDENTITY_ALERT_COOLDOWN_STATE, chatId }
  });
  try {
    await prisma.telegramCommunityState.create({
      data: {
        bot: IDENTITY_ALERT_COOLDOWN_STATE,
        chatId,
        state: 'ACTIVE',
        expiresAt
      }
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return false;
    throw error;
  }
}

export async function releaseTelegramIdentityPublicAlert(input: {
  chatId: string;
  telegramUserId: string | number;
}) {
  await prisma.telegramCommunityState.deleteMany({
    where: {
      bot: IDENTITY_ALERT_COOLDOWN_STATE,
      chatId: identityAlertCooldownChatId(input.chatId, input.telegramUserId)
    }
  });
}

function cleanValue(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function telegramDisplayName(identity: TelegramObservedIdentity) {
  const name = [identity.firstName, identity.lastName].filter(Boolean).join(' ').trim();
  return name || (identity.username ? `@${identity.username}` : null);
}

export function normalizedTelegramIdentity(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): TelegramObservedIdentity {
  return {
    firstName: cleanValue(input.firstName),
    lastName: cleanValue(input.lastName),
    username: cleanValue(input.username)
  };
}

export function changedTelegramIdentityFields(
  previous: TelegramObservedIdentity,
  next: TelegramObservedIdentity
) {
  const fields: string[] = [];
  if (previous.firstName !== next.firstName || previous.lastName !== next.lastName) {
    fields.push('name');
  }
  if (previous.username !== next.username) fields.push('username');
  return fields;
}

/**
 * Records an identity only when Telegram exposes it to the bot. No profile is
 * fetched or inferred. Later observations append a row only if a name or
 * username has actually changed.
 */
export async function observeTelegramCommunityMember(input: {
  chatId: string;
  member: CommunityTelegramUser;
  source: TelegramIdentityObservationSource;
  markActive?: boolean;
}) {
  if (input.member.is_bot) {
    return {
      recorded: false,
      changed: false,
      changedFields: [],
      nameChangeCount: 0,
      previousDisplayName: null,
      displayName: null,
      previousUsername: null,
      username: null
    };
  }

  const chatId = String(input.chatId);
  const telegramUserId = String(input.member.id);
  const next = normalizedTelegramIdentity({
    firstName: input.member.first_name,
    lastName: input.member.last_name,
    username: input.member.username
  });
  const activeData = input.markActive === false ? {} : { leftAt: null };

  const observation = await prisma.$transaction(
    async (tx) => {
      // Multiple webhook updates for an active member can arrive concurrently.
      // Lock this group/member pair before reading so one real profile change is
      // observed and announced only once.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chatId}), hashtext(${telegramUserId}))`;
      const previous = await tx.telegramCommunityMember.findUnique({
        where: { chatId_telegramUserId: { chatId, telegramUserId } },
        select: { firstName: true, lastName: true, username: true }
      });
      const existingHistory = previous
        ? await tx.telegramCommunityMemberIdentityHistory.findFirst({
            where: { chatId, telegramUserId },
            select: { id: true }
          })
        : null;
      const changedFields = previous ? changedTelegramIdentityFields(previous, next) : ['initial'];
      const changed = Boolean(previous && changedFields.length);
      await tx.telegramCommunityMember.upsert({
        where: { chatId_telegramUserId: { chatId, telegramUserId } },
        create: { chatId, telegramUserId, ...next },
        update: { ...next, ...activeData }
      });
      if (!previous || !existingHistory || changed) {
        await tx.telegramCommunityMemberIdentityHistory.create({
          data: {
            chatId,
            telegramUserId,
            previousFirstName: previous?.firstName,
            previousLastName: previous?.lastName,
            previousUsername: previous?.username,
            previousDisplayName: previous ? telegramDisplayName(previous) : null,
            firstName: next.firstName,
            lastName: next.lastName,
            username: next.username,
            displayName: telegramDisplayName(next),
            changedFields: !previous || changed ? changedFields : ['initial'],
            source: input.source
          }
        });
      }
      return {
        recorded: true,
        changed,
        changedFields,
        previousDisplayName: previous ? telegramDisplayName(previous) : null,
        displayName: telegramDisplayName(next),
        previousUsername: previous?.username || null,
        username: next.username
      };
    },
    // Concurrent Telegram updates may briefly wait on the per-member advisory
    // lock. Five seconds was too short under production load and caused P2028
    // failures even though the identity write itself was valid.
    { maxWait: 10_000, timeout: 15_000 }
  );

  // This aggregate does not need the write lock. Keeping it outside the
  // transaction shortens the critical section and avoids an expired commit.
  const nameChangeCount = await prisma.telegramCommunityMemberIdentityHistory.count({
    where: { chatId, telegramUserId, changedFields: { has: 'name' } }
  });
  return { ...observation, nameChangeCount };
}

export function identityHistoryDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  displayName?: string | null;
}) {
  return (
    input.displayName ||
    telegramDisplayName({
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      username: input.username ?? null
    }) ||
    'No public name'
  );
}

/**
 * Returns the identity history that this community bot has observed for a
 * member in one specific chat. It deliberately does not query a Telegram-wide
 * profile: aliases are scoped to the group where they were recorded.
 */
export async function getTelegramCommunityMemberIdentityHistory(
  chatId: string,
  telegramUserId: string | number
) {
  return prisma.telegramCommunityMemberIdentityHistory.findMany({
    where: { chatId: String(chatId), telegramUserId: String(telegramUserId) },
    orderBy: { observedAt: 'asc' },
    select: {
      previousDisplayName: true,
      previousUsername: true,
      displayName: true,
      username: true,
      observedAt: true
    }
  });
}
