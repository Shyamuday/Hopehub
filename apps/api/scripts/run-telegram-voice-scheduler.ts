import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';
import {
  refreshTelegramCommunityEventAnnouncement,
  removeTelegramCommunityEventAnnouncement
} from '../src/services/telegram-community-campaigns.js';
import { sendCommunityMessage } from '../src/services/telegram-community-bots.client.js';
import { getSiteConfigMap } from '../src/services/site-config.service.js';
import { GROUP_HELP_BOT_SLUG } from '../src/constants/telegram-community-bot.constants.js';
import { synchronizeConfiguredTelegramGroupMembers } from '../src/services/telegram-mtproto-member-sync.js';
import {
  EMPTY_VOICE_CHAT_RECOVERY_MS,
  EMPTY_VOICE_CHAT_RECOVERY_REASON,
  knownVoiceStarterForEmptyAlert,
  trackEmptyVoiceChat,
  type VoiceParticipantSnapshot,
  voiceChatOccupancyCheckDue
} from '../src/services/telegram-voice-empty-timeout.js';
import { telegramGroupCallButton } from '../src/services/telegram-group-call-link.js';
import { telegramPersonLogLabel } from '../src/services/telegram-group-help.people.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_BOT = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';
const HOST_REMINDER_STATE_BOT = 'TELEGRAM_NATIVE_VOICE_HOST_REMINDER';
const JOIN_BUTTON_ALERT_STATE_BOT = 'TELEGRAM_VOICE_JOIN_BUTTON_ALERT';
const MAX_NATIVE_SCHEDULE_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_TIME_MS = 5 * 60 * 1000;
const HOST_REMINDER_LEAD_TIME_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const SCHEDULED_CALL_RECHECK_DELAY_MS = 60 * 1000;
// Telegram does not send a reliable bot update when an administrator discards
// a *scheduled* VC. Reconcile the one tracked scheduled call every 15 minutes
// so an intentional removal does not leave the group's schedule stuck.
const SCHEDULED_VOICE_HEALTH_CHECK_MS = 15 * 60 * 1000;
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
  healthCheckedAt?: string;
  joinButtonRefreshedAt?: string;
  emptySince?: string;
  lastParticipantCheckAt?: string;
  participantCount?: number;
  startedBy?: VoiceParticipantSnapshot;
  emptyLeaveAlertedAt?: string;
  reason?: string;
  error?: string;
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

async function notifyPrivateVoiceStaff(text: string) {
  const values = await getSiteConfigMap(['telegramGroupHelpStaffGroupId']);
  const chatId = values.telegramGroupHelpStaffGroupId?.trim() || '';
  if (!chatId) {
    console.warn('Private VC staff notice skipped: no private staff group is configured.');
    return false;
  }
  try {
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text);
    return true;
  } catch (error) {
    console.warn(
      `Private VC staff notice could not be delivered: ${
        error instanceof Error ? error.message : String(error)
      }`
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

/**
 * The Bot API normally refreshes the announcement on video_chat_started.
 * MTProto is the fallback authority when that service update is delayed or
 * missed, so also repair the existing Join VC button from this worker.
 */
async function reconcileActiveVoiceEvent(
  client: TelegramClient,
  payload: NativeVoiceSchedulerState,
  now: Date,
  activeCall: NativeGroupCallStatus
): Promise<NativeVoiceSchedulerState> {
  if (!payload.eventId) return payload;
  const event = await prisma.telegramCommunityEvent.findUnique({
    where: { id: payload.eventId },
    select: {
      id: true,
      title: true,
      chatId: true,
      joinUrl: true,
      startsAt: true,
      status: true,
      telegramMessageId: true
    }
  });
  if (!event) return payload;

  try {
    const invite = await client.api.phone.exportGroupCallInvite({
      call: activeCall.inputCall as never,
      canSelfUnmute: true
    });
    const exportedJoinUrl = (invite as { link?: string }).link?.trim();
    if (exportedJoinUrl && exportedJoinUrl !== event.joinUrl) {
      await prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { joinUrl: exportedJoinUrl }
      });
    }
  } catch (error) {
    // The public-group videochat link remains a valid fallback, but the
    // exported invite is preferable because Telegram generated it for the
    // exact active call.
    console.warn(
      `Could not export active VC invite for ${event.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (event.startsAt <= now && event.status === 'SCHEDULED') {
    await prisma.telegramCommunityEvent.update({
      where: { id: event.id },
      data: { status: 'IN_PROGRESS' }
    });
  }

  if (!event.telegramMessageId || payload.joinButtonRefreshedAt) return payload;
  try {
    await refreshTelegramCommunityEventAnnouncement(event.id, { active: true });
    await prisma.telegramCommunityState
      .delete({
        where: {
          bot_chatId: { bot: JOIN_BUTTON_ALERT_STATE_BOT, chatId: event.id }
        }
      })
      .catch(() => null);
    console.log(
      `Refreshed live VC Join button for event ${event.id} in Telegram chat ${event.chatId}.`
    );
    return { ...payload, joinButtonRefreshedAt: now.toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not refresh live VC Join button for ${event.id}: ${message}`);
    const alertKey = {
      bot_chatId: { bot: JOIN_BUTTON_ALERT_STATE_BOT, chatId: event.id }
    };
    const alreadyAlerted = await prisma.telegramCommunityState.findUnique({
      where: alertKey
    });
    if (!alreadyAlerted) {
      const sent = await notifyVoiceOperations(
        [
          '⚠️ Live VC Join button update failed',
          '',
          event.title,
          `Event ID: ${event.id}`,
          `Group ID: ${event.chatId}`,
          `Scheduled time: ${indiaDateTime(event.startsAt)} IST`,
          `Configured join URL: ${event.joinUrl}`,
          `Telegram error: ${message.slice(0, 700)}`,
          '',
          'The VC is live, but its existing announcement could not be updated. The scheduler will retry automatically.'
        ].join('\n')
      );
      if (sent) {
        await prisma.telegramCommunityState.create({
          data: {
            bot: JOIN_BUTTON_ALERT_STATE_BOT,
            chatId: event.id,
            state: 'SENT',
            payload: {
              eventId: event.id,
              groupId: event.chatId,
              joinUrl: event.joinUrl,
              message: message.slice(0, 700),
              notifiedAt: now.toISOString()
            },
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
          }
        });
      }
    }
    return payload;
  }
}

async function retainScheduledVoiceState(
  chatId: string,
  event: Pick<VoiceEventNotification, 'id' | 'startsAt'>,
  payload: NativeVoiceSchedulerState,
  currentCall: NativeGroupCallStatus,
  now: Date
) {
  const key = { bot_chatId: { bot: STATE_BOT, chatId } };
  const nextCheckAt = new Date(now.getTime() + SCHEDULED_VOICE_HEALTH_CHECK_MS);
  await prisma.telegramCommunityState.upsert({
    where: key,
    create: {
      bot: STATE_BOT,
      chatId,
      state: 'NATIVE_VOICE_SCHEDULED',
      payload: {
        ...payload,
        eventId: event.id,
        startsAt: event.startsAt.toISOString(),
        nativeCallId: currentCall.id,
        nativeCallAccessHash: currentCall.accessHash,
        healthCheckedAt: now.toISOString()
      },
      expiresAt: nextCheckAt
    },
    update: {
      state: 'NATIVE_VOICE_SCHEDULED',
      payload: {
        ...payload,
        eventId: event.id,
        startsAt: event.startsAt.toISOString(),
        nativeCallId: currentCall.id,
        nativeCallAccessHash: currentCall.accessHash,
        healthCheckedAt: now.toISOString()
      },
      expiresAt: nextCheckAt
    }
  });
}

function isTrackedScheduledVoiceCall(
  event: Pick<VoiceEventNotification, 'id' | 'startsAt'>,
  payload: NativeVoiceSchedulerState,
  currentCall: NativeGroupCallStatus
) {
  if (!currentCall.scheduled) return false;
  if (payload.eventId === event.id && payload.nativeCallId === currentCall.id) return true;
  return (
    currentCall.scheduleDate != null &&
    Math.abs(currentCall.scheduleDate * 1000 - event.startsAt.getTime()) < 60_000
  );
}

async function markVoiceEventCancelledByAdmin(
  event: Pick<VoiceEventNotification, 'id' | 'title' | 'description' | 'startsAt'> & {
    chatId: string;
    telegramMessageId: number | null;
  },
  reason: string
) {
  const result = await prisma.telegramCommunityEvent.updateMany({
    where: { id: event.id, status: 'SCHEDULED' },
    data: { status: 'CANCELLED' }
  });
  if (!result.count) return false;

  await removeTelegramCommunityEventAnnouncement(event);
  await prisma.telegramCommunityState
    .delete({ where: { bot_chatId: { bot: STATE_BOT, chatId: event.chatId } } })
    .catch(() => null);
  await notifyVoiceOperations(
    [
      'ℹ️ Scheduled VC removed',
      '',
      event.title,
      `Scheduled time: ${indiaDateTime(event.startsAt)} IST`,
      `Host: ${assignedHost(event)}`,
      `Reason: ${reason}`,
      '',
      'The removed slot was recorded as cancelled and will not be recreated. The next upcoming VC will be scheduled automatically.'
    ].join('\n')
  );
  console.log(`Marked Telegram voice chat ${event.id} as cancelled: ${reason}`);
  return true;
}

async function notifyVoiceScheduleFailure(
  event: Pick<VoiceEventNotification, 'id' | 'title' | 'startsAt'> & { chatId: string },
  message: string
) {
  const alertKey = {
    bot_chatId: { bot: 'TELEGRAM_NATIVE_VOICE_SCHEDULER_ALERT', chatId: event.id }
  };
  const alreadyAlerted = await prisma.telegramCommunityState.findUnique({ where: alertKey });
  if (alreadyAlerted) return;

  const sent = await notifyVoiceOperations(
    [
      '⚠️ VC could not be scheduled',
      '',
      event.title,
      `Time: ${indiaDateTime(event.startsAt)} IST`,
      `Reason: ${message.slice(0, 500)}`,
      '',
      'Check that the Telegram scheduler account is still a group administrator with Manage video chats permission.'
    ].join('\n')
  );
  if (!sent) return;
  await prisma.telegramCommunityState.create({
    data: {
      bot: 'TELEGRAM_NATIVE_VOICE_SCHEDULER_ALERT',
      chatId: event.id,
      state: 'SENT',
      payload: { message: message.slice(0, 500), notifiedAt: new Date().toISOString() },
      expiresAt: new Date(event.startsAt.getTime() + 24 * 60 * 60 * 1000)
    }
  });
}

async function deferForScheduledVoiceCall(
  chatId: string,
  payload: NativeVoiceSchedulerState,
  now: Date,
  reason: string
) {
  const key = { bot_chatId: { bot: STATE_BOT, chatId } };
  await prisma.telegramCommunityState.upsert({
    where: key,
    create: {
      bot: STATE_BOT,
      chatId,
      state: 'NATIVE_VOICE_RETRY',
      payload: { ...payload, reason },
      expiresAt: new Date(now.getTime() + SCHEDULED_CALL_RECHECK_DELAY_MS)
    },
    update: {
      state: 'NATIVE_VOICE_RETRY',
      payload: { ...payload, reason },
      expiresAt: new Date(now.getTime() + SCHEDULED_CALL_RECHECK_DELAY_MS)
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

type NativeGroupCallStatus = {
  id: string;
  accessHash?: string;
  scheduled: boolean;
  scheduleDate?: number;
  participantCount: number;
  inputCall: unknown;
};

/**
 * Telegram is authoritative. The webhook can be delayed, so never create or
 * discard a group call based only on the database event status.
 */
async function currentTelegramGroupCall(
  client: TelegramClient,
  chatId: string
): Promise<NativeGroupCallStatus | null> {
  const peerReference = /^-?\d+$/.test(chatId.trim()) ? Number(chatId) : chatId.trim();
  const peer = await client.getInputEntity(peerReference);
  const full = await client.api.channels.getFullChannel({ channel: peer });
  const inputCall = (full as { fullChat?: { call?: unknown } }).fullChat?.call;
  if (!inputCall) return null;
  const inputCallReference = inputCall as {
    id?: string | number | bigint;
    accessHash?: string | number | bigint;
  };
  const result = await client.api.phone.getGroupCall({ call: inputCall as never, limit: 100 });
  const call = (
    result as {
      call?: {
        id?: string | number | bigint;
        accessHash?: string | number | bigint;
        scheduleDate?: number | null;
        participantsCount?: number;
      };
      participants?: unknown[];
    }
  ).call;
  if (call?.id == null) return null;
  return {
    id: String(call.id),
    ...(call.accessHash == null && inputCallReference.accessHash == null
      ? {}
      : { accessHash: String(call.accessHash ?? inputCallReference.accessHash) }),
    scheduled: Boolean(call.scheduleDate),
    ...(call.scheduleDate == null ? {} : { scheduleDate: call.scheduleDate }),
    participantCount: Math.max(
      0,
      Number(
        call.participantsCount ?? (result as { participants?: unknown[] }).participants?.length ?? 0
      )
    ),
    // Keep Telegram's original InputGroupCall object. Reconstructing it from
    // its ID and access hash is rejected by Telegram for some scheduled VCs.
    inputCall
  };
}

async function sendLiveVoiceReminder(
  chatId: string,
  payload: NativeVoiceSchedulerState,
  participantCount: number
) {
  const [event, config] = await Promise.all([
    payload.eventId
      ? prisma.telegramCommunityEvent.findUnique({
          where: { id: payload.eventId },
          select: { title: true, joinUrl: true }
        })
      : null,
    getSiteConfigMap(['telegramGroupHelpGroupChatId', 'telegramGroupHelpMainGroupUrl'])
  ]);
  const mainGroupJoinUrl =
    config.telegramGroupHelpGroupChatId?.trim() === chatId
      ? config.telegramGroupHelpMainGroupUrl?.trim() || ''
      : '';
  const joinUrl = event?.joinUrl?.trim() || mainGroupJoinUrl;
  const memberLabel = participantCount === 1 ? 'member is' : 'members are';
  try {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      [
        '🎙 Voice chat is live now',
        '',
        ...(event?.title ? [event.title] : []),
        `${participantCount} ${memberLabel} already in the VC. Join the conversation.`
      ].join('\n'),
      joinUrl
        ? { reply_markup: { inline_keyboard: [[telegramGroupCallButton(joinUrl, true)]] } }
        : {}
    );
  } catch (error) {
    console.warn(
      `Could not send live VC reminder to ${chatId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function alertVoiceStarterWhoLeftItOpen(
  payload: NativeVoiceSchedulerState,
  administrator: VoiceParticipantSnapshot,
  now: Date
) {
  const label = telegramPersonLogLabel(administrator, 'VC administrator');
  const sent = await notifyPrivateVoiceStaff(
    [
      `⚠️ ${label}, please do not leave a VC running empty.`,
      '',
      'You started this VC, and it now has 0 members.',
      'If the session is over, close the VC before leaving. Otherwise, remain until another administrator takes over.'
    ].join('\n')
  );
  return sent ? { ...payload, emptyLeaveAlertedAt: now.toISOString() } : payload;
}

async function enterEmptyVoiceRecovery(
  chatId: string,
  payload: NativeVoiceSchedulerState,
  now: Date
) {
  if (payload.eventId) {
    const event = await prisma.telegramCommunityEvent.findUnique({
      where: { id: payload.eventId },
      select: { id: true, title: true, startsAt: true, status: true }
    });
    // Preserve a future event that an administrator started early so it can
    // be placed back on Telegram after the normal handover window.
    if (event && event.startsAt <= now && ['SCHEDULED', 'IN_PROGRESS'].includes(event.status)) {
      await prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { status: 'COMPLETED' }
      });
    }
    if (event) {
      await notifyVoiceOperations(
        [
          'ℹ️ Empty VC closed automatically',
          '',
          event.title,
          'The voice chat stayed empty for five minutes, so it was closed.',
          'The next upcoming VC will be scheduled automatically.'
        ].join('\n')
      );
    }
  }

  // Give Telegram one worker cycle to clear the discarded call, then restore
  // the next slot. The normal 15-minute host handover is unnecessary here.
  const recoveryAfter = new Date(now.getTime() + EMPTY_VOICE_CHAT_RECOVERY_MS);
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: STATE_BOT, chatId } },
    create: {
      bot: STATE_BOT,
      chatId,
      state: 'NATIVE_VOICE_RECOVERY',
      payload: {
        ...payload,
        endedAt: now.toISOString(),
        recoveryAfter: recoveryAfter.toISOString(),
        reason: EMPTY_VOICE_CHAT_RECOVERY_REASON
      },
      expiresAt: recoveryAfter
    },
    update: {
      state: 'NATIVE_VOICE_RECOVERY',
      payload: {
        ...payload,
        endedAt: now.toISOString(),
        recoveryAfter: recoveryAfter.toISOString(),
        reason: EMPTY_VOICE_CHAT_RECOVERY_REASON
      },
      expiresAt: recoveryAfter
    }
  });
}

async function monitorEmptyActiveVoiceChats(client: TelegramClient, now: Date) {
  const activeStates = await prisma.telegramCommunityState.findMany({
    where: { bot: STATE_BOT, state: 'NATIVE_VOICE_ACTIVE' },
    select: { chatId: true, payload: true }
  });
  const configured = await getSiteConfigMap(['telegramGroupHelpGroupChatId']);
  const configuredMainChatId = configured.telegramGroupHelpGroupChatId?.trim();
  const statesByChatId = new Map(
    activeStates.map((state) => [state.chatId, { ...state, wasAlreadyTracked: true }])
  );
  // Also inspect the main group directly. This covers a voice chat started
  // manually by an administrator before a matching event/state was recorded.
  if (configuredMainChatId && !statesByChatId.has(configuredMainChatId)) {
    statesByChatId.set(configuredMainChatId, {
      chatId: configuredMainChatId,
      payload: null,
      wasAlreadyTracked: false
    });
  }

  for (const state of statesByChatId.values()) {
    const savedPayload = statePayload(state.payload);
    if (state.wasAlreadyTracked && !voiceChatOccupancyCheckDue(savedPayload, now)) {
      continue;
    }
    let currentCall: NativeGroupCallStatus | null;
    try {
      currentCall = await currentTelegramGroupCall(client, state.chatId);
    } catch (error) {
      // An unknown participant count is not the same as an empty call. Keep
      // the state untouched and try again on the next one-minute worker run.
      console.warn(
        `Could not check active Telegram VC occupancy for ${state.chatId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }

    if (!currentCall || currentCall.scheduled) {
      if (state.wasAlreadyTracked) {
        await releaseEndedVoiceState(state.chatId, savedPayload, now);
      }
      continue;
    }

    const sameCall = !savedPayload.nativeCallId || savedPayload.nativeCallId === currentCall.id;
    const basePayload: NativeVoiceSchedulerState = sameCall
      ? savedPayload
      : {
          ...savedPayload,
          emptySince: undefined,
          lastParticipantCheckAt: undefined,
          participantCount: undefined,
          emptyLeaveAlertedAt: undefined
        };
    const knownStarter = knownVoiceStarterForEmptyAlert(basePayload, currentCall.participantCount);
    const tracked = trackEmptyVoiceChat(
      {
        ...basePayload,
        nativeCallId: currentCall.id,
        nativeCallAccessHash: currentCall.accessHash
      },
      currentCall.participantCount,
      now
    );
    let activePayload = await reconcileActiveVoiceEvent(client, tracked.payload, now, currentCall);

    if (currentCall.participantCount > 0) {
      await sendLiveVoiceReminder(state.chatId, activePayload, currentCall.participantCount);
    } else if (knownStarter) {
      activePayload = await alertVoiceStarterWhoLeftItOpen(activePayload, knownStarter, now);
    }

    if (!tracked.shouldClose) {
      await retainActiveVoiceState(state.chatId, activePayload, now);
      continue;
    }

    try {
      await client.api.phone.discardGroupCall({ call: currentCall.inputCall as never });
      await enterEmptyVoiceRecovery(state.chatId, activePayload, now);
      console.log(
        `Closed Telegram voice chat ${currentCall.id} in ${state.chatId} after five empty minutes.`
      );
    } catch (error) {
      // Retain the elapsed timer so the next pass retries the same close. A
      // participant joining before then still clears the timer normally.
      await retainActiveVoiceState(state.chatId, activePayload, now);
      console.warn(
        `Could not close empty Telegram VC in ${state.chatId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
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
      const activePayload = await reconcileActiveVoiceEvent(client, payload, now, activeCall);
      await retainActiveVoiceState(event.chatId, activePayload, now);
      continue;
    }

    // Only the native call belonging to this event may be discarded. A newer
    // event in the same group must never be affected. The exact scheduled
    // timestamp is a recovery path for old slots created before native call
    // credentials were persisted in state.
    const recoveredMissedScheduledCall = Boolean(
      activeCall?.scheduled &&
      activeCall.scheduleDate != null &&
      Math.abs(activeCall.scheduleDate * 1000 - event.startsAt.getTime()) < 60_000 &&
      activeCall.accessHash
    );
    const isTrackedMissedCall =
      payload.eventId === event.id && payload.nativeCallId === activeCall?.id;
    let discardFailed = false;
    if ((isTrackedMissedCall || recoveredMissedScheduledCall) && activeCall?.scheduled) {
      try {
        await client.api.phone.discardGroupCall({ call: activeCall.inputCall as never });
      } catch (error) {
        // Retain the call credentials so the next one-minute reconciliation
        // can release the same stale native slot. Deleting this state here
        // made Telegram's stale schedule look like a live VC for 15 minutes.
        discardFailed = true;
        console.warn(
          `Could not discard missed Telegram voice chat ${event.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    await prisma.telegramCommunityEvent.update({
      where: { id: event.id },
      data: { status: 'MISSED' }
    });
    if (payload.eventId === event.id || recoveredMissedScheduledCall) {
      const retainedPayload =
        payload.eventId === event.id
          ? payload
          : {
              eventId: event.id,
              nativeCallId: activeCall?.id,
              nativeCallAccessHash: activeCall?.accessHash
            };
      if (discardFailed) {
        await deferForScheduledVoiceCall(
          event.chatId,
          retainedPayload,
          now,
          'Retrying release of missed native VC'
        );
      } else {
        // Telegram can continue to return the discarded scheduled call for a
        // short period. Keep its call credentials during that window so the
        // next one-minute pass can verify/discard the *same* stale slot. If
        // we delete this state immediately, the following pass sees a
        // schedule but cannot identify it as the missed VC, leaving every
        // later VC blocked behind it.
        await deferForScheduledVoiceCall(
          event.chatId,
          retainedPayload,
          now,
          'Waiting for Telegram to clear the released missed VC'
        );
      }
    }
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
  // This is a short-lived polling worker that makes explicit API requests. It
  // does not consume Telegram updates; allowing the update manager to replay a
  // large channel backlog can keep a one-shot scheduler alive indefinitely.
  client.updateManager.stop();
  try {
    await sendVoiceHostReminders(now);
    await expireMissedVoiceChats(client, now);
    await monitorEmptyActiveVoiceChats(client, now);
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
      // video_chat_ended updates move the state. A scheduled VC gets one
      // small health check every 15 minutes because Telegram does not notify
      // bots when an administrator discards it before it starts.
      const scheduledStateIsFresh = Boolean(
        state &&
        state.state === 'NATIVE_VOICE_SCHEDULED' &&
        payload.eventId === event.id &&
        Math.min(
          state.expiresAt.getTime(),
          state.updatedAt.getTime() + SCHEDULED_VOICE_HEALTH_CHECK_MS
        ) > now.getTime()
      );
      if (
        scheduledStateIsFresh ||
        ((state?.state === 'NATIVE_VOICE_ACTIVE' || state?.state === 'NATIVE_VOICE_RECOVERY') &&
          state.expiresAt > now) ||
        (state?.state === 'NATIVE_VOICE_RETRY' && state.expiresAt > now)
      ) {
        continue;
      }

      try {
        // A live VC always wins. A scheduled VC is different: it may be the
        // stale native call belonging to an event we just marked MISSED. Do
        // not treat it as active or wait through a 15-minute recovery window.
        const currentCall = await currentTelegramGroupCall(client, event.chatId);
        if (currentCall && !currentCall.scheduled) {
          const activePayload = await reconcileActiveVoiceEvent(client, payload, now, currentCall);
          await retainActiveVoiceState(event.chatId, activePayload, now);
          continue;
        }
        if (currentCall?.scheduled) {
          if (isTrackedScheduledVoiceCall(event, payload, currentCall)) {
            await retainScheduledVoiceState(event.chatId, event, payload, currentCall, now);
            continue;
          }
          if (payload.eventId === event.id) {
            await markVoiceEventCancelledByAdmin(
              event,
              'A different scheduled Telegram VC replaced this slot'
            );
          }
          let releasedStaleCall = false;
          if (payload.eventId && payload.nativeCallId === currentCall.id) {
            const prior = await prisma.telegramCommunityEvent.findUnique({
              where: { id: payload.eventId },
              select: { status: true }
            });
            if (!prior || !['SCHEDULED', 'IN_PROGRESS'].includes(prior.status)) {
              try {
                await client.api.phone.discardGroupCall({
                  call: currentCall.inputCall as never
                });
                releasedStaleCall = true;
                console.log(`Released stale native Telegram VC for ${event.chatId}.`);
              } catch (error) {
                console.warn(
                  `Could not release stale native Telegram VC for ${event.chatId}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            }
          }
          await deferForScheduledVoiceCall(
            event.chatId,
            payload,
            now,
            releasedStaleCall
              ? 'Waiting for Telegram to clear released scheduled VC'
              : 'Another scheduled Telegram VC is still present'
          );
          continue;
        }
        if (state?.state === 'NATIVE_VOICE_SCHEDULED' && payload.eventId === event.id) {
          await markVoiceEventCancelledByAdmin(
            event,
            'Telegram no longer has the tracked scheduled VC'
          );
          // Do not recreate a slot an administrator deliberately removed.
          // The next timer pass schedules the next eligible event instead.
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
            expiresAt: new Date(now.getTime() + SCHEDULED_VOICE_HEALTH_CHECK_MS)
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
            expiresAt: new Date(now.getTime() + SCHEDULED_VOICE_HEALTH_CHECK_MS)
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
        await notifyVoiceScheduleFailure(event, message);
      }
    }

    // Directory maintenance is lower priority than VC lifecycle work. Run it
    // last so a slow Telegram participant listing can never delay occupancy
    // checks, live reminders, empty-room recovery, or the next scheduled VC.
    try {
      const memberSync = await synchronizeConfiguredTelegramGroupMembers(client);
      for (const result of memberSync) {
        if (result.skipped) continue;
        console.log(
          `Synchronized ${result.scope} Telegram directory ${result.chatId}: ${result.active} active, ${result.administrators} administrators, ${result.departed} departed.`
        );
      }
    } catch (error) {
      // A later scheduler run retries because a failed sync never advances its
      // state. The systemd runtime limit also protects against a stalled call.
      console.warn(
        `Telegram member directory sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
