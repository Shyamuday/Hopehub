import { Prisma, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import type { TelegramChat, TelegramUser } from './telegram-bots.types.js';

export async function ensureSession(
  kind: TelegramBotKind,
  chat: TelegramChat,
  from?: TelegramUser
) {
  const chatId = String(chat.id);
  return prisma.telegramBotSession.upsert({
    where: { botKind_chatId: { botKind: kind, chatId } },
    create: {
      botKind: kind,
      chatId,
      telegramUserId: from?.id ? String(from.id) : null,
      username: from?.username ?? null,
      firstName: from?.first_name ?? null,
      lastName: from?.last_name ?? null
    },
    update: {
      telegramUserId: from?.id ? String(from.id) : undefined,
      username: from?.username ?? undefined,
      firstName: from?.first_name ?? undefined,
      lastName: from?.last_name ?? undefined
    },
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true }
      }
    }
  });
}

export type TelegramSession = Awaited<ReturnType<typeof ensureSession>>;

export async function updateSession(
  session: TelegramSession,
  data: Prisma.TelegramBotSessionUpdateInput
) {
  return prisma.telegramBotSession.update({
    where: { id: session.id },
    data,
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true }
      }
    }
  });
}

export async function logEvent(input: {
  kind: TelegramBotKind;
  sessionId?: string;
  updateId?: number;
  chatId?: string;
  eventType: string;
  payload?: unknown;
}) {
  await prisma.telegramBotEvent.create({
    data: {
      sessionId: input.sessionId,
      botKind: input.kind,
      updateId: input.updateId == null ? null : BigInt(input.updateId),
      chatId: input.chatId,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue
    }
  });
}
