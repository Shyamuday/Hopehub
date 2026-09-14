import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import type { CommunityTelegramUser } from './telegram-community-bots.types.js';

export type GroupHelpTargetReference =
  { kind: 'id'; value: number } | { kind: 'username'; value: string };

/** Accepts a Telegram numeric ID, @username, or bare username. */
export function parseGroupHelpTargetReference(argument: string): GroupHelpTargetReference | null {
  const value = argument.trim();
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? { kind: 'id', value: id } : null;
  }

  const username = value.replace(/^@/, '');
  return /^[a-zA-Z0-9_]{1,32}$/.test(username) ? { kind: 'username', value: username } : null;
}

/**
 * Resolves every mutable username to the immutable Telegram ID stored from
 * group activity, then asks Telegram for the current member snapshot.
 */
export async function resolveGroupHelpTelegramUserIdWithLookup(
  argument: string,
  findByUsername: (username: string) => Promise<string | number | null | undefined>
) {
  const reference = parseGroupHelpTargetReference(argument);
  if (!reference) return undefined;

  let telegramUserId = reference.kind === 'id' ? reference.value : 0;
  if (reference.kind === 'username') {
    telegramUserId = Number((await findByUsername(reference.value)) || 0);
  }
  return Number.isSafeInteger(telegramUserId) && telegramUserId > 0 ? telegramUserId : undefined;
}

export function resolveGroupHelpTelegramUserId(chatId: string, argument: string) {
  return resolveGroupHelpTelegramUserIdWithLookup(argument, async (username) => {
    const known = await prisma.telegramCommunityMember.findFirst({
      where: {
        chatId,
        username: { equals: username, mode: 'insensitive' }
      },
      select: { telegramUserId: true }
    });
    return known?.telegramUserId;
  });
}

export async function resolveGroupHelpMember(chatId: string, argument: string) {
  const telegramUserId = await resolveGroupHelpTelegramUserId(chatId, argument);
  if (!telegramUserId) return undefined;

  const member = await callCommunityTelegramApi<{ user?: CommunityTelegramUser }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    { chat_id: chatId, user_id: telegramUserId }
  ).catch(() => null);
  return member?.user;
}
