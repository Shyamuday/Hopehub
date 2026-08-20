import { createHash } from 'node:crypto';
import { prisma } from '../db.js';

const DIRECTORY_OPTOUT_BOT = 'TELEGRAM_DIRECTORY_OPTOUT';
const DIRECTORY_OPTOUT_YEARS = 10;

function directoryOptOutHash(chatId: string, telegramUserId: string) {
  return createHash('sha256').update(`${chatId}:${telegramUserId}`).digest('hex');
}

async function rememberDirectoryOptOut(chatId: string, telegramUserId: string) {
  const hash = directoryOptOutHash(chatId, telegramUserId);
  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + DIRECTORY_OPTOUT_YEARS);
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: DIRECTORY_OPTOUT_BOT, chatId: hash } },
    create: {
      bot: DIRECTORY_OPTOUT_BOT,
      chatId: hash,
      state: 'OPT_OUT',
      expiresAt
    },
    update: { state: 'OPT_OUT', expiresAt }
  });
}

export async function directoryOptedOutUserIds(chatId: string, telegramUserIds: readonly string[]) {
  const hashes = new Map<string, string>();
  for (const telegramUserId of telegramUserIds) {
    hashes.set(directoryOptOutHash(chatId, telegramUserId), telegramUserId);
    hashes.set(directoryOptOutHash('*', telegramUserId), telegramUserId);
  }
  const rows: Array<{ chatId: string }> = [];
  const hashKeys = [...hashes.keys()];
  for (let offset = 0; offset < hashKeys.length; offset += 1000) {
    rows.push(
      ...(await prisma.telegramCommunityState.findMany({
        where: {
          bot: DIRECTORY_OPTOUT_BOT,
          chatId: { in: hashKeys.slice(offset, offset + 1000) },
          expiresAt: { gt: new Date() }
        },
        select: { chatId: true }
      }))
    );
  }
  return new Set(
    rows.map((row) => hashes.get(row.chatId)).filter((value): value is string => !!value)
  );
}

export async function forgetGroupHelpMemberData(chatId: string, telegramUserId: string) {
  await prisma.$transaction([
    prisma.telegramCommunityState.deleteMany({
      where: {
        chatId: telegramUserId,
        bot: {
          in: [
            `group-warnings:${chatId}`,
            `group-flood:${chatId}`,
            `group-spam:${chatId}`,
            `group-join-verification:${chatId}`
          ]
        }
      }
    }),
    prisma.telegramCommunityMember.deleteMany({ where: { chatId, telegramUserId } }),
    prisma.telegramCommunityRoleAssignment.deleteMany({ where: { chatId, telegramUserId } }),
    prisma.telegramCommunityReaction.deleteMany({ where: { chatId, telegramUserId } }),
    prisma.telegramCommunityEventRsvp.deleteMany({ where: { telegramUserId, event: { chatId } } }),
    prisma.telegramPollVote.deleteMany({
      where: { telegramUserId, delivery: { campaign: { chatId } } }
    }),
    prisma.telegramCommunityModerationCase.updateMany({
      where: { chatId, reporterUserId: telegramUserId },
      data: { reporterUserId: null }
    }),
    prisma.telegramCommunityModerationCase.updateMany({
      where: { chatId, targetUserId: telegramUserId },
      data: { targetUserId: null }
    })
  ]);
  // Keep only a one-way hash so a later MTProto refresh does not silently
  // restore identity data the member explicitly asked us to delete.
  await rememberDirectoryOptOut(chatId, telegramUserId);
}

/** Removes the Group Help bot's retained data for a person across every community. */
export async function forgetAllGroupHelpMemberData(telegramUserId: string) {
  await prisma.$transaction([
    prisma.telegramCommunityState.deleteMany({
      where: {
        chatId: telegramUserId,
        bot: {
          // Includes temporary warning/flood/spam state and all join-verification
          // records, even though verification state is keyed by the group ID.
          startsWith: 'group-'
        }
      }
    }),
    prisma.telegramCommunityMember.deleteMany({ where: { telegramUserId } }),
    prisma.telegramCommunityRoleAssignment.deleteMany({ where: { telegramUserId } }),
    prisma.telegramCommunityReaction.deleteMany({ where: { telegramUserId } }),
    prisma.telegramCommunityEventRsvp.deleteMany({ where: { telegramUserId } }),
    prisma.telegramPollVote.deleteMany({ where: { telegramUserId } }),
    prisma.telegramCommunityModerationCase.updateMany({
      where: { reporterUserId: telegramUserId },
      data: { reporterUserId: null }
    }),
    prisma.telegramCommunityModerationCase.updateMany({
      where: { targetUserId: telegramUserId },
      data: { targetUserId: null }
    })
  ]);
  await rememberDirectoryOptOut('*', telegramUserId);
}
