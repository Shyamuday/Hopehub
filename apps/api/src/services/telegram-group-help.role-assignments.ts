import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type TelegramCommunityRoleAssignmentInput = {
  chatId: string;
  telegramUserId: string;
  role: string;
  customRoleId?: string | null;
  assignedById: string;
};

const MAX_WRITE_ATTEMPTS = 3;

function isRoleAssignmentConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Replaces a member's effective Group Help role without allowing concurrent
 * webhook/admin updates to create the same role twice. The advisory lock is
 * transaction-scoped, so it is released even when the write fails.
 */
export async function replaceTelegramCommunityRoleAssignment(
  input: TelegramCommunityRoleAssignmentInput
) {
  const lockKey = `telegram-community-role:${input.chatId}:${input.telegramUserId}`;

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${lockKey}))
        `;
        await transaction.telegramCommunityRoleAssignment.deleteMany({
          where: { chatId: input.chatId, telegramUserId: input.telegramUserId }
        });
        return transaction.telegramCommunityRoleAssignment.create({
          data: {
            chatId: input.chatId,
            telegramUserId: input.telegramUserId,
            role: input.role,
            customRoleId: input.customRoleId ?? null,
            assignedById: input.assignedById
          }
        });
      });
    } catch (error) {
      // Protect in-flight deployments against an older process that did not
      // yet take the advisory lock. Once every API instance uses this helper,
      // the lock alone serializes writes.
      if (!isRoleAssignmentConflict(error) || attempt === MAX_WRITE_ATTEMPTS - 1) throw error;
    }
  }

  throw new Error('Could not replace the Telegram community role assignment.');
}
