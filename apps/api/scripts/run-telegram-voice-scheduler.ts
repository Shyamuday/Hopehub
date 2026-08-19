import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';
import { removeTelegramCommunityEventAnnouncement } from '../src/services/telegram-community-campaigns.js';
import { sendCommunityMessage } from '../src/services/telegram-community-bots.client.js';
import { getSiteConfigMap } from '../src/services/site-config.service.js';
import { GROUP_HELP_BOT_SLUG } from '../src/constants/telegram-community-bot.constants.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_BOT = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';
const HOST_REMINDER_STATE_BOT = 'TELEGRAM_NATIVE_VOICE_HOST_REMINDER';
const MAX_NATIVE_SCHEDULE_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_TIME_MS = 5 * 60 * 1000;
const HOST_REMINDER_LEAD_TIME_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 10 * 60 * 1000;
// Telegram update events handle normal starts and ends. This is only a
// low-frequency fallback when an update was missed or the server restarted.
const ACTIVE_VOICE_FALLBACK_CHECK_MS = 15 * 60 * 1000;
// A scheduled Telegram voice chat remains visible until its creator starts or
// discards it. Do not leave an unattended slot blocking the next host.
const MISSED_VOICE_CHAT_GRACE_MS = 15 * 60 * 1000;

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();

type NativeVoiceSchedulerState = {
  eventId?: string;
  nativeCallId?: string;
  nativeCallAccessHash?: string;
  startedAt?: string;
  startedEarly?: boolean;
  endedAt?: string;
  recoveryAfter?: string;
};

type VoiceEventNotification = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
};

function statePayload(value: unknown): NativeVoiceSchedulerState {
  return value && typeof value === 'object' ? (value as NativeVoiceSchedulerState) : {};
}

function indiaDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function assignedHost(event: Pick<VoiceEventNotification, 'title' | 'description'>) {
  const source = `${event.title}\n${event.description || ''}`;
  // Event descriptions are admin-authored and may contain a display label
  // such as "Host: @Mind Craft". Preserve that label in the operations alert
  // even when it is not a linkable Telegram username.
  const labelledHost = source.match(/\bhosts?\s*:\s*([^\n.]+)/i)?.[1]?.trim();
  if (labelledHost) return labelledHost;
  const usernames = [...source.matchAll(/(^|\s)@([a-zA-Z0-9_]{5,32})\b/g)].map(
    (match) => `@${match[2]}`
  );
  return [...new Set(usernames)].join(' & ') || 'Assigned VC host';
}

async function voiceOperationsChatId() {
  const values = await getSiteConfigMap([
    'telegramGroupHelpStaffGroupId',
    'telegramGroupHelpLogChannelId'
  ]);
  // The private staff group is the operational destination. Retain the log
  // channel as a safe fallback for existing groups that have not set one yet.
  return (
    values.telegramGroupHelpStaffGroupId?.trim() ||
    values.telegramGroupHelpLogChannelId?.trim() ||
    ''
  );
}

async function notifyVoiceOperations(text: string) {
  const chatId = await voiceOperationsChatId();
  if (!chatId) {
    console.warn('VC operations notice skipped: no private staff or log group is configured.');
    return false;
  }
  try {
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text);
    return true;
  } catch (error) {
    console.warn(
      `VC operations notice could not be delivered: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function sendVoiceHostReminders(now: Date) {
  const upcoming = await prisma.telegramCommunityEvent.findMany({
    where: {
      status: 'SCHEDULED',
      startsAt: {
        gt: now,
        lte: new Date(now.getTime() + HOST_REMINDER_LEAD_TIME_MS)
      }
    },
    select: { id: true, title: true, description: true, startsAt: true },
    orderBy: { startsAt: 'asc' }
  });

  for (const event of upcoming) {
    const reminderKey = { bot_chatId: { bot: HOST_REMINDER_STATE_BOT, chatId: event.id } };
    const alreadySent = await prisma.telegramCommunityState.findUnique({ where: reminderKey });
    if (alreadySent) continue;

    const sent = await notifyVoiceOperations(
      [
        '🎙 VC starts in 5 minutes',
        '',
        event.title,
        `Time: ${indiaDateTime(event.startsAt)} IST`,
        `Host: ${assignedHost(event)}`,
        '',
        'Please start the scheduled voice chat on time. If you are unavailable, arrange handover with another group admin.'
      ].join('\n')
    );
    if (!sent) continue;

    await prisma.telegramCommunityState.create({
      data: {
        bot: HOST_REMINDER_STATE_BOT,
        chatId: event.id,
        state: 'SENT',
        payload: { startsAt: event.startsAt.toISOString() },
        expiresAt: new Date(event.startsAt.getTime() + 24 * 60 * 60 * 1000)
      }
    });
  }
}

async function retainActiveVoiceState(
  chatId: string,
  payload: NativeVoiceSchedulerState,
  now: Date
) {
  const key = { bot_chatId: { bot: STATE_BOT, chatId } };
  await prisma.telegramCommunityState.upsert({
    where: key,
    create: {
      bot: STATE_BOT,
      chatId,
      state: 'NATIVE_VOICE_ACTIVE',
      payload,
      expiresAt: new Date(now.getTime() + ACTIVE_VOICE_FALLBACK_CHECK_MS)
    },
    update: {
      state: 'NATIVE_VOICE_ACTIVE',
      payload,
      expiresAt: new Date(now.getTime() + ACTIVE_VOICE_FALLBACK_CHECK_MS)
    }
  });
}

async function releaseEndedVoiceState(
  chatId: string,
  payload: NativeVoiceSchedulerState,
  now: Date
) {
  if (payload.eventId) {
    const event = await prisma.telegramCommunityEvent.findUnique({
      where: { id: payload.eventId },
      select: { id: true, startsAt: true, status: true }
    });
    // A future VC may have been started early. Keep that future event queued
    // so it can be scheduled again after the 15-minute recovery window.
    if (event && event.startsAt <= now && ['SCHEDULED', 'IN_PROGRESS'].includes(event.status)) {
      await prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { status: 'COMPLETED' }
      });
    }
  }
  await prisma.telegramCommunityState
    .delete({ where: { bot_chatId: { bot: STATE_BOT, chatId } } })
    .catch(() => null);
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
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      chatId: true,
      telegramMessageId: true
    }
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
      await retainActiveVoiceState(event.chatId, payload, now);
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
    await notifyVoiceOperations(
      [
        '⚠️ Scheduled VC was not started',
        '',
        event.title,
        `Scheduled time: ${indiaDateTime(event.startsAt)} IST`,
        `Host: ${assignedHost(event)}`,
        '',
        'The VC did not start within 15 minutes, so its Telegram slot was released. The next upcoming VC will be scheduled automatically.'
      ].join('\n')
    );

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
    await sendVoiceHostReminders(now);
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
      let state = await prisma.telegramCommunityState.findUnique({ where: key });
      const payload = statePayload(state?.payload);

      // Normal operation is event-first: Telegram's video_chat_started and
      // video_chat_ended updates move the state. Do not query Telegram every
      // minute while a native VC is already scheduled, live, or in its
      // 15-minute post-end handover window.
      if (
        (state?.state === 'NATIVE_VOICE_SCHEDULED' && payload.eventId === event.id) ||
        ((state?.state === 'NATIVE_VOICE_ACTIVE' || state?.state === 'NATIVE_VOICE_RECOVERY') &&
          state.expiresAt > now) ||
        (state?.state === 'NATIVE_VOICE_RETRY' && state.expiresAt > now)
      ) {
        continue;
      }

      try {
        // A 15-minute safety reconciliation for a missed Telegram update.
        // A currently live or externally scheduled VC always wins.
        if (await currentTelegramGroupCall(client, event.chatId)) {
          await retainActiveVoiceState(event.chatId, payload, now);
          continue;
        }
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

      // Telegram is clear. If a previous live/recovery state has reached its
      // 15-minute fallback boundary, release it and retain only a future
      // event—an early-started 7 PM VC remains eligible for 7 PM.
      if (state?.state === 'NATIVE_VOICE_ACTIVE' || state?.state === 'NATIVE_VOICE_RECOVERY') {
        await releaseEndedVoiceState(event.chatId, payload, now);
        state = null;
      } else if (state && state.state !== 'NATIVE_VOICE_RETRY') {
        await prisma.telegramCommunityState.delete({ where: key });
        state = null;
      } else if (state?.state === 'NATIVE_VOICE_RETRY') {
        // Its retry window has elapsed and Telegram is clear, so allow a
        // fresh create attempt instead of retaining a stale failure record.
        await prisma.telegramCommunityState.delete({ where: key });
        state = null;
      }
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
