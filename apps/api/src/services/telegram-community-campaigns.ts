import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { drainDueTelegramCampaigns } from './telegram-campaign-sweep.js';
import {
  joinCaptchaAnswerAllowed,
  captchaNeedsStaffReview,
  canDecideCaptchaReview,
  joinWelcomeCleanupDelay,
  joinVerificationMatches,
  captchaReviewRetryDelay,
  captchaReviewReady,
  joinWelcomeDeleteAfter,
  verifiedJoinKeyboard,
  withoutJoinCaptchaQuestion
} from './telegram-join-captcha-policy.js';
import { prisma } from '../db.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import {
  editCommunityReplyMarkup,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import { configuredUrlKeyboard } from './telegram-keyboard-config.js';
import { colorizeTelegramKeyboard } from './telegram-button-styles.js';
import { getSiteConfigMap } from './site-config.service.js';
import {
  cleanupCommunityBotData,
  runScheduledCommunityMessageCleanup,
  scheduleCommunityMessageCleanup
} from './telegram-community-bots.store.js';
import {
  EPHEMERAL_CONFESSION_CAMPAIGN_ID,
  shouldApplyTelegramSmartSchedule,
  telegramCampaignDeleteAfter
} from './telegram-community-campaign-policy.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import { observeTelegramCommunityMember } from './telegram-community-member-identity.js';
import {
  claimTelegramMembershipTransition,
  claimTelegramOperation,
  releaseTelegramMembershipTransition,
  releaseTelegramOperation
} from './telegram-community-operation-claims.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';
import { telegramGroupCallButton } from './telegram-group-call-link.js';
import { runTelegramContentNetworkScheduler } from './telegram-content-network.js';
import { runTelegramDailyVcTopicPlanner } from './telegram-community-vc-topics.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { TELEGRAM_BOT_URLS } from '../constants/telegram-community-bot.constants.js';
import {
  endTelegramCommunityLockdown,
  expiredTelegramCommunityLockdowns,
  getTelegramCommunityGroupPolicy,
  savedLockdownPermissions
} from './telegram-community-group-policy.js';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';
import { formatGroupHelpMessage } from './telegram-group-help.formatting.js';
import { renderGroupHelpFilterHtml } from './telegram-group-help.filters.js';
import { runRepeatedGroupHelpNotes } from './telegram-group-help.note-actions.js';
import {
  EMPTY_VOICE_CHAT_RECOVERY_MS,
  EMPTY_VOICE_CHAT_RECOVERY_REASON,
  type VoiceParticipantSnapshot,
  voiceStarterSnapshot
} from './telegram-voice-empty-timeout.js';
import { isManagedTelegramVoiceChat } from './telegram-voice-event-reconciliation.js';

const CAMPAIGN_BOT = GROUP_HELP_BOT_SLUG;
const MAX_DELIVERIES_PER_SWEEP = 20;
const ENGAGEMENT_CAMPAIGN_ID = 'seed_telegram_hourly_engagement';
const VOICE_EVENT_ANNOUNCEMENT_LEAD_MS = 60 * 60 * 1000;
// A Telegram group can keep only one live or scheduled voice chat. After a
// call ends, leave a short handover window before restoring the next slot.
const VOICE_EVENT_RECOVERY_DELAY_MS = 15 * 60 * 1000;
const NATIVE_VOICE_SCHEDULER_STATE = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';
const EVENT_ANNOUNCEMENT_CLAIM = 'telegram-event-announcement';
const EVENT_REMINDER_CLAIM = 'telegram-event-reminder';

type NativeVoiceStatePayload = {
  eventId?: string;
  nativeCallId?: string;
  nativeCallAccessHash?: string;
  startedAt?: string;
  startedEarly?: boolean;
  endedAt?: string;
  recoveryAfter?: string;
  reason?: string;
  startedBy?: VoiceParticipantSnapshot;
};

function nativeVoiceStatePayload(
  value: Prisma.JsonValue | null | undefined
): NativeVoiceStatePayload {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as NativeVoiceStatePayload)
    : {};
}

export const telegramCampaignSweepEnabled =
  (process.env.TELEGRAM_CAMPAIGN_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';

export const telegramCampaignSweepIntervalMs = Math.max(
  30_000,
  Number(process.env.TELEGRAM_CAMPAIGN_SWEEP_INTERVAL_MS || 60_000)
);

type SentTelegramMessage = {
  message_id: number;
  poll?: {
    id: string;
    total_voter_count?: number;
    question?: string;
    options?: Array<{ text: string; voter_count: number }>;
    is_anonymous?: boolean;
    [key: string]: unknown;
  };
};

type CampaignButton = {
  text: string;
  url: string;
  style?: 'primary' | 'success' | 'danger';
};

function campaignItemKeyboard(buttons: unknown) {
  if (!Array.isArray(buttons)) return undefined;
  const validButtons = buttons.filter(
    (button): button is CampaignButton =>
      Boolean(button) &&
      typeof button === 'object' &&
      typeof (button as CampaignButton).text === 'string' &&
      typeof (button as CampaignButton).url === 'string' &&
      /^https:\/\//i.test((button as CampaignButton).url)
  );
  if (!validButtons.length) return undefined;
  const inline_keyboard = [] as Array<typeof validButtons>;
  for (let index = 0; index < validButtons.length; index += 2) {
    inline_keyboard.push(validButtons.slice(index, index + 2));
  }
  return colorizeTelegramKeyboard({ inline_keyboard });
}

function jsonArray(value: Prisma.JsonValue | null | undefined): unknown[] {
  return Array.isArray(value) ? value : [];
}

function nextSchedule(now: Date, intervalMinutes: number) {
  return new Date(now.getTime() + Math.max(1, intervalMinutes) * 60_000);
}

function isWelcomeVideo(url: string) {
  const filename = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v)$/.test(filename);
}

function communityMediaPayload(url: string) {
  if (isWelcomeVideo(url)) {
    return { method: 'sendVideo' as const, media: { video: url } };
  }
  const filename = url.split('?')[0].toLowerCase();
  if (/\.(gif|webp)$/.test(filename)) {
    return { method: 'sendAnimation' as const, media: { animation: url } };
  }
  return { method: 'sendPhoto' as const, media: { photo: url } };
}

const COMMUNITY_CONFIG_KEYS = [
  'telegramCommunityWelcomeEnabled',
  'telegramGroupHelpAutoDeleteSeconds',
  'telegramGroupHelpWelcomeCleanup',
  'telegramGroupHelpJoinLeaveMessages',
  'telegramGroupHelpWelcomeMessage',
  'telegramGroupHelpWelcomeImageUrl',
  'telegramGroupHelpLiveVoiceImageUrl',
  'telegramGroupHelpWelcomeButtons',
  'telegramGroupHelpGroupChatId',
  'telegramGroupHelpOffTopicGroupChatId',
  'telegramGroupHelpMainGroupUrl',
  'telegramGroupHelpOffTopicGroupUrl',
  'telegramGroupHelpGroupTitle',
  'telegramGroupHelpGoodbyeMessage',
  'telegramGroupHelpJoinProtection',
  'telegramGroupHelpCaptchaMode',
  'telegramGroupHelpNewMemberAction',
  'telegramGroupHelpCaptchaPendingMinutes',
  'telegramGroupHelpCaptchaSuccessCleanupMinutes',
  'telegramGroupHelpLogChannelId',
  'telegramGroupHelpStaffGroupId',
  'telegramCommunityDefaultTopicId',
  'telegramCommunitySupportUrl',
  'telegramCampaignContactUrl',
  'telegramCommunityAnnouncementPinMode',
  'telegramCommunityAnnouncementPinMinutes',
  'telegramCommunityAnnouncementReplacePin',
  'telegramCommunityVoiceReminderCleanupMinutes'
] as const;

const SMART_SCHEDULE_CONFIG_KEYS = [
  'telegramCommunitySmartScheduleEnabled',
  'telegramCommunityScheduleStart',
  'telegramCommunityScheduleEnd',
  'telegramCommunityActiveChatPauseMinutes',
  'telegramCommunityMinimumPostGapMinutes',
  'telegramCommunityContentRepeatDays'
] as const;

async function communityConfig(chatId?: string) {
  const [stored, policy] = await Promise.all([
    getSiteConfigMap(COMMUNITY_CONFIG_KEYS),
    chatId ? getTelegramCommunityGroupPolicy(chatId) : Promise.resolve({} as Record<string, string>)
  ]);
  const values: Record<string, string> = { ...stored, ...policy };
  return {
    welcomeEnabled: values.telegramCommunityWelcomeEnabled !== 'Disabled',
    autoDeleteSeconds: boundedNumber(values.telegramGroupHelpAutoDeleteSeconds, 60, 0, 604_800),
    cleanJoinNotice: values.telegramGroupHelpWelcomeCleanup !== 'off',
    joinLeaveMessages: values.telegramGroupHelpJoinLeaveMessages || 'join only',
    welcomeText:
      values.telegramGroupHelpWelcomeMessage ||
      'Welcome to Hope Hub 💙 Participate at your own pace and protect your personal details.',
    welcomeMediaUrl: values.telegramGroupHelpWelcomeImageUrl?.trim() || '',
    liveVoiceImageUrl: values.telegramGroupHelpLiveVoiceImageUrl?.trim() || '',
    welcomeKeyboard: withCrossCommunityButton(
      {
        inline_keyboard: [
          [{ text: 'About Hope Hub', callback_data: 'hh_welcome_about', style: 'success' }],
          ...(configuredUrlKeyboard(values.telegramGroupHelpWelcomeButtons || '')
            ?.inline_keyboard || [])
        ]
      },
      values,
      chatId
    ),
    goodbyeText: values.telegramGroupHelpGoodbyeMessage?.trim() || '',
    joinProtection: values.telegramGroupHelpJoinProtection || 'off',
    captchaMode: values.telegramGroupHelpCaptchaMode || 'on',
    captchaMaxAttempts: boundedNumber(values.telegramGroupHelpCaptchaMaxAttempts, 3, 1, 10),
    captchaSuccessCleanupSeconds: boundedNumber(
      values.telegramGroupHelpCaptchaSuccessCleanupSeconds,
      30,
      1,
      3600
    ),
    failedVerificationAction: values.telegramGroupHelpNewMemberAction || 'staff review',
    captchaPendingMinutes: boundedNumber(
      values.telegramGroupHelpCaptchaPendingMinutes,
      60,
      1,
      1_440
    ),
    captchaSuccessCleanupMinutes: boundedNumber(
      values.telegramGroupHelpCaptchaSuccessCleanupMinutes,
      5,
      1,
      1_440
    ),
    logChannelId: values.telegramGroupHelpLogChannelId?.trim() || '',
    staffGroupId: values.telegramGroupHelpStaffGroupId?.trim() || '',
    defaultTopicId: boundedNumber(values.telegramCommunityDefaultTopicId, 0, 0, 2_147_483_647),
    supportUrl: values.telegramCommunitySupportUrl || 'https://hopehub.in/#live-connect',
    contactUrl: values.telegramCampaignContactUrl || TELEGRAM_BOT_URLS.CONTACT,
    announcementPinMode: values.telegramCommunityAnnouncementPinMode || 'off',
    announcementPinMinutes: boundedNumber(
      values.telegramCommunityAnnouncementPinMinutes,
      60,
      0,
      43_200
    ),
    announcementReplacePin: values.telegramCommunityAnnouncementReplacePin !== 'no',
    voiceReminderCleanupMinutes: boundedNumber(
      values.telegramCommunityVoiceReminderCleanupMinutes,
      15,
      0,
      1_440
    )
  };
}

const ANNOUNCEMENT_PIN_STATE = 'community-announcement-pin';

async function manageAnnouncementPin(
  config: Awaited<ReturnType<typeof communityConfig>>,
  chatId: string,
  messageId: number,
  kind: 'event' | 'campaign' | 'announcement',
  force = false
) {
  const shouldPin =
    force ||
    config.announcementPinMode === 'all announcements' ||
    // Retain compatibility with settings saved before this option was renamed.
    config.announcementPinMode === 'all scheduled announcements' ||
    (config.announcementPinMode === 'events only' && kind === 'event');
  if (!shouldPin) return;
  const previous = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: ANNOUNCEMENT_PIN_STATE, chatId } }
  });
  const previousId = Number((previous?.payload as { messageId?: unknown } | null)?.messageId || 0);
  if (config.announcementReplacePin && previousId && previousId !== messageId) {
    await callCommunityTelegramApi(CAMPAIGN_BOT, 'unpinChatMessage', {
      chat_id: chatId,
      message_id: previousId
    }).catch(() => null);
  }
  await callCommunityTelegramApi(CAMPAIGN_BOT, 'pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: true
  });
  const expiresAt =
    config.announcementPinMinutes > 0
      ? new Date(Date.now() + config.announcementPinMinutes * 60_000)
      : new Date('9999-12-31T00:00:00.000Z');
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: ANNOUNCEMENT_PIN_STATE, chatId } },
    create: {
      bot: ANNOUNCEMENT_PIN_STATE,
      chatId,
      state: 'pinned',
      payload: { messageId },
      expiresAt
    },
    update: { state: 'pinned', payload: { messageId }, expiresAt }
  });
}

/**
 * Applies the shared announcement pin policy to messages sent outside the
 * campaign scheduler, such as an admin's one-off announcement.  Campaign
 * posts include polls, quotes and posts inside a Telegram topic automatically.
 */
export async function applyTelegramCommunityAnnouncementPin(input: {
  chatId: string;
  messageId: number;
  kind?: 'event' | 'campaign' | 'announcement';
  force?: boolean;
}) {
  await manageAnnouncementPin(
    await communityConfig(),
    input.chatId,
    input.messageId,
    input.kind || 'announcement',
    input.force === true
  );
}

async function unpinExpiredAnnouncements(now: Date) {
  const pins = await prisma.telegramCommunityState.findMany({
    where: { bot: ANNOUNCEMENT_PIN_STATE, expiresAt: { lte: now } }
  });
  await Promise.allSettled(
    pins.map(async (pin) => {
      const messageId = Number((pin.payload as { messageId?: unknown } | null)?.messageId || 0);
      if (messageId)
        await callCommunityTelegramApi(CAMPAIGN_BOT, 'unpinChatMessage', {
          chat_id: pin.chatId,
          message_id: messageId
        });
      await prisma.telegramCommunityState.delete({
        where: { bot_chatId: { bot: pin.bot, chatId: pin.chatId } }
      });
    })
  );
}

async function logCommunityActivity(
  config: Awaited<ReturnType<typeof communityConfig>>,
  title: string,
  details: Array<string | null | undefined> = []
) {
  await sendGroupHelpActivityLog(
    { telegramGroupHelpLogChannelId: config.logChannelId },
    title,
    details
  );
}

function escapeTelegramMarkdown(value: string) {
  return value.replace(/[_*~|`()[\]]/g, '\\$&');
}

function memberMention(member: { id: number; username?: string; first_name?: string }) {
  if (member.username) return `@${escapeTelegramMarkdown(member.username)}`;
  const name = escapeTelegramMarkdown(member.first_name?.trim() || 'there');
  return `[${name}](tg://user?id=${member.id})`;
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function timeMinutes(value: string | undefined, fallback: number) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() || '');
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : fallback;
}

function indiaMinuteOfDay(now: Date) {
  const india = new Date(now.getTime() + 330 * 60_000);
  return india.getUTCHours() * 60 + india.getUTCMinutes();
}

function nextIndiaScheduleStart(now: Date, startMinute: number, tomorrow = false) {
  const offsetMs = 330 * 60_000;
  const india = new Date(now.getTime() + offsetMs);
  const target = new Date(
    Date.UTC(
      india.getUTCFullYear(),
      india.getUTCMonth(),
      india.getUTCDate() + (tomorrow ? 1 : 0),
      Math.floor(startMinute / 60),
      startMinute % 60
    ) - offsetMs
  );
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target;
}

async function smartSchedulePolicy() {
  const values = await getSiteConfigMap(SMART_SCHEDULE_CONFIG_KEYS);
  return {
    enabled: values.telegramCommunitySmartScheduleEnabled !== 'Disabled',
    startMinute: timeMinutes(values.telegramCommunityScheduleStart, 0),
    endMinute: timeMinutes(values.telegramCommunityScheduleEnd, 0),
    activePauseMinutes: boundedNumber(values.telegramCommunityActiveChatPauseMinutes, 30, 0, 1440),
    minimumGapMinutes: boundedNumber(values.telegramCommunityMinimumPostGapMinutes, 45, 0, 1440),
    repeatDays: boundedNumber(values.telegramCommunityContentRepeatDays, 30, 1, 365)
  };
}

export async function recordTelegramCommunityActivity(chatId: string, at = new Date()) {
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: 'hopehubai-activity', chatId } },
    create: {
      bot: 'hopehubai-activity',
      chatId,
      state: 'MEMBER_MESSAGE',
      payload: { lastMessageAt: at.toISOString() },
      expiresAt: new Date(at.getTime() + 366 * 24 * 60 * 60_000)
    },
    update: {
      state: 'MEMBER_MESSAGE',
      payload: { lastMessageAt: at.toISOString() },
      expiresAt: new Date(at.getTime() + 366 * 24 * 60 * 60_000)
    }
  });
}

async function weeklySummary(chatId: string, intro?: string | null) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [posts, pollVotes, reactions, upcomingEvents] = await Promise.all([
    prisma.telegramCampaignDelivery.count({
      where: { campaign: { chatId }, status: { in: ['SENT', 'CLOSED'] }, sentAt: { gte: since } }
    }),
    prisma.telegramPollVote.count({
      where: { delivery: { campaign: { chatId }, sentAt: { gte: since } } }
    }),
    prisma.telegramCommunityReaction.count({ where: { chatId, reactedAt: { gte: since } } }),
    prisma.telegramCommunityEvent.count({
      where: { chatId, status: 'SCHEDULED', startsAt: { gte: new Date() } }
    })
  ]);
  return [
    intro?.trim() || '💙 Hope Hub community week',
    '',
    `${posts} community posts`,
    `${pollVotes} poll responses`,
    `${reactions} helpful reactions`,
    `${upcomingEvents} upcoming circles`,
    '',
    'Thank you for making this a kinder space.'
  ].join('\n');
}

async function claimNextCampaign(now: Date) {
  const candidates = await prisma.telegramCampaign.findMany({
    where: { isActive: true, nextRunAt: { lte: now }, items: { some: {} } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { nextRunAt: 'asc' },
    take: MAX_DELIVERIES_PER_SWEEP
  });
  if (!candidates.length) return null;

  const policy = await smartSchedulePolicy();
  for (const candidate of candidates) {
    if (!candidate.nextRunAt || !candidate.items.length) continue;
    let selectedIndex = Math.min(candidate.currentItemIndex, candidate.items.length - 1);

    if (policy.enabled && shouldApplyTelegramSmartSchedule(candidate.id)) {
      const minute = indiaMinuteOfDay(now);
      const inActiveHours =
        policy.startMinute === policy.endMinute
          ? true
          : policy.startMinute < policy.endMinute
            ? minute >= policy.startMinute && minute < policy.endMinute
            : minute >= policy.startMinute || minute < policy.endMinute;
      const [lastDelivery, activity] = await Promise.all([
        prisma.telegramCampaignDelivery.findFirst({
          where: {
            campaign: { chatId: candidate.chatId },
            campaignId: { not: EPHEMERAL_CONFESSION_CAMPAIGN_ID },
            status: { in: ['SENT', 'CLOSED'] },
            sentAt: { not: null }
          },
          select: { sentAt: true },
          orderBy: { sentAt: 'desc' }
        }),
        prisma.telegramCommunityState.findUnique({
          where: { bot_chatId: { bot: 'hopehubai-activity', chatId: candidate.chatId } },
          select: { updatedAt: true }
        })
      ]);

      const activeUntil = activity
        ? new Date(activity.updatedAt.getTime() + policy.activePauseMinutes * 60_000)
        : null;
      const gapUntil = lastDelivery?.sentAt
        ? new Date(lastDelivery.sentAt.getTime() + policy.minimumGapMinutes * 60_000)
        : null;
      const shouldDefer =
        !inActiveHours ||
        Boolean(activeUntil && activeUntil > now) ||
        Boolean(gapUntil && gapUntil > now);
      if (shouldDefer) {
        const nextCheck = !inActiveHours
          ? nextIndiaScheduleStart(now, policy.startMinute)
          : new Date(
              Math.max(
                now.getTime() + 15 * 60_000,
                activeUntil?.getTime() || 0,
                gapUntil?.getTime() || 0
              )
            );
        await prisma.telegramCampaign.updateMany({
          where: { id: candidate.id, nextRunAt: candidate.nextRunAt },
          data: { nextRunAt: nextCheck }
        });
        continue;
      }

      if (candidate.id === ENGAGEMENT_CAMPAIGN_ID) {
        const repeatCutoff = new Date(now.getTime() - policy.repeatDays * 24 * 60 * 60_000);
        const recent = await prisma.telegramCampaignDelivery.findMany({
          where: {
            campaignId: candidate.id,
            itemId: { not: null },
            status: { in: ['SENT', 'CLOSED'] },
            sentAt: { gte: repeatCutoff }
          },
          select: { itemId: true }
        });
        const recentIds = new Set(recent.map((delivery) => delivery.itemId));
        const eligibleOffset = Array.from(
          { length: candidate.items.length },
          (_, offset) => (selectedIndex + offset) % candidate.items.length
        ).find((index) => !recentIds.has(candidate.items[index].id));
        if (eligibleOffset == null) {
          await prisma.telegramCampaign.updateMany({
            where: { id: candidate.id, nextRunAt: candidate.nextRunAt },
            data: { nextRunAt: new Date(now.getTime() + 12 * 60 * 60_000) }
          });
          continue;
        }
        selectedIndex = eligibleOffset;
      }
    }

    const isLast = selectedIndex >= candidate.items.length - 1;
    // A non-repeating campaign that has just delivered its last item is
    // considered complete — mark it inactive so it does not run again.
    // A repeating campaign (or one that still has items remaining) continues.
    const shouldContinue = candidate.repeat || !isLast;
    const delivery = await prisma.$transaction(async (tx) => {
      const claimed = await tx.telegramCampaign.updateMany({
        where: {
          id: candidate.id,
          isActive: true,
          nextRunAt: candidate.nextRunAt,
          currentItemIndex: candidate.currentItemIndex
        },
        data: {
          currentItemIndex: isLast ? 0 : selectedIndex + 1,
          lastRunAt: now,
          isActive: shouldContinue,
          nextRunAt: shouldContinue ? nextSchedule(now, candidate.intervalMinutes) : null
        }
      });
      if (!claimed.count) return null;
      return tx.telegramCampaignDelivery.create({
        data: {
          campaignId: candidate.id,
          itemId: candidate.items[selectedIndex].id,
          status: 'SENDING'
        }
      });
    });
    if (!delivery) continue;
    console.info('[telegram-campaign] Scheduled post claimed', {
      campaignId: candidate.id,
      deliveryId: delivery.id,
      dueAt: candidate.nextRunAt,
      claimedAt: now
    });
    return { campaign: candidate, item: candidate.items[selectedIndex], deliveryId: delivery.id };
  }
  return null;
}

async function deliverClaimedCampaign(
  claimed: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>,
  now: Date
) {
  const { campaign, item, deliveryId } = claimed;
  await performCampaignDelivery({ deliveryId, campaign, item, now });
}

async function performCampaignDelivery(input: {
  deliveryId: string;
  campaign: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>['campaign'];
  item: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>['item'];
  now: Date;
}) {
  const { deliveryId, campaign, item, now } = input;
  await prisma.telegramCampaignDelivery.update({
    where: { id: deliveryId },
    data: { attempts: { increment: 1 }, nextRetryAt: null }
  });
  let delivered = false;
  try {
    const config = await communityConfig(campaign.chatId);
    const messageThreadId = item.messageThreadId || config.defaultTopicId || undefined;
    let sent: SentTelegramMessage;
    if (item.kind === 'POLL' || item.kind === 'WELLBEING_POLL') {
      const options = jsonArray(item.pollOptions)
        .map((option) => String(option).trim())
        .filter(Boolean);
      if (!item.pollQuestion || options.length < 2) {
        throw new Error('Poll requires a question and at least two options.');
      }
      const correctOptionIds = jsonArray(item.correctOptionIds)
        .map(Number)
        .filter((value) => Number.isInteger(value) && value >= 0);
      sent = await callCommunityTelegramApi<SentTelegramMessage>(CAMPAIGN_BOT, 'sendPoll', {
        chat_id: campaign.chatId,
        question: item.pollQuestion,
        options: options.map((text) => ({ text })),
        is_anonymous: item.pollAnonymous,
        type: item.pollQuiz ? 'quiz' : 'regular',
        allows_multiple_answers: item.pollMultiple,
        ...(item.pollQuiz && correctOptionIds.length
          ? { correct_option_id: correctOptionIds[0] }
          : {}),
        ...(item.pollExplanation ? { explanation: item.pollExplanation } : {}),
        ...(item.closeAfterMinutes
          ? { open_period: Math.max(5, Math.min(2_628_000, item.closeAfterMinutes * 60)) }
          : {}),
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {})
      });
    } else if (item.imageUrl) {
      const media = communityMediaPayload(item.imageUrl);
      sent = await callCommunityTelegramApi<SentTelegramMessage>(CAMPAIGN_BOT, media.method, {
        chat_id: campaign.chatId,
        ...media.media,
        caption: (item.text || '').slice(0, 1024),
        ...(campaignItemKeyboard(item.buttons)
          ? { reply_markup: campaignItemKeyboard(item.buttons) }
          : {}),
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {})
      });
    } else {
      const text =
        item.kind === 'SUMMARY' ? await weeklySummary(campaign.chatId, item.text) : item.text;
      sent = await callCommunityTelegramApi<SentTelegramMessage>(CAMPAIGN_BOT, 'sendMessage', {
        chat_id: campaign.chatId,
        text,
        disable_web_page_preview: true,
        ...(campaignItemKeyboard(item.buttons)
          ? { reply_markup: campaignItemKeyboard(item.buttons) }
          : {}),
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {})
      });
    }

    delivered = true;
    console.info('[telegram-campaign] Scheduled post sent', {
      campaignId: campaign.id,
      deliveryId,
      messageId: sent.message_id
    });
    const sentAt = new Date();
    await prisma.telegramCampaignDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'SENT',
        telegramMessageId: sent.message_id,
        telegramPollId: sent.poll?.id,
        pollSnapshot: sent.poll as Prisma.InputJsonValue | undefined,
        totalVoterCount: sent.poll?.total_voter_count || 0,
        closesAt: item.closeAfterMinutes
          ? new Date(now.getTime() + item.closeAfterMinutes * 60_000)
          : null,
        sentAt,
        nextRetryAt: null
      }
    });
    const deleteAfter = telegramCampaignDeleteAfter(sentAt, item.deleteAfterMinutes);
    if (deleteAfter) {
      await scheduleCommunityMessageCleanup({
        bot: CAMPAIGN_BOT,
        chatId: campaign.chatId,
        messageId: sent.message_id,
        kind: 'campaign',
        deleteAfter
      });
    }
    await manageAnnouncementPin(config, campaign.chatId, sent.message_id, 'campaign');
    await logCommunityActivity(config, 'Scheduled community post delivered', [
      `Group: ${campaign.chatId}`,
      `Content type: ${item.kind}`,
      `Delivery: ${deliveryId}`
    ]);
  } catch (error) {
    if (delivered) {
      // Pin, audit or cleanup failure must never resend an accepted message.
      console.error('[telegram-campaign] Post delivered; follow-up failed', {
        deliveryId,
        error: String(error)
      });
      return;
    }
    const detail = String(error instanceof Error ? error.message : error);
    const retrySeconds = Number(/Retry after (\d+) seconds/i.exec(detail)?.[1] || 0);
    await prisma.telegramCampaignDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        error: String(error instanceof Error ? error.message : error).slice(0, 1000),
        nextRetryAt: new Date(Date.now() + Math.max(60, retrySeconds + 1) * 1000)
      }
    });
    const config = await communityConfig();
    await logCommunityActivity(config, 'Scheduled community post failed', [
      `Group: ${campaign.chatId}`,
      `Content type: ${item.kind}`,
      `Delivery: ${deliveryId}`,
      'It will retry automatically.'
    ]).catch((error) => console.error('[telegram-campaign] Failure audit unavailable', error));
  }
}

export async function retryTelegramCampaignDelivery(deliveryId: string, now = new Date()) {
  const delivery = await prisma.telegramCampaignDelivery.findUnique({
    where: { id: deliveryId },
    include: { campaign: { include: { items: { orderBy: { sortOrder: 'asc' } } } }, item: true }
  });
  if (!delivery || !delivery.item) throw new Error('Failed Telegram delivery not found.');
  if (delivery.status !== 'FAILED') throw new Error('Only failed deliveries can be retried.');
  const claimed = await prisma.telegramCampaignDelivery.updateMany({
    where: { id: delivery.id, status: 'FAILED' },
    data: { status: 'SENDING', error: null }
  });
  if (!claimed.count) throw new Error('This delivery is already being retried.');
  await performCampaignDelivery({
    deliveryId: delivery.id,
    campaign: delivery.campaign,
    item: delivery.item,
    now
  });
  return prisma.telegramCampaignDelivery.findUnique({ where: { id: delivery.id } });
}

async function closeExpiredPolls(now: Date) {
  const deliveries = await prisma.telegramCampaignDelivery.findMany({
    where: {
      status: 'SENT',
      telegramPollId: { not: null },
      telegramMessageId: { not: null },
      closesAt: { lte: now }
    },
    include: { campaign: { select: { chatId: true } } },
    take: MAX_DELIVERIES_PER_SWEEP
  });
  await Promise.allSettled(
    deliveries.map(async (delivery) => {
      const poll = await callCommunityTelegramApi<Record<string, unknown>>(
        CAMPAIGN_BOT,
        'stopPoll',
        { chat_id: delivery.campaign.chatId, message_id: delivery.telegramMessageId }
      );
      await prisma.telegramCampaignDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CLOSED', pollSnapshot: poll as Prisma.InputJsonValue }
      });
    })
  );
}

async function restoreExpiredCommunityLockdowns(now: Date) {
  const lockouts = await expiredTelegramCommunityLockdowns(now);
  await Promise.allSettled(
    lockouts.map(async (lockout) => {
      const permissions = savedLockdownPermissions(lockout.settings) || { can_send_messages: true };
      await callCommunityTelegramApi(CAMPAIGN_BOT, 'setChatPermissions', {
        chat_id: lockout.chatId,
        permissions
      });
      await endTelegramCommunityLockdown(lockout.chatId);
      await sendCommunityMessage(CAMPAIGN_BOT, lockout.chatId, '🔓 Chat unlocked automatically.');
      const config = await communityConfig();
      await logCommunityActivity(config, 'Chat unlocked automatically', [
        `Group: ${lockout.chatId}`
      ]);
    })
  );
}

let campaignSweepRunning = false;
export async function runTelegramCampaignScheduler(now = new Date()) {
  if (campaignSweepRunning) return;
  campaignSweepRunning = true;
  try {
    await runCampaignSweep(now);
  } finally {
    campaignSweepRunning = false;
  }
}

async function runCampaignSweep(now: Date) {
  const isolated = async (name: string, work: () => Promise<unknown>) => {
    try {
      await work();
    } catch (error) {
      console.error('[telegram-campaign] Scheduler task failed', {
        task: name,
        error: String(error)
      });
    }
  };
  if (telegramCampaignSweepEnabled) {
    await isolated('due-posts', async () => {
      await drainDueTelegramCampaigns({
        claim: () => claimNextCampaign(now),
        deliver: (claimed) => deliverClaimedCampaign(claimed, now),
        onError: (claimed, error) =>
          console.error('[telegram-campaign] Delivery failed', {
            campaignId: claimed.campaign.id,
            error: String(error)
          }),
        limit: MAX_DELIVERIES_PER_SWEEP
      });
    });
    await isolated('delivery-retries', async () => {
      const retries = await prisma.telegramCampaignDelivery.findMany({
        where: { status: 'FAILED', nextRetryAt: { lte: now } },
        select: { id: true },
        orderBy: { nextRetryAt: 'asc' },
        take: 5
      });
      await Promise.allSettled(
        retries.map((delivery) => retryTelegramCampaignDelivery(delivery.id, now))
      );
    });
  }
  await isolated('runScheduledCommunityMessageCleanup', () =>
    runScheduledCommunityMessageCleanup(now)
  );
  await runRepeatedGroupHelpNotes(now).catch((error) =>
    console.error('[telegram-group-help] Repeated-note scheduler failed.', error)
  );
  await isolated('unpinExpiredAnnouncements', () => unpinExpiredAnnouncements(now));
  await isolated('runCommunityDataRetentionCleanupHourly', () =>
    runCommunityDataRetentionCleanupHourly(now)
  );
  await isolated('restoreExpiredCommunityLockdowns', () => restoreExpiredCommunityLockdowns(now));
  if (!telegramCampaignSweepEnabled) return;
  await isolated('runTelegramContentNetworkScheduler', () =>
    runTelegramContentNetworkScheduler(now)
  );
  try {
    await runTelegramDailyVcTopicPlanner(now);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[telegram-vc-topics] Daily topic planner failed.', error);
    await communityConfig()
      .then((config) =>
        logCommunityActivity(config, 'Daily VC topic planner failed', [
          `Reason: ${detail}`,
          'The normal VC scheduler and community campaigns will continue.'
        ])
      )
      .catch(() => null);
  }
  await isolated('runTelegramCommunityEventScheduler', () =>
    runTelegramCommunityEventScheduler(now)
  );
  await isolated('closeExpiredPolls', () => closeExpiredPolls(now));
}

export async function handleTelegramCommunityVoiceChatEnded(message: CommunityTelegramMessage) {
  if (!message.video_chat_ended || !['group', 'supergroup'].includes(message.chat.type || '')) {
    return false;
  }
  const chatId = String(message.chat.id);
  const voiceConfig = await getSiteConfigMap(['telegramGroupHelpGroupChatId']);
  if (!isManagedTelegramVoiceChat(chatId, voiceConfig.telegramGroupHelpGroupChatId)) return false;
  const now = new Date();
  const stateKey = { bot_chatId: { bot: NATIVE_VOICE_SCHEDULER_STATE, chatId } };
  const nativeState = await prisma.telegramCommunityState.findUnique({ where: stateKey });
  const nativePayload = nativeVoiceStatePayload(nativeState?.payload);
  const wasClosedBecauseEmpty = nativePayload.reason === EMPTY_VOICE_CHAT_RECOVERY_REASON;
  const recoveryAfter = new Date(
    now.getTime() +
      (wasClosedBecauseEmpty ? EMPTY_VOICE_CHAT_RECOVERY_MS : VOICE_EVENT_RECOVERY_DELAY_MS)
  );
  const linkedEvent = nativePayload.eventId
    ? await prisma.telegramCommunityEvent.findUnique({ where: { id: nativePayload.eventId } })
    : null;
  const current = await prisma.telegramCommunityEvent.findFirst({
    where: {
      chatId,
      // If Telegram tells us a call ended, it genuinely ran even when a delayed
      // webhook had previously marked its event as missed.
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'MISSED'] },
      startsAt: { lte: now, gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
    },
    orderBy: { startsAt: 'desc' }
  });
  // A host can start a future scheduled VC early. In that case the future
  // slot must remain SCHEDULED so it can be restored after the handover gap.
  const completedEvent = linkedEvent && linkedEvent.startsAt <= now ? linkedEvent : current;
  if (completedEvent) {
    await prisma.telegramCommunityEvent.update({
      where: { id: completedEvent.id },
      data: { status: 'COMPLETED' }
    });
  }
  // Preserve a future planned slot, but do not recreate it immediately. The
  // native worker wakes at the recovery time and verifies Telegram once.
  await prisma.telegramCommunityState.upsert({
    where: stateKey,
    create: {
      bot: NATIVE_VOICE_SCHEDULER_STATE,
      chatId,
      state: 'NATIVE_VOICE_RECOVERY',
      payload: {
        eventId: nativePayload.eventId,
        endedAt: now.toISOString(),
        recoveryAfter: recoveryAfter.toISOString(),
        ...(wasClosedBecauseEmpty ? { reason: EMPTY_VOICE_CHAT_RECOVERY_REASON } : {})
      },
      expiresAt: recoveryAfter
    },
    update: {
      state: 'NATIVE_VOICE_RECOVERY',
      payload: {
        eventId: nativePayload.eventId,
        endedAt: now.toISOString(),
        recoveryAfter: recoveryAfter.toISOString(),
        ...(wasClosedBecauseEmpty ? { reason: EMPTY_VOICE_CHAT_RECOVERY_REASON } : {})
      },
      expiresAt: recoveryAfter
    }
  });
  const next = await prisma.telegramCommunityEvent.findFirst({
    where: { chatId, status: 'SCHEDULED', startsAt: { gt: now }, announcedAt: null },
    orderBy: { startsAt: 'asc' }
  });
  if (next) {
    await prisma.telegramCommunityEvent.update({
      where: { id: next.id },
      data: {
        // Announce an upcoming circle one hour before it begins. If a call
        // ended later than that, announce the next one immediately instead.
        announcementDueAt: new Date(
          Math.max(now.getTime(), next.startsAt.getTime() - VOICE_EVENT_ANNOUNCEMENT_LEAD_MS)
        )
      }
    });
  }
  return Boolean(completedEvent || nativeState);
}

/** Records that the scheduled Telegram voice chat was actually opened. */
export async function handleTelegramCommunityVoiceChatStarted(message: CommunityTelegramMessage) {
  if (!message.video_chat_started || !['group', 'supergroup'].includes(message.chat.type || '')) {
    return false;
  }
  const now = new Date();
  const chatId = String(message.chat.id);
  const voiceConfig = await getSiteConfigMap(['telegramGroupHelpGroupChatId']);
  if (!isManagedTelegramVoiceChat(chatId, voiceConfig.telegramGroupHelpGroupChatId)) return false;
  const stateKey = { bot_chatId: { bot: NATIVE_VOICE_SCHEDULER_STATE, chatId } };
  const nativeState = await prisma.telegramCommunityState.findUnique({ where: stateKey });
  const nativePayload = nativeVoiceStatePayload(nativeState?.payload);
  const linkedEvent = nativePayload.eventId
    ? await prisma.telegramCommunityEvent.findUnique({ where: { id: nativePayload.eventId } })
    : null;
  const current = await prisma.telegramCommunityEvent.findFirst({
    where: {
      chatId,
      status: 'SCHEDULED',
      startsAt: { lte: now, gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) }
    },
    orderBy: { startsAt: 'desc' }
  });
  const activeEvent = linkedEvent || current;
  const startedEarly = Boolean(activeEvent && activeEvent.startsAt > now);
  const startedBy = voiceStarterSnapshot(message.from) || nativePayload.startedBy;
  if (activeEvent && !startedEarly) {
    await prisma.telegramCommunityEvent.update({
      where: { id: activeEvent.id },
      data: { status: 'IN_PROGRESS' }
    });
  }
  await prisma.telegramCommunityState.upsert({
    where: stateKey,
    create: {
      bot: NATIVE_VOICE_SCHEDULER_STATE,
      chatId,
      state: 'NATIVE_VOICE_ACTIVE',
      payload: {
        ...nativePayload,
        ...(activeEvent ? { eventId: activeEvent.id } : {}),
        startedAt: now.toISOString(),
        startedEarly,
        ...(startedBy ? { startedBy } : {})
      },
      // The native worker checks occupancy on its managed cadence. Keep the longer
      // expiry as a recovery boundary if Telegram cannot be read temporarily.
      expiresAt: new Date(now.getTime() + VOICE_EVENT_RECOVERY_DELAY_MS)
    },
    update: {
      state: 'NATIVE_VOICE_ACTIVE',
      payload: {
        ...nativePayload,
        ...(activeEvent ? { eventId: activeEvent.id } : {}),
        startedAt: now.toISOString(),
        startedEarly,
        ...(startedBy ? { startedBy } : {})
      },
      expiresAt: new Date(now.getTime() + VOICE_EVENT_RECOVERY_DELAY_MS)
    }
  });

  // Use the same refresh/recreate path as the scheduler. The previous direct
  // edit branch left deleted announcements permanently stale.
  if (activeEvent) {
    try {
      await refreshTelegramCommunityEventAnnouncement(activeEvent.id, { active: true });
    } catch (error) {
      // Telegram's Bot API update already records the active call. A markup
      // refresh failure must never prevent the scheduler from tracking it.
      console.warn(
        `Could not refresh Join VC button for ${activeEvent.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return true;
}

let lastCommunityDataCleanupAt = 0;

async function runCommunityDataRetentionCleanupHourly(now: Date) {
  if (now.getTime() - lastCommunityDataCleanupAt < 60 * 60 * 1000) return;
  lastCommunityDataCleanupAt = now.getTime();
  await cleanupCommunityBotData();
}

export async function recordTelegramCampaignPollUpdate(update: CommunityTelegramUpdate) {
  if (update.poll) {
    await prisma.telegramCampaignDelivery.updateMany({
      where: { telegramPollId: update.poll.id },
      data: {
        totalVoterCount: update.poll.total_voter_count || 0,
        pollSnapshot: update.poll as unknown as Prisma.InputJsonValue,
        ...(update.poll.is_closed ? { status: 'CLOSED' } : {})
      }
    });
  }

  const answer = update.poll_answer;
  if (!answer?.user) return;
  const delivery = await prisma.telegramCampaignDelivery.findUnique({
    where: { telegramPollId: answer.poll_id },
    include: { item: true }
  });
  if (!delivery) return;
  const telegramUserId = String(answer.user.id);
  if (!answer.option_ids.length) {
    await prisma.telegramPollVote.deleteMany({
      where: { deliveryId: delivery.id, telegramUserId }
    });
    return;
  }
  const vote = await prisma.telegramPollVote.upsert({
    where: { deliveryId_telegramUserId: { deliveryId: delivery.id, telegramUserId } },
    create: {
      deliveryId: delivery.id,
      telegramUserId,
      username: answer.user.username,
      firstName: answer.user.first_name,
      lastName: answer.user.last_name,
      optionIds: answer.option_ids
    },
    update: {
      username: answer.user.username,
      firstName: answer.user.first_name,
      lastName: answer.user.last_name,
      optionIds: answer.option_ids,
      votedAt: new Date()
    }
  });

  const followUpOptionIds = jsonArray(delivery.item?.followUpOptionIds).map(Number);
  const needsFollowUp = answer.option_ids.some((optionId) => followUpOptionIds.includes(optionId));
  if (!needsFollowUp || !delivery.item?.followUpMessage || vote.followUpSentAt) return;
  const config = await communityConfig();
  try {
    await sendCommunityMessage(CAMPAIGN_BOT, answer.user.id, delivery.item.followUpMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Talk to a caring listener', url: config.supportUrl }],
          [{ text: 'Contact Hope Hub', url: config.contactUrl }]
        ]
      }
    });
    await prisma.telegramPollVote.update({
      where: { id: vote.id },
      data: { followUpSentAt: new Date(), followUpError: null }
    });
  } catch (error) {
    await prisma.telegramPollVote.update({
      where: { id: vote.id },
      data: {
        followUpError: String(error instanceof Error ? error.message : error).slice(0, 500)
      }
    });
  }
}

export async function recordTelegramCommunityReaction(update: CommunityTelegramUpdate) {
  const reaction = update.message_reaction;
  if (!reaction) return;
  const actorId = reaction.user?.id || reaction.actor_chat?.id;
  if (!actorId) return;
  const key = {
    chatId: String(reaction.chat.id),
    messageId: reaction.message_id,
    telegramUserId: String(actorId)
  };
  if (!reaction.new_reaction.length) {
    await prisma.telegramCommunityReaction.deleteMany({ where: key });
    return;
  }
  await prisma.telegramCommunityReaction.upsert({
    where: { chatId_messageId_telegramUserId: key },
    create: {
      ...key,
      username: reaction.user?.username,
      reactions: reaction.new_reaction as Prisma.InputJsonValue,
      reactedAt: new Date(reaction.date * 1000)
    },
    update: {
      username: reaction.user?.username,
      reactions: reaction.new_reaction as Prisma.InputJsonValue,
      reactedAt: new Date(reaction.date * 1000)
    }
  });
}

export async function welcomeTelegramCommunityMembers(update: CommunityTelegramUpdate) {
  const message = update.message;
  const membership = update.chat_member;
  const joinedFromMessage = message?.new_chat_members || [];
  const joinedFromMembership =
    membership &&
    ['left', 'kicked'].includes(membership.old_chat_member.status) &&
    ['member', 'administrator', 'restricted'].includes(membership.new_chat_member.status)
      ? [membership.new_chat_member.user]
      : [];
  if (!joinedFromMessage.length && !joinedFromMembership.length) return false;
  const members = [...joinedFromMessage, ...joinedFromMembership].filter(
    (member) => !member.is_bot
  );
  if (!members.length) return true;
  const chat = message?.chat || membership?.chat;
  if (!chat) return false;
  const config = await communityConfig(String(chat.id));
  await Promise.all(
    members.map((member) =>
      observeTelegramCommunityMember({
        chatId: String(chat.id),
        member,
        source: 'JOIN'
      })
    )
  );
  // A rejoin is a new membership period, while a normal message should not
  // rewrite the original join date.
  await prisma.telegramCommunityMember.updateMany({
    where: {
      chatId: String(chat.id),
      telegramUserId: { in: members.map((member) => String(member.id)) }
    },
    data: { joinedAt: new Date(), leftAt: null }
  });
  if (message?.new_chat_members?.length && config.cleanJoinNotice) {
    await callCommunityTelegramApi(CAMPAIGN_BOT, 'deleteMessage', {
      chat_id: chat.id,
      message_id: message.message_id
    }).catch(() => null);
  }
  if (!config.welcomeEnabled || config.joinLeaveMessages === 'off') return true;
  for (const member of members) {
    const claimed = await claimTelegramMembershipTransition({
      transition: 'join',
      chatId: String(chat.id),
      telegramUserId: member.id
    });
    if (!claimed) continue;
    const verificationClaim = {
      operation: 'join-verification-callback',
      key: `${chat.id}:${member.id}`,
      expiresAt: new Date(Date.now() + 60_000)
    };
    if (!(await claimTelegramOperation(verificationClaim))) {
      await releaseTelegramMembershipTransition({
        transition: 'join',
        chatId: String(chat.id),
        telegramUserId: member.id
      });
      throw new Error('Join verification is processing; retry membership update');
    }
    let welcomeDelivered = false;
    try {
      await cancelPendingJoinVerification(String(chat.id), String(member.id), 'rejoined');
      let needsVerification = ['captcha', 'strict'].includes(config.joinProtection);
      const captchaEnabled = needsVerification && config.captchaMode !== 'off';
      const verificationId = randomBytes(5).toString('hex');
      const first = 2 + Math.floor(Math.random() * 7);
      const second = 2 + Math.floor(Math.random() * 7);
      const captchaAnswer = first + second;
      const captchaOptions = [
        ...new Set([captchaAnswer, captchaAnswer - 1, captchaAnswer + 1, captchaAnswer + 2])
      ]
        .filter((option) => option >= 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      if (needsVerification) {
        const restricted = await callCommunityTelegramApi(CAMPAIGN_BOT, 'restrictChatMember', {
          chat_id: chat.id,
          user_id: member.id,
          permissions: { can_send_messages: false }
        })
          .then(() => true)
          .catch((error) => {
            console.error(
              '[telegram-community] Could not restrict a new member for join verification.',
              error
            );
            return false;
          });
        needsVerification = restricted;
        if (restricted) {
          await prisma.telegramCommunityState.upsert({
            where: {
              bot_chatId: {
                bot: `group-join-verification:${chat.id}`,
                chatId: String(member.id)
              }
            },
            create: {
              bot: `group-join-verification:${chat.id}`,
              chatId: String(member.id),
              state: captchaEnabled ? 'awaiting-captcha' : 'awaiting-verification',
              payload: {
                groupChatId: String(chat.id),
                verificationId,
                captchaAnswer: captchaEnabled ? captchaAnswer : null,
                attempts: 0
              },
              expiresAt: captchaEnabled
                ? new Date('9999-12-31T00:00:00Z')
                : new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            update: {
              state: captchaEnabled ? 'awaiting-captcha' : 'awaiting-verification',
              payload: {
                groupChatId: String(chat.id),
                verificationId,
                captchaAnswer: captchaEnabled ? captchaAnswer : null,
                attempts: 0
              },
              expiresAt: captchaEnabled
                ? new Date('9999-12-31T00:00:00Z')
                : new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          });
        }
      }
      const baseWelcomeKeyboard = needsVerification
        ? {
            inline_keyboard: [
              ...(captchaEnabled
                ? [
                    captchaOptions.map((option) => ({
                      text: String(option),
                      callback_data: `hh_join_captcha:${chat.id}:${member.id}:${option}:${verificationId}`
                    }))
                  ]
                : [
                    [
                      {
                        text: 'I’m here',
                        callback_data: `hh_join_verify:${chat.id}:${member.id}:${verificationId}`
                      }
                    ]
                  ]),
              ...(config.welcomeKeyboard?.inline_keyboard || [])
            ]
          }
        : config.welcomeKeyboard;
      const verificationPrompt = captchaEnabled
        ? `\n\nTo join the conversation, choose the answer: ${first} + ${second} = ?`
        : '';
      const formattedWelcome = formatGroupHelpMessage(config.welcomeText);
      const welcomeMessageText = `${renderGroupHelpFilterHtml(formattedWelcome.text, {
        message_id: message?.message_id || 0,
        chat,
        from: member
      })}${verificationPrompt}`;
      const welcomeKeyboard =
        formattedWelcome.replyMarkup || baseWelcomeKeyboard
          ? {
              inline_keyboard: [
                ...(formattedWelcome.replyMarkup?.inline_keyboard || []),
                ...(baseWelcomeKeyboard?.inline_keyboard || [])
              ]
            }
          : undefined;
      const media = config.welcomeMediaUrl ? communityMediaPayload(config.welcomeMediaUrl) : null;
      const sent =
        media && welcomeMessageText.length <= 1024
          ? await callCommunityTelegramApi<{ message_id: number }>(CAMPAIGN_BOT, media.method, {
              chat_id: chat.id,
              ...media.media,
              caption: welcomeMessageText,
              parse_mode: 'HTML',
              message_thread_id: message?.message_thread_id,
              reply_markup: welcomeKeyboard,
              disable_notification: formattedWelcome.disableNotification,
              protect_content: formattedWelcome.protectContent,
              ...(formattedWelcome.mediaSpoiler ? { has_spoiler: true } : {})
            }).catch(async (error) => {
              console.error('[telegram-community] Could not send welcome media.', error);
              return sendCommunityMessage(CAMPAIGN_BOT, chat.id, welcomeMessageText, {
                parse_mode: 'HTML',
                message_thread_id: message?.message_thread_id,
                reply_markup: welcomeKeyboard,
                disable_notification: formattedWelcome.disableNotification,
                protect_content: formattedWelcome.protectContent,
                link_preview_options: { is_disabled: !formattedWelcome.showLinkPreview }
              });
            })
          : await sendCommunityMessage(CAMPAIGN_BOT, chat.id, welcomeMessageText, {
              parse_mode: 'HTML',
              message_thread_id: message?.message_thread_id,
              reply_markup: welcomeKeyboard,
              disable_notification: formattedWelcome.disableNotification,
              protect_content: formattedWelcome.protectContent,
              link_preview_options: { is_disabled: !formattedWelcome.showLinkPreview }
            });
      welcomeDelivered = true;
      if (needsVerification) {
        await prisma.telegramCommunityState.update({
          where: {
            bot_chatId: {
              bot: `group-join-verification:${chat.id}`,
              chatId: String(member.id)
            }
          },
          data: {
            payload: {
              groupChatId: String(chat.id),
              verificationId,
              captchaAnswer: captchaEnabled ? captchaAnswer : null,
              attempts: 0,
              welcomeMessageId: sent.message_id,
              welcomeVerifiedText: withoutJoinCaptchaQuestion(welcomeMessageText),
              welcomeVerifiedKeyboard: verifiedJoinKeyboard(welcomeKeyboard),
              welcomeIsCaption: 'caption' in sent,
              welcomeParseMode: 'HTML'
            }
          }
        });
        if (!captchaEnabled)
          await scheduleCommunityMessageCleanup({
            bot: CAMPAIGN_BOT,
            chatId: chat.id,
            messageId: sent.message_id,
            kind: 'join-captcha',
            deleteAfter: new Date(Date.now() + config.captchaPendingMinutes * 60_000)
          });
      } else if (config.autoDeleteSeconds > 0) {
        await scheduleCommunityMessageCleanup({
          bot: CAMPAIGN_BOT,
          chatId: chat.id,
          messageId: sent.message_id,
          kind: 'welcome',
          deleteAfter: new Date(Date.now() + config.autoDeleteSeconds * 1000)
        });
      }
      await logCommunityActivity(config, 'Member welcomed', [
        `Group: ${chat.title || chat.id}`,
        `Member: ${telegramPersonLogLabel(member)}`,
        needsVerification ? 'Join verification: required' : 'Join verification: not required'
      ]);
    } catch (error) {
      if (!welcomeDelivered) {
        await releaseTelegramMembershipTransition({
          transition: 'join',
          chatId: String(chat.id),
          telegramUserId: member.id
        }).catch(() => null);
      }
      throw error;
    } finally {
      await releaseTelegramOperation(verificationClaim);
    }
  }
  await prisma.telegramCommunityMember.updateMany({
    where: {
      chatId: String(chat.id),
      telegramUserId: { in: members.map((member) => String(member.id)) }
    },
    data: { welcomeSentAt: new Date() }
  });
  return true;
}

export async function recordTelegramCommunityDeparture(update: CommunityTelegramUpdate) {
  const message = update.message;
  const membership = update.chat_member;
  const memberFromMessage = message?.left_chat_member;
  const memberFromMembership =
    membership &&
    ['member', 'administrator', 'restricted'].includes(membership.old_chat_member.status) &&
    ['left', 'kicked'].includes(membership.new_chat_member.status)
      ? membership.new_chat_member.user
      : undefined;
  const member = memberFromMessage || memberFromMembership;
  const chat = message?.chat || membership?.chat;
  if (!member || member.is_bot || !chat) return false;
  const claimed = await claimTelegramMembershipTransition({
    transition: 'leave',
    chatId: String(chat.id),
    telegramUserId: member.id
  });
  if (!claimed) return true;
  const verificationClaim = {
    operation: 'join-verification-callback',
    key: `${chat.id}:${member.id}`,
    expiresAt: new Date(Date.now() + 60_000)
  };
  if (!(await claimTelegramOperation(verificationClaim))) {
    await releaseTelegramMembershipTransition({
      transition: 'leave',
      chatId: String(chat.id),
      telegramUserId: member.id
    });
    throw new Error('Join verification is processing; retry departure update');
  }
  let goodbyeDelivered = false;
  try {
    await cancelPendingJoinVerification(String(chat.id), String(member.id), 'left');
    await prisma.telegramCommunityMember.updateMany({
      where: { chatId: String(chat.id), telegramUserId: String(member.id) },
      data: { leftAt: new Date() }
    });
    const config = await communityConfig(String(chat.id));
    if (config.joinLeaveMessages === 'join and leave' && config.goodbyeText) {
      const goodbye = config.goodbyeText
        .replaceAll('{mention}', memberMention(member))
        .replaceAll('{id}', String(member.id));
      const sent = await sendCommunityMessage(CAMPAIGN_BOT, chat.id, goodbye, {
        parse_mode: 'Markdown',
        message_thread_id: message?.message_thread_id
      }).catch(() => null);
      goodbyeDelivered = Boolean(sent);
      if (sent && config.autoDeleteSeconds > 0) {
        await scheduleCommunityMessageCleanup({
          bot: CAMPAIGN_BOT,
          chatId: chat.id,
          messageId: sent.message_id,
          kind: 'goodbye',
          deleteAfter: new Date(Date.now() + config.autoDeleteSeconds * 1000)
        });
      }
    }
    await logCommunityActivity(config, 'Member left the community', [
      `Group: ${chat.title || chat.id}`,
      `Member: ${telegramPersonLogLabel(member)}`
    ]);
    return true;
  } catch (error) {
    if (!goodbyeDelivered) {
      await releaseTelegramMembershipTransition({
        transition: 'leave',
        chatId: String(chat.id),
        telegramUserId: member.id
      }).catch(() => null);
    }
    throw error;
  } finally {
    await releaseTelegramOperation(verificationClaim);
  }
}

type JoinCaptchaPayload = {
  completedAt?: string;
  outcome?: string;
  actorId?: number;
  verificationId?: string;
  reviewChatId?: string;
  reviewAttempts?: number;
  reviewRetryAt?: string;
  reviewLastError?: string;
  captchaAnswer?: number | null;
  attempts?: number;
  welcomeMessageId?: number;
  welcomeVerifiedText?: string;
  welcomeVerifiedKeyboard?: TelegramKeyboard;
  welcomeIsCaption?: boolean;
  welcomeParseMode?: 'HTML';
  reviewMessageId?: number;
  groupChatId?: string;
};

async function recordJoinVerificationHistory(
  chatId: string,
  userId: string,
  payload: JoinCaptchaPayload,
  outcome: string,
  actorId?: number
) {
  if (payload.captchaAnswer == null) return;
  const key = `${userId}:${payload.verificationId || 'legacy'}`;
  const bot = `join-verification-history:${chatId}`;
  const previous = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot, chatId: key } }
  });
  const prior = (previous?.payload || {}) as { events?: Prisma.InputJsonObject[] };
  const event = {
    at: new Date().toISOString(),
    outcome,
    attempts: payload.attempts || 0,
    ...(actorId ? { actorId } : {})
  };
  const last = prior.events?.at(-1);
  const events =
    last?.outcome === outcome && last?.attempts === event.attempts && last?.actorId === actorId
      ? prior.events!
      : [...(prior.events || []), event].slice(-50);
  const data = {
    state: outcome,
    payload: {
      userId,
      groupChatId: chatId,
      verificationId: payload.verificationId || 'legacy',
      events
    },
    expiresAt: new Date(Date.now() + 180 * 86_400_000)
  };
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot, chatId: key } },
    create: { bot, chatId: key, ...data },
    update: data
  });
}

async function cancelPendingJoinVerification(
  chatId: string,
  userId: string,
  outcome: 'left' | 'rejoined'
) {
  const where = { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } };
  const state = await prisma.telegramCommunityState.findUnique({ where });
  if (!state) return;
  const payload = (state.payload || {}) as JoinCaptchaPayload;
  if (state.state === 'join-completed')
    await recordJoinVerificationHistory(
      chatId,
      userId,
      payload,
      payload.outcome || 'verified',
      payload.actorId
    );
  await recordJoinVerificationHistory(chatId, userId, payload, outcome);
  for (const message of [
    { chatId, id: payload.welcomeMessageId },
    { chatId: payload.reviewChatId, id: payload.reviewMessageId }
  ]) {
    if (message.chatId && message.id)
      await scheduleCommunityMessageCleanup({
        bot: CAMPAIGN_BOT,
        chatId: message.chatId,
        messageId: message.id,
        kind: 'welcome',
        deleteAfter: new Date()
      });
  }
  await prisma.telegramCommunityState.delete({ where });
}

async function attemptJoinCaptchaAdminReview(
  chatId: string,
  userId: string,
  payload: JoinCaptchaPayload
) {
  if (!captchaReviewReady(payload)) return;
  try {
    await ensureJoinCaptchaAdminReview(chatId, userId, payload);
  } catch (error) {
    const attempts = (payload.reviewAttempts || 0) + 1;
    const nextRetryAt = new Date(Date.now() + captchaReviewRetryDelay(attempts)).toISOString();
    const detail = error instanceof Error ? error.message : String(error);
    await prisma.telegramCommunityState.update({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
      data: {
        payload: {
          ...payload,
          reviewAttempts: attempts,
          reviewRetryAt: nextRetryAt,
          reviewLastError: detail.slice(0, 300)
        }
      }
    });
    console.error('[JoinCaptcha] Staff review delivery deferred', {
      chatId,
      userId,
      verificationId: payload.verificationId,
      attempts,
      nextRetryAt,
      error: detail
    });
  }
}

let joinMaintenanceRunning = false;
export async function runTelegramJoinVerificationMaintenance() {
  if (joinMaintenanceRunning) return;
  joinMaintenanceRunning = true;
  try {
    await runScheduledCommunityMessageCleanup();
    const states = await prisma.telegramCommunityState.findMany({
      where: {
        bot: { startsWith: 'group-join-verification:' },
        state: { in: ['awaiting-admin-approval', 'join-completed'] }
      },
      orderBy: { updatedAt: 'asc' },
      take: 100
    });
    for (const state of states) {
      const payload = (state.payload || {}) as JoinCaptchaPayload;
      if (state.state !== 'join-completed' && payload.reviewMessageId) {
        await prisma.telegramCommunityState.update({
          where: { id: state.id },
          data: { state: 'awaiting-admin-approval-notified' }
        });
        continue;
      }
      if (
        state.state !== 'join-completed' &&
        payload.reviewRetryAt &&
        Date.parse(payload.reviewRetryAt) > Date.now()
      )
        continue;
      const chatId = state.bot.slice('group-join-verification:'.length);
      const claim = {
        operation: 'join-verification-callback',
        key: `${chatId}:${state.chatId}`,
        expiresAt: new Date(Date.now() + 60_000)
      };
      if (!(await claimTelegramOperation(claim))) continue;
      try {
        const fresh = await prisma.telegramCommunityState.findUnique({
          where: { bot_chatId: { bot: state.bot, chatId: state.chatId } }
        });
        if (fresh?.state === 'join-completed')
          await finalizeCompletedJoin(
            chatId,
            state.chatId,
            (fresh.payload || {}) as JoinCaptchaPayload
          );
        if (fresh?.state === 'awaiting-admin-approval')
          await attemptJoinCaptchaAdminReview(
            chatId,
            state.chatId,
            (fresh.payload || {}) as JoinCaptchaPayload
          );
      } finally {
        await releaseTelegramOperation(claim);
      }
    }
  } finally {
    joinMaintenanceRunning = false;
  }
}

async function finishJoinWelcome(
  chatId: string,
  payload: JoinCaptchaPayload,
  fallbackMinutes: number,
  captchaCleanupSeconds: number,
  fallbackKeyboard?: TelegramKeyboard
) {
  if (!payload.welcomeMessageId) return;
  const keyboard = verifiedJoinKeyboard(payload.welcomeVerifiedKeyboard || fallbackKeyboard);
  const edit =
    payload.welcomeVerifiedText != null
      ? callCommunityTelegramApi(
          CAMPAIGN_BOT,
          payload.welcomeIsCaption ? 'editMessageCaption' : 'editMessageText',
          {
            chat_id: chatId,
            message_id: payload.welcomeMessageId,
            [payload.welcomeIsCaption ? 'caption' : 'text']: payload.welcomeVerifiedText,
            ...(payload.welcomeParseMode ? { parse_mode: payload.welcomeParseMode } : {}),
            reply_markup: keyboard
          }
        )
      : editCommunityReplyMarkup(CAMPAIGN_BOT, chatId, payload.welcomeMessageId, keyboard);
  await edit.catch((error) => {
    if (!/message to edit not found|message is not modified/i.test(String(error))) throw error;
  });
  const delayMs = joinWelcomeCleanupDelay(
    payload.captchaAnswer,
    fallbackMinutes,
    captchaCleanupSeconds
  );
  await scheduleCommunityMessageCleanup({
    bot: CAMPAIGN_BOT,
    chatId,
    messageId: payload.welcomeMessageId,
    kind: 'join-captcha',
    deleteAfter: joinWelcomeDeleteAfter(
      payload.completedAt,
      payload.captchaAnswer,
      fallbackMinutes,
      Date.now(),
      captchaCleanupSeconds
    )
  });
  // The persisted cleanup row survives restarts. Wake the worker at the due
  // time as well so this short delay does not wait for the campaign schedule.
  setTimeout(() => {
    void runScheduledCommunityMessageCleanup().catch((error) =>
      console.error('[JoinCaptcha] Welcome cleanup failed', error)
    );
  }, delayMs).unref();
}

async function finalizeCompletedJoin(chatId: string, userId: string, payload: JoinCaptchaPayload) {
  const config = await communityConfig(chatId);
  await finishJoinWelcome(
    chatId,
    payload,
    config.captchaSuccessCleanupMinutes,
    config.captchaSuccessCleanupSeconds,
    config.welcomeKeyboard
  );
  await recordJoinVerificationHistory(
    chatId,
    userId,
    payload,
    payload.outcome || 'verified',
    payload.actorId
  );
  if (payload.reviewMessageId && payload.reviewChatId)
    await editCommunityReplyMarkup(CAMPAIGN_BOT, payload.reviewChatId, payload.reviewMessageId, {
      inline_keyboard: []
    }).catch((error) => {
      if (!/message to edit not found/i.test(String(error))) throw error;
    });
  await prisma.telegramCommunityState.delete({
    where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
  });
}

async function completeJoinVerification(
  chatId: string,
  userId: string,
  payload: JoinCaptchaPayload,
  outcome: string,
  actorId: number
) {
  const completed = { ...payload, completedAt: new Date().toISOString(), outcome, actorId };
  await prisma.telegramCommunityState.update({
    where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
    data: { state: 'join-completed', payload: completed }
  });
  await finalizeCompletedJoin(chatId, userId, completed);
}

async function ensureJoinCaptchaAdminReview(
  chatId: string,
  userId: string,
  payload: JoinCaptchaPayload
) {
  if (payload.reviewMessageId) return;
  const config = await communityConfig(chatId);
  if (!config.staffGroupId) {
    console.error('[JoinCaptcha] Private staff group missing', {
      chatId,
      userId,
      attempts: payload.attempts
    });
    throw new Error('Private staff group is not configured');
  }
  const staffChat = await callCommunityTelegramApi<{ type?: string; username?: string }>(
    CAMPAIGN_BOT,
    'getChat',
    { chat_id: config.staffGroupId }
  );
  if (!['group', 'supergroup'].includes(staffChat.type || '') || staffChat.username) {
    throw new Error('Captcha review requires a private staff group without a public username');
  }
  const sent = await sendCommunityMessage(
    CAMPAIGN_BOT,
    config.staffGroupId,
    `Captcha review needed\n\nA member failed the captcha 3 times and remains restricted.\n\nMember: ${userId}\nGroup: ${chatId}\n\nAccept unlocks the member. Reject removes them; they may request to join again.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Accept member',
              callback_data: `hh_join_allow:${chatId}:${userId}:${payload.verificationId || ''}`
            },
            {
              text: 'Reject member',
              callback_data: `hh_join_reject:${chatId}:${userId}:${payload.verificationId || ''}`
            }
          ]
        ]
      }
    }
  );
  await prisma.telegramCommunityState.update({
    where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
    data: {
      state: 'awaiting-admin-approval-notified',
      payload: { ...payload, reviewMessageId: sent.message_id, reviewChatId: config.staffGroupId }
    }
  });
}

export async function handleTelegramCommunityJoinVerificationCallback(
  update: CommunityTelegramUpdate
) {
  const data = update.callback_query?.data;
  if (!data || !/^hh_join_(verify|captcha|allow|reject):/.test(data)) return false;
  const [, chatId, userId] = data.split(':');
  if (!chatId || !userId) return false;
  const claim = {
    operation: 'join-verification-callback',
    key: `${chatId}:${userId}`,
    expiresAt: new Date(Date.now() + 60_000)
  };
  if (!(await claimTelegramOperation(claim))) return 'busy';
  try {
    return await processTelegramCommunityJoinVerificationCallback(update);
  } finally {
    await releaseTelegramOperation(claim);
  }
}

async function processTelegramCommunityJoinVerificationCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  const data = callback?.data;
  if (
    !callback ||
    (!data?.startsWith('hh_join_verify:') &&
      !data?.startsWith('hh_join_captcha:') &&
      !data?.startsWith('hh_join_allow:') &&
      !data?.startsWith('hh_join_reject:'))
  )
    return false;
  const [, chatId, userId, selectedAnswer] = data.split(':');
  if (data.startsWith('hh_join_allow:') || data.startsWith('hh_join_reject:')) {
    if (!chatId || !userId) return false;
    const config = await communityConfig(chatId);
    if (!config.staffGroupId || String(callback.message?.chat.id) !== config.staffGroupId)
      return 'denied';
    const membership = await callCommunityTelegramApi<{ status?: string }>(
      CAMPAIGN_BOT,
      'getChatMember',
      {
        chat_id: config.staffGroupId,
        user_id: callback.from.id
      }
    ).catch(() => null);
    if (
      !canDecideCaptchaReview(
        String(callback.message?.chat.id),
        config.staffGroupId,
        membership?.status || ''
      )
    )
      return 'denied';
    const state = await prisma.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
    });
    if (!state || !state.state.startsWith('awaiting-admin-approval')) return 'expired';
    const approvalPayload = (state.payload || {}) as JoinCaptchaPayload;
    if (!joinVerificationMatches(data, approvalPayload.verificationId)) return 'expired';
    if (
      approvalPayload.reviewMessageId &&
      callback.message?.message_id !== approvalPayload.reviewMessageId
    )
      return false;
    const rejected = data.startsWith('hh_join_reject:');
    if (rejected) {
      await callCommunityTelegramApi(CAMPAIGN_BOT, 'banChatMember', {
        chat_id: chatId,
        user_id: Number(userId)
      });
      await callCommunityTelegramApi(CAMPAIGN_BOT, 'unbanChatMember', {
        chat_id: chatId,
        user_id: Number(userId),
        only_if_banned: true
      });
      await recordJoinVerificationHistory(
        chatId,
        userId,
        approvalPayload,
        'rejected',
        callback.from.id
      );
      if (approvalPayload.welcomeMessageId)
        await scheduleCommunityMessageCleanup({
          bot: CAMPAIGN_BOT,
          chatId,
          messageId: approvalPayload.welcomeMessageId,
          kind: 'welcome',
          deleteAfter: new Date()
        });
      await prisma.telegramCommunityState.delete({
        where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
      });
      if (callback.message)
        await editCommunityReplyMarkup(
          CAMPAIGN_BOT,
          callback.message.chat.id,
          callback.message.message_id,
          { inline_keyboard: [] }
        );
      await logCommunityActivity(config, 'Join verification rejected by administrator', [
        `Group: ${chatId}`,
        `Member ID: ${userId}`,
        `Rejected by: ${callback.from.id}`
      ]);
      return 'rejected';
    }
    const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
      CAMPAIGN_BOT,
      'getChat',
      {
        chat_id: chatId
      }
    );
    await callCommunityTelegramApi(CAMPAIGN_BOT, 'restrictChatMember', {
      chat_id: chatId,
      user_id: Number(userId),
      permissions: chat.permissions || { can_send_messages: true }
    });
    await completeJoinVerification(chatId, userId, approvalPayload, 'accepted', callback.from.id);
    if (callback.message)
      await editCommunityReplyMarkup(
        CAMPAIGN_BOT,
        callback.message.chat.id,
        callback.message.message_id,
        { inline_keyboard: [] }
      );
    await logCommunityActivity(config, 'Join verification approved by administrator', [
      `Group: ${chatId}`,
      `Member ID: ${userId}`,
      `Approved by: ${callback.from.first_name || 'Administrator'} (${callback.from.id})`
    ]);
    return 'approved';
  }
  if (
    !chatId ||
    !userId ||
    String(callback.from.id) !== userId ||
    String(callback.message?.chat.id) !== chatId
  ) {
    return false;
  }
  const state = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
  });
  if (
    !state ||
    (state.expiresAt <= new Date() &&
      (state.payload as JoinCaptchaPayload | null)?.captchaAnswer == null)
  )
    return 'expired';
  const payload = (state.payload || {}) as JoinCaptchaPayload;
  if (state.state === 'join-completed') return 'expired';
  if (!joinVerificationMatches(data, payload.verificationId)) return 'expired';
  if (state.state.startsWith('awaiting-admin-approval')) {
    await attemptJoinCaptchaAdminReview(chatId, userId, payload);
    return 'review';
  }
  if (payload.welcomeMessageId && callback.message?.message_id !== payload.welcomeMessageId)
    return false;
  if (!joinCaptchaAnswerAllowed(payload.captchaAnswer, data)) return false;
  if (data.startsWith('hh_join_captcha:') && Number(selectedAnswer) !== payload.captchaAnswer) {
    const config = await communityConfig(chatId);
    const attempts = Number(payload.attempts || 0) + 1;
    await recordJoinVerificationHistory(
      chatId,
      userId,
      { ...payload, attempts },
      'incorrect',
      callback.from.id
    );
    if (
      captchaNeedsStaffReview(
        payload.captchaAnswer,
        attempts,
        config.captchaMode !== 'off',
        config.captchaMaxAttempts
      )
    ) {
      await prisma.telegramCommunityState.update({
        where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
        data: {
          state: 'awaiting-admin-approval',
          payload: { ...payload, attempts },
          expiresAt: new Date('9999-12-31T00:00:00Z')
        }
      });
      await attemptJoinCaptchaAdminReview(chatId, userId, { ...payload, attempts });
      await logCommunityActivity(config, 'Join verification failed', [
        `Group: ${chatId}`,
        `Member ID: ${userId}`,
        `Action: awaiting administrator approval`,
        `Private staff group configured: ${Boolean(config.staffGroupId)}`
      ]);
      return 'review';
    }
    await prisma.telegramCommunityState.update({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
      data: { payload: { ...payload, attempts } }
    });
    return 'incorrect';
  }
  const config = await communityConfig(chatId);
  const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
    CAMPAIGN_BOT,
    'getChat',
    {
      chat_id: chatId
    }
  );
  await callCommunityTelegramApi(CAMPAIGN_BOT, 'restrictChatMember', {
    chat_id: chatId,
    user_id: Number(userId),
    permissions: chat.permissions || { can_send_messages: true }
  });
  const welcomeMessage = callback.message;
  const completedPayload =
    payload.welcomeVerifiedText != null || !welcomeMessage
      ? payload
      : {
          ...payload,
          welcomeVerifiedText: withoutJoinCaptchaQuestion(
            welcomeMessage.text || welcomeMessage.caption || ''
          ),
          welcomeVerifiedKeyboard: verifiedJoinKeyboard(welcomeMessage.reply_markup),
          welcomeIsCaption: welcomeMessage.caption != null
        };
  await completeJoinVerification(chatId, userId, completedPayload, 'verified', callback.from.id);
  await logCommunityActivity(config, 'Join verification completed', [
    `Group: ${chatId}`,
    `Member ID: ${userId}`
  ]);
  return 'verified';
}

async function telegramCommunityEventKeyboard(
  event: { id: string; joinUrl: string },
  rsvpCount: number,
  isLive = false
) {
  const config = await communityConfig();
  return {
    inline_keyboard: [
      [{ text: `I’ll join (${rsvpCount})`, callback_data: `event:rsvp:${event.id}` }],
      [
        telegramGroupCallButton(event.joinUrl, isLive),
        { text: 'Talk privately (paid)', url: config.supportUrl }
      ]
    ]
  };
}

async function telegramCommunityEventReminderKeyboard(event: { joinUrl: string }) {
  const config = await communityConfig();
  return {
    inline_keyboard: [
      [
        telegramGroupCallButton(event.joinUrl, false),
        { text: 'Talk privately (paid)', url: config.supportUrl }
      ]
    ]
  };
}

export async function announceTelegramCommunityEvent(
  eventId: string,
  options: { active?: boolean } = {}
) {
  const event = await prisma.telegramCommunityEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { rsvps: true } } }
  });
  const eligibleStatus = options.active
    ? event?.status === 'SCHEDULED' || event?.status === 'IN_PROGRESS'
    : event?.status === 'SCHEDULED';
  if (!event || !eligibleStatus || event.announcedAt) return null;
  const claimed = await claimTelegramOperation({
    operation: EVENT_ANNOUNCEMENT_CLAIM,
    key: event.id,
    expiresAt: new Date(
      Math.max(Date.now() + 60 * 60_000, event.startsAt.getTime() + 12 * 60 * 60_000)
    )
  });
  if (!claimed) return null;
  let announcementDelivered = false;
  try {
    const keyboard = await telegramCommunityEventKeyboard(
      event,
      event._count.rsvps,
      Boolean(options.active)
    );
    const text = [
      options.active ? `🔴 LIVE NOW — ${event.title}` : `🎧 ${event.title}`,
      event.description,
      '',
      options.active
        ? 'The voice chat is open now.'
        : `Starts: ${event.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ]
      .filter(Boolean)
      .join('\n');
    const config = await communityConfig(event.chatId);
    const sent =
      options.active && config.liveVoiceImageUrl
        ? await callCommunityTelegramApi<{ message_id: number }>(CAMPAIGN_BOT, 'sendPhoto', {
            chat_id: event.chatId,
            photo: config.liveVoiceImageUrl,
            caption: Array.from(text).slice(0, 1024).join(''),
            reply_markup: keyboard
          })
        : await sendCommunityMessage(CAMPAIGN_BOT, event.chatId, text, {
            reply_markup: keyboard
          });
    announcementDelivered = true;
    console.info('[telegram-vc] announcement-sent', {
      eventId: event.id,
      chatId: event.chatId,
      messageId: sent.message_id,
      active: Boolean(options.active),
      button: telegramGroupCallButton(event.joinUrl, Boolean(options.active))
    });
    await manageAnnouncementPin(config, event.chatId, sent.message_id, 'event');
    return await prisma.telegramCommunityEvent.update({
      where: { id: event.id },
      data: { telegramMessageId: sent.message_id, announcedAt: new Date() }
    });
  } catch (error) {
    if (!announcementDelivered) {
      await releaseTelegramOperation({ operation: EVENT_ANNOUNCEMENT_CLAIM, key: event.id }).catch(
        () => null
      );
    }
    throw error;
  }
}

export async function refreshTelegramCommunityEventAnnouncement(
  eventId: string,
  options: { active?: boolean } = {}
) {
  const event = await prisma.telegramCommunityEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { rsvps: { where: { status: 'GOING' } } } } }
  });
  if (!event) return null;
  if (!event.telegramMessageId) return announceTelegramCommunityEvent(event.id, options);
  const keyboard = await telegramCommunityEventKeyboard(
    event,
    event._count.rsvps,
    Boolean(options.active)
  );
  try {
    await editCommunityReplyMarkup(CAMPAIGN_BOT, event.chatId, event.telegramMessageId, keyboard);
    console.info('[telegram-vc] announcement-refreshed', {
      eventId: event.id,
      chatId: event.chatId,
      messageId: event.telegramMessageId,
      active: Boolean(options.active),
      button: telegramGroupCallButton(event.joinUrl, Boolean(options.active))
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('[telegram-vc] announcement-refresh-failed', {
      eventId: event.id,
      chatId: event.chatId,
      messageId: event.telegramMessageId,
      button: telegramGroupCallButton(event.joinUrl, Boolean(options.active)),
      error: detail,
      recovery: /message to edit not found/i.test(detail) ? 'recreate-announcement' : 'rethrow'
    });
    if (!/message to edit not found/i.test(detail)) throw error;
    // The announcement may have been manually removed or cleaned before the
    // VC started. Clear the stale reference and recreate a live notice instead
    // of leaving members without a working Join VC button.
    await prisma.telegramCommunityEvent.update({
      where: { id: event.id },
      data: { telegramMessageId: null, announcedAt: null }
    });
    await releaseTelegramOperation({ operation: EVENT_ANNOUNCEMENT_CLAIM, key: event.id }).catch(
      () => null
    );
    return announceTelegramCommunityEvent(event.id, options);
  }
  return event;
}

export async function deleteTelegramCommunityEvent(eventId: string) {
  const event = await prisma.telegramCommunityEvent.findUnique({ where: { id: eventId } });
  if (!event) return false;
  await removeTelegramCommunityEventAnnouncement(event);
  await prisma.telegramCommunityEvent.delete({ where: { id: event.id } });
  return true;
}

/** Remove a stale event notice and its pin without deleting the event record. */
export async function removeTelegramCommunityEventAnnouncement(event: {
  chatId: string;
  telegramMessageId: number | null;
}) {
  if (!event.telegramMessageId) return;
  const pinKey = { bot_chatId: { bot: ANNOUNCEMENT_PIN_STATE, chatId: event.chatId } };
  const pin = await prisma.telegramCommunityState.findUnique({ where: pinKey });
  const pinnedMessageId = Number((pin?.payload as { messageId?: unknown } | null)?.messageId || 0);
  if (pinnedMessageId === event.telegramMessageId) {
    await callCommunityTelegramApi(CAMPAIGN_BOT, 'unpinChatMessage', {
      chat_id: event.chatId,
      message_id: event.telegramMessageId
    }).catch(() => null);
    await prisma.telegramCommunityState.delete({ where: pinKey }).catch(() => null);
  }
  await callCommunityTelegramApi(CAMPAIGN_BOT, 'deleteMessage', {
    chat_id: event.chatId,
    message_id: event.telegramMessageId
  }).catch(() => null);
}

export async function handleTelegramCommunityEventCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.data?.startsWith('event:rsvp:')) return false;
  const eventId = callback.data.slice('event:rsvp:'.length);
  const event = await prisma.telegramCommunityEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'SCHEDULED') return true;
  await prisma.telegramCommunityEventRsvp.upsert({
    where: {
      eventId_telegramUserId: { eventId, telegramUserId: String(callback.from.id) }
    },
    create: {
      eventId,
      telegramUserId: String(callback.from.id),
      username: callback.from.username,
      firstName: callback.from.first_name,
      lastName: callback.from.last_name
    },
    update: { status: 'GOING' }
  });
  const total = await prisma.telegramCommunityEventRsvp.count({
    where: { eventId, status: 'GOING' }
  });
  if (callback.message) {
    const nativeState = await prisma.telegramCommunityState.findUnique({
      where: {
        bot_chatId: { bot: NATIVE_VOICE_SCHEDULER_STATE, chatId: event.chatId }
      },
      select: { state: true, payload: true }
    });
    const nativePayload = nativeVoiceStatePayload(nativeState?.payload);
    const isLive =
      nativeState?.state === 'NATIVE_VOICE_ACTIVE' && nativePayload.eventId === event.id;
    const keyboard = await telegramCommunityEventKeyboard(event, total, isLive);
    await editCommunityReplyMarkup(
      CAMPAIGN_BOT,
      callback.message.chat.id,
      callback.message.message_id,
      keyboard
    );
  }
  return true;
}

async function runTelegramCommunityEventScheduler(now: Date) {
  const unannounced = await prisma.telegramCommunityEvent.findMany({
    where: {
      status: 'SCHEDULED',
      announcedAt: null,
      startsAt: { gt: now },
      // Older generated voice slots did not persist announcementDueAt. They
      // should still receive the same one-hour-before join announcement.
      OR: [
        { announcementDueAt: { lte: now } },
        {
          announcementDueAt: null,
          startsAt: { lte: new Date(now.getTime() + VOICE_EVENT_ANNOUNCEMENT_LEAD_MS) }
        }
      ]
    },
    orderBy: { startsAt: 'asc' },
    take: 10
  });
  await Promise.allSettled(unannounced.map((event) => announceTelegramCommunityEvent(event.id)));

  const events = await prisma.telegramCommunityEvent.findMany({
    where: { status: 'SCHEDULED', reminderSentAt: null, startsAt: { gt: now } },
    include: { _count: { select: { rsvps: true } } },
    take: 20
  });
  for (const event of events) {
    const reminderAt = new Date(event.startsAt.getTime() - event.reminderMinutes * 60_000);
    if (reminderAt > now) continue;
    const claimed = await claimTelegramOperation({
      operation: EVENT_REMINDER_CLAIM,
      key: event.id,
      expiresAt: new Date(event.startsAt.getTime() + 12 * 60 * 60_000)
    });
    if (!claimed) continue;
    let reminderDelivered = false;
    try {
      const reminder = await sendCommunityMessage(
        CAMPAIGN_BOT,
        event.chatId,
        `🎧 ${event.title} starts soon. ${event._count.rsvps} people plan to join.`,
        { reply_markup: await telegramCommunityEventReminderKeyboard(event) }
      );
      reminderDelivered = true;
      const config = await communityConfig();
      if (config.voiceReminderCleanupMinutes > 0) {
        await scheduleCommunityMessageCleanup({
          bot: CAMPAIGN_BOT,
          chatId: event.chatId,
          messageId: reminder.message_id,
          kind: 'voice-reminder',
          deleteAfter: new Date(
            event.startsAt.getTime() + config.voiceReminderCleanupMinutes * 60_000
          )
        });
      }
      await prisma.telegramCommunityEvent.update({
        where: { id: event.id },
        data: { reminderSentAt: now }
      });
    } catch (error) {
      if (!reminderDelivered) {
        await releaseTelegramOperation({ operation: EVENT_REMINDER_CLAIM, key: event.id }).catch(
          () => null
        );
      }
      throw error;
    }
  }
  await prisma.telegramCommunityEvent.updateMany({
    where: { status: 'SCHEDULED', startsAt: { lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } },
    data: { status: 'COMPLETED' }
  });
}
