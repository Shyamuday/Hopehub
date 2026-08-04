import { Prisma } from '@prisma/client';
import type { SessionMetadata } from './telegram-bots.types.js';

export type TelegramDisplaySession = {
  firstName?: string | null;
  username?: string | null;
  metadata?: Prisma.JsonValue | null;
};

export function escapeHtml(value: string | null | undefined) {
  return (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function todayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function metadataOf(session: { metadata?: Prisma.JsonValue | null }): SessionMetadata {
  if (
    !session.metadata ||
    typeof session.metadata !== 'object' ||
    Array.isArray(session.metadata)
  ) {
    return {};
  }
  return session.metadata as SessionMetadata;
}

export function telegramDisplayName(session: TelegramDisplaySession) {
  return session.firstName || session.username || 'Telegram user';
}
