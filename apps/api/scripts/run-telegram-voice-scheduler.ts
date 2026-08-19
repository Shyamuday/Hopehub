import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';
import { removeTelegramCommunityEventAnnouncement } from '../src/services/telegram-community-campaigns.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_BOT = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';
const MAX_NATIVE_SCHEDULE_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_TIME_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 10 * 60 * 1000;
// A scheduled Telegram voice chat remains visible until its creator starts or
// discards it. Do not leave an unattended slot blocking the next host.
const MISSED_VOICE_CHAT_GRACE_MS = 15 * 60 * 1000;

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();

type NativeVoiceSchedulerState = {
  eventId?: string;
  nativeCallId?: string;
  nativeCallAccessHash?: string;
};

function statePayload(value: unknown): NativeVoiceSchedulerState {
  return value && typeof value === 'object' ? (value as NativeVoiceSchedulerState) : {};
}

function nativeGroupCallFromUpdates(
  updates: unknown
): { id: string; accessHash: string } | undefined {
  const updateList =
    updates && typeof updates === 'object' && 'updates' in updates
      ? (updates as { updates?: unknown[] }).updates
      : [];
  const groupCall = updateList?.find(
    (update) =>
      update &&
      typeof update === 'object' &&
      'call' in update &&
      (update as { className?: string }).className === 'UpdateGroupCall'
  ) as
    { call?: { id?: string | number | bigint; accessHash?: string | number | bigint } } | undefined;
  if (groupCall?.call?.id == null || groupCall.call.accessHash == null) return undefined;
  return {
    id: String(groupCall.call.id),
    accessHash: String(groupCall.call.accessHash)
  };
}

type NativeGroupCallStatus = { id: string; scheduled: boolean };

/**
 * Telegram is authoritative. The webhook can be delayed, so never create or
 * discard a group call based only on the database event status.
 */
async function currentTelegramGroupCall(
  client: TelegramClient,
  chatId: string
): Promise<NativeGroupCallStatus | null> {
  const peer = await client.getInputEntity(Number(chatId));
  const full = await client.api.channels.getFullChannel({ channel: peer });
  const inputCall = (full as { fullChat?: { call?: unknown } }).fullChat?.call;
  if (!inputCall) return null;
  const result = await client.api.phone.getGroupCall({ call: inputCall as never, limit: 1 });
  const call = (
    result as {
      call?: { id?: string | number | bigint; scheduleDate?: number | null };
    }
  ).call;
  if (call?.id == null) return null;
  return { id: String(call.id), scheduled: Boolean(call.scheduleDate) };
}

async function expireMissedVoiceChats(client: TelegramClient, now: Date) {
  const cutoff = new Date(now.getTime() - MISSED_VOICE_CHAT_GRACE_MS);
  const missed = await prisma.telegramCommunityEvent.findMany({
    where: { status: 'SCHEDULED', startsAt: { lte: cutoff } },
    select: { id: true, chatId: true, telegramMessageId: true }
  });

  for (const event of missed) {
    const key = { bot_chatId: { bot: STATE_BOT, chatId: event.chatId } };
    const state = await prisma.telegramCommunityState.findUnique({ where: key });
    const payload = statePayload(state?.payload);

    let activeCall: NativeGroupCallStatus | null = null;
    try {
      activeCall = await currentTelegramGroupCall(client, event.chatId);
    } catch (error) {
      // Never risk ending a real call when Telegram state cannot be read.
      console.warn(
        `Could not verify Telegram voice chat state for ${event.chatId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    if (
      activeCall &&
      !activeCall.scheduled &&
      payload.eventId === event.id &&
      payload.nativeCallId === activeCall.id
    ) {
      await prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { status: 'IN_PROGRESS' }
      });
      continue;
    }

    // Only the native call belonging to this event may be discarded. A newer
    // event in the same group must never be affected.
    if (payload.eventId === event.id && payload.nativeCallId && payload.nativeCallAccessHash) {
      try {
        await client.api.phone.discardGroupCall({
          call: {
            id: BigInt(payload.nativeCallId),
            accessHash: BigInt(payload.nativeCallAccessHash)
          }
        });
      } catch (error) {
        // The call may already have been manually closed or started. The
        // database still needs to release the slot so the next one can run.
        console.warn(
          `Could not discard missed Telegram voice chat ${event.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    await prisma.$transaction([
      prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { status: 'MISSED' }
      }),
      ...(payload.eventId === event.id
        ? [prisma.telegramCommunityState.delete({ where: key })]
        : [])
    ]);
    await removeTelegramCommunityEventAnnouncement(event);

    console.log(`Marked missed Telegram voice chat ${event.id} and released its next slot.`);
  }
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
  const client = new TelegramClient(new StringSession(savedSession), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    await expireMissedVoiceChats(client, now);
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
    for (const event of nextByChat.values()) {
      const key = { bot_chatId: { bot: STATE_BOT, chatId: event.chatId } };
      try {
        // A currently live or externally scheduled Telegram VC always wins.
        // Do not create a duplicate based on a stale local state record.
        if (await currentTelegramGroupCall(client, event.chatId)) continue;
      } catch (error) {
        // Failing safe is preferable to accidentally scheduling over a live
        // community voice chat.
        console.warn(
          `Skipping voice scheduling for ${event.chatId}; current call state is unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
      const state = await prisma.telegramCommunityState.findUnique({ where: key });
      const priorEventId = statePayload(state?.payload).eventId;
      if (priorEventId) {
        const prior = await prisma.telegramCommunityEvent.findUnique({
          where: { id: priorEventId },
          select: { id: true, status: true }
        });
        // Telegram permits only one active group voice chat per group. Keep
        // later slots queued while the current host is still live, even if
        // their planned end time has passed.
        if (prior?.status === 'SCHEDULED' || prior?.status === 'IN_PROGRESS') continue;
      }
      if (state?.state === 'NATIVE_VOICE_RETRY' && state.expiresAt > now) continue;

      try {
        const peer = await client.getInputEntity(Number(event.chatId));
        const updates = await client.api.phone.createGroupCall({
          peer,
          randomId: randomInt(1, 2_147_483_647),
          title: event.title.slice(0, 80),
          scheduleDate: Math.floor(event.startsAt.getTime() / 1000)
        });
        const nativeCall = nativeGroupCallFromUpdates(updates);
        await prisma.telegramCommunityState.upsert({
          where: key,
          create: {
            bot: STATE_BOT,
            chatId: event.chatId,
            state: 'NATIVE_VOICE_SCHEDULED',
            payload: {
              eventId: event.id,
              startsAt: event.startsAt.toISOString(),
              ...(nativeCall
                ? {
                    nativeCallId: nativeCall.id,
                    nativeCallAccessHash: nativeCall.accessHash
                  }
                : {})
            },
            expiresAt: new Date(event.startsAt.getTime() + 36 * 60 * 60 * 1000)
          },
          update: {
            state: 'NATIVE_VOICE_SCHEDULED',
            payload: {
              eventId: event.id,
              startsAt: event.startsAt.toISOString(),
              ...(nativeCall
                ? {
                    nativeCallId: nativeCall.id,
                    nativeCallAccessHash: nativeCall.accessHash
                  }
                : {})
            },
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
