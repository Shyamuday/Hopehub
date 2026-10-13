import { Prisma, PrismaClient } from '@prisma/client';
export async function writeExclusiveEditorDraft<T>(
  db: PrismaClient,
  active: string,
  userId: number,
  write: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`telegram-editor:${userId}`}, 0))::text AS locked`;
    await tx.telegramCommunityState.deleteMany({ where: competingEditorWhere(active, userId) });
    return write(tx);
  });
}
export const PRIVATE_EDITOR_STATES = [
  'group-help:post-editor',
  'group-help:filter-builder',
  'group-help:settings-draft'
];
export function competingEditorWhere(active: string, userId: number) {
  return {
    bot: { in: PRIVATE_EDITOR_STATES.filter((bot) => bot !== active) },
    chatId: { endsWith: `:${userId}` }
  };
}
export function privateEditorCommand(text: string | undefined) {
  return /^\/[a-z][a-z0-9_]*(?:@\w+)?(?:\s|$)/i.test((text || '').trim());
}
export function scheduleCommandForHopeHub(text: string | undefined) {
  return /^\/(?:schedule|schedulepost|schedu)(?:@Hopehubbot)?\s*$/i.test(text || '');
}
