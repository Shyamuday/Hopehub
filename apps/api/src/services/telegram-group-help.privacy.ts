import { prisma } from '../db.js';

export async function forgetGroupHelpMemberData(chatId: string, telegramUserId: string) {
  await prisma.$transaction([
    prisma.telegramCommunityState.deleteMany({
      where: {
        chatId: telegramUserId,
        bot: { in: [`group-warnings:${chatId}`, `group-flood:${chatId}`, `group-spam:${chatId}`] }
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
