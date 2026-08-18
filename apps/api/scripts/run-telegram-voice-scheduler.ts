import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_BOT = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';
const MAX_NATIVE_SCHEDULE_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_TIME_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 10 * 60 * 1000;

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();

function statePayload(value: unknown): { eventId?: string } {
  return value && typeof value === 'object' ? (value as { eventId?: string }) : {};
}

async function main() {
  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const savedSession = readFileSync(SESSION_PATH, 'utf8').trim();
  if (!Number.isInteger(apiId) || !apiHash || !savedSession) {
    throw new Error(
      'Telegram native voice scheduler is not authenticated yet. Run telegram:voice:login first.'
    );
  }

  const now = new Date();
  const minimumStart = new Date(now.getTime() + MINIMUM_LEAD_TIME_MS);
  const maximumStart = new Date(now.getTime() + MAX_NATIVE_SCHEDULE_AHEAD_MS);
  const events = await prisma.telegramCommunityEvent.findMany({
    where: {
      status: 'SCHEDULED',
      startsAt: { gt: minimumStart, lte: maximumStart }
    },
    orderBy: { startsAt: 'asc' }
  });

  const nextByChat = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    if (!nextByChat.has(event.chatId)) nextByChat.set(event.chatId, event);
  }
  if (!nextByChat.size) return;

  const client = new TelegramClient(new StringSession(savedSession), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    for (const event of nextByChat.values()) {
      const key = { bot_chatId: { bot: STATE_BOT, chatId: event.chatId } };
      const state = await prisma.telegramCommunityState.findUnique({ where: key });
      const priorEventId = statePayload(state?.payload).eventId;
      if (priorEventId) {
        const prior = await prisma.telegramCommunityEvent.findUnique({
          where: { id: priorEventId },
          select: { id: true, status: true }
        });
        if (prior?.status === 'SCHEDULED') continue;
      }
      if (state?.state === 'NATIVE_VOICE_RETRY' && state.expiresAt > now) continue;

      try {
        const peer = await client.getInputEntity(Number(event.chatId));
        await client.api.phone.createGroupCall({
          peer,
          randomId: randomInt(1, 2_147_483_647),
          title: event.title.slice(0, 80),
          scheduleDate: Math.floor(event.startsAt.getTime() / 1000)
        });
        await prisma.telegramCommunityState.upsert({
          where: key,
          create: {
            bot: STATE_BOT,
            chatId: event.chatId,
            state: 'NATIVE_VOICE_SCHEDULED',
            payload: { eventId: event.id, startsAt: event.startsAt.toISOString() },
            expiresAt: new Date(event.startsAt.getTime() + 36 * 60 * 60 * 1000)
          },
          update: {
            state: 'NATIVE_VOICE_SCHEDULED',
            payload: { eventId: event.id, startsAt: event.startsAt.toISOString() },
            expiresAt: new Date(event.startsAt.getTime() + 36 * 60 * 60 * 1000)
          }
        });
        console.log(
          `Scheduled native Telegram voice chat for ${event.chatId} at ${event.startsAt.toISOString()}.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.telegramCommunityState.upsert({
          where: key,
          create: {
            bot: STATE_BOT,
            chatId: event.chatId,
            state: 'NATIVE_VOICE_RETRY',
            payload: { eventId: event.id, error: message.slice(0, 500) },
            expiresAt: new Date(now.getTime() + RETRY_DELAY_MS)
          },
          update: {
            state: 'NATIVE_VOICE_RETRY',
            payload: { eventId: event.id, error: message.slice(0, 500) },
            expiresAt: new Date(now.getTime() + RETRY_DELAY_MS)
          }
        });
        console.error(
          `Could not schedule native Telegram voice chat for ${event.chatId}: ${message}`
        );
      }
    }
  } finally {
    await client.disconnect();
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
