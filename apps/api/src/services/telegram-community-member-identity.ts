import { prisma } from '../db.js';
import type { CommunityTelegramUser } from './telegram-community-bots.types.js';

export type TelegramIdentityObservationSource =
  'JOIN' | 'MESSAGE' | 'STAFF_GROUP' | 'DIRECTORY_SYNC' | 'INFO_LOOKUP';

export type TelegramObservedIdentity = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

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
  const previous = await prisma.telegramCommunityMember.findUnique({
    where: { chatId_telegramUserId: { chatId, telegramUserId } },
    select: { firstName: true, lastName: true, username: true }
  });
  const existingHistory = previous
    ? await prisma.telegramCommunityMemberIdentityHistory.findFirst({
        where: { chatId, telegramUserId },
        select: { id: true }
      })
    : null;
  const changedFields = previous ? changedTelegramIdentityFields(previous, next) : ['initial'];
  const changed = Boolean(previous && changedFields.length);
  const activeData = input.markActive === false ? {} : { leftAt: null };

  await prisma.$transaction(async (tx) => {
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
  });

  const nameChangeCount = await prisma.telegramCommunityMemberIdentityHistory.count({
    where: { chatId, telegramUserId, changedFields: { has: 'name' } }
  });
  return {
    recorded: true,
    changed,
    changedFields,
    nameChangeCount,
    previousDisplayName: previous ? telegramDisplayName(previous) : null,
    displayName: telegramDisplayName(next),
    previousUsername: previous?.username || null,
    username: next.username
  };
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
