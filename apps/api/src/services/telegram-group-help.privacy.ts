import { prisma } from '../db.js';

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
}
