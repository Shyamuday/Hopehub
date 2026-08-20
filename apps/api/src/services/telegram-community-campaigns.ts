import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import {
  editCommunityReplyMarkup,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';
import { configuredUrlKeyboard } from './telegram-keyboard-config.js';
import { colorizeTelegramKeyboard } from './telegram-button-styles.js';
import { getSiteConfigMap } from './site-config.service.js';
import {
  cleanupCommunityBotData,
  runScheduledCommunityMessageCleanup,
  scheduleCommunityMessageCleanup
} from './telegram-community-bots.store.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import { observeTelegramCommunityMember } from './telegram-community-member-identity.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { TELEGRAM_BOT_URLS } from '../constants/telegram-community-bot.constants.js';
import {
  endTelegramCommunityLockdown,
  expiredTelegramCommunityLockdowns,
  savedLockdownPermissions
} from './telegram-community-group-policy.js';

const CAMPAIGN_BOT = GROUP_HELP_BOT_SLUG;
const MAX_DELIVERIES_PER_SWEEP = 20;
const ENGAGEMENT_CAMPAIGN_ID = 'seed_telegram_hourly_engagement';
const PROMOTION_CAMPAIGN_ID = 'seed_telegram_daily_discovery';
const VOICE_EVENT_ANNOUNCEMENT_LEAD_MS = 60 * 60 * 1000;
// A Telegram group can keep only one live or scheduled voice chat. After a
// call ends, leave a short handover window before restoring the next slot.
const VOICE_EVENT_RECOVERY_DELAY_MS = 15 * 60 * 1000;
const NATIVE_VOICE_SCHEDULER_STATE = 'TELEGRAM_NATIVE_VOICE_SCHEDULER';

type NativeVoiceStatePayload = {
  eventId?: string;
  nativeCallId?: string;
  nativeCallAccessHash?: string;
  startedAt?: string;
  startedEarly?: boolean;
  endedAt?: string;
  recoveryAfter?: string;
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
  'telegramGroupHelpWelcomeButtons',
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
  'telegramCommunityAnnouncementReplacePin'
] as const;

const SMART_SCHEDULE_CONFIG_KEYS = [
  'telegramCommunitySmartScheduleEnabled',
  'telegramCommunityScheduleStart',
  'telegramCommunityScheduleEnd',
  'telegramCommunityMaxPostsPerDay',
  'telegramCommunityEngagementPostsPerDay',
  'telegramCommunityPromotionPostsPerDay',
  'telegramCommunityActiveChatPauseMinutes',
  'telegramCommunityMinimumPostGapMinutes',
  'telegramCommunityContentRepeatDays'
] as const;

async function communityConfig() {
  const values = await getSiteConfigMap(COMMUNITY_CONFIG_KEYS);
  return {
    welcomeEnabled: values.telegramCommunityWelcomeEnabled !== 'Disabled',
    autoDeleteSeconds: boundedNumber(values.telegramGroupHelpAutoDeleteSeconds, 300, 0, 604_800),
    cleanJoinNotice: values.telegramGroupHelpWelcomeCleanup !== 'off',
    joinLeaveMessages: values.telegramGroupHelpJoinLeaveMessages || 'join only',
    welcomeText:
      values.telegramGroupHelpWelcomeMessage ||
      'Welcome to Hope Hub 💙 Participate at your own pace and protect your personal details.',
    welcomeMediaUrl: values.telegramGroupHelpWelcomeImageUrl?.trim() || '',
    welcomeKeyboard: {
      inline_keyboard: [
        [{ text: 'About Hope Hub', callback_data: 'hh_welcome_about', style: 'success' }],
        ...(configuredUrlKeyboard(values.telegramGroupHelpWelcomeButtons || '')?.inline_keyboard ||
          [])
      ]
    },
    goodbyeText: values.telegramGroupHelpGoodbyeMessage?.trim() || '',
    joinProtection: values.telegramGroupHelpJoinProtection || 'off',
    captchaMode: values.telegramGroupHelpCaptchaMode || 'on',
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
    announcementReplacePin: values.telegramCommunityAnnouncementReplacePin !== 'no'
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
  return value.replace(/[_*()[\]]/g, '\\$&');
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

function indiaDayStart(now: Date) {
  const offsetMs = 330 * 60_000;
  const india = new Date(now.getTime() + offsetMs);
  return new Date(
    Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate()) - offsetMs
  );
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
    maxPosts: boundedNumber(values.telegramCommunityMaxPostsPerDay, 14, 1, 30),
    maxEngagementPosts: boundedNumber(values.telegramCommunityEngagementPostsPerDay, 3, 0, 20),
    maxPromotionPosts: boundedNumber(values.telegramCommunityPromotionPostsPerDay, 6, 0, 20),
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

    if (policy.enabled) {
      const minute = indiaMinuteOfDay(now);
      const inActiveHours =
        policy.startMinute === policy.endMinute
          ? true
          : policy.startMinute < policy.endMinute
            ? minute >= policy.startMinute && minute < policy.endMinute
            : minute >= policy.startMinute || minute < policy.endMinute;
      const dayStart = indiaDayStart(now);
      const [dailyPosts, engagementPosts, promotionPosts, lastDelivery, activity] =
        await Promise.all([
          prisma.telegramCampaignDelivery.count({
            where: {
              campaign: { chatId: candidate.chatId },
              status: { in: ['SENT', 'CLOSED'] },
              sentAt: { gte: dayStart }
            }
          }),
          prisma.telegramCampaignDelivery.count({
            where: {
              campaignId: PROMOTION_CAMPAIGN_ID,
              status: { in: ['SENT', 'CLOSED'] },
              sentAt: { gte: dayStart }
            }
          }),
          prisma.telegramCampaignDelivery.count({
            where: {
              campaignId: ENGAGEMENT_CAMPAIGN_ID,
              status: { in: ['SENT', 'CLOSED'] },
              sentAt: { gte: dayStart }
            }
          }),
          prisma.telegramCampaignDelivery.findFirst({
            where: {
              campaign: { chatId: candidate.chatId },
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
        dailyPosts >= policy.maxPosts ||
        (candidate.id === ENGAGEMENT_CAMPAIGN_ID && engagementPosts >= policy.maxEngagementPosts) ||
        (candidate.id === PROMOTION_CAMPAIGN_ID && promotionPosts >= policy.maxPromotionPosts) ||
        Boolean(activeUntil && activeUntil > now) ||
        Boolean(gapUntil && gapUntil > now);
      if (shouldDefer) {
        const quotaReached =
          dailyPosts >= policy.maxPosts ||
          (candidate.id === ENGAGEMENT_CAMPAIGN_ID &&
            engagementPosts >= policy.maxEngagementPosts) ||
          (candidate.id === PROMOTION_CAMPAIGN_ID && promotionPosts >= policy.maxPromotionPosts);
        const nextCheck =
          !inActiveHours || quotaReached
            ? nextIndiaScheduleStart(now, policy.startMinute, quotaReached)
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
    const shouldContinue = candidate.repeat || !isLast;
    const claimed = await prisma.telegramCampaign.updateMany({
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
    if (!claimed.count) continue;
    return { campaign: candidate, item: candidate.items[selectedIndex] };
  }
  return null;
}

async function deliverClaimedCampaign(
  claimed: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>,
  now: Date
) {
  const { campaign, item } = claimed;
  const delivery = await prisma.telegramCampaignDelivery.create({
    data: { campaignId: campaign.id, itemId: item.id, status: 'SENDING' }
  });

  await performCampaignDelivery({ deliveryId: delivery.id, campaign, item, now });
}

async function performCampaignDelivery(input: {
  deliveryId: string;
  campaign: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>['campaign'];
  item: NonNullable<Awaited<ReturnType<typeof claimNextCampaign>>>['item'];
  now: Date;
}) {
  const { deliveryId, campaign, item, now } = input;
  const config = await communityConfig();
  const messageThreadId = item.messageThreadId || config.defaultTopicId || undefined;
  await prisma.telegramCampaignDelivery.update({
    where: { id: deliveryId },
    data: { attempts: { increment: 1 }, nextRetryAt: null }
  });
  try {
    let sent: SentTelegramMessage;
    if (item.kind === 'POLL') {
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
        sentAt: now,
        nextRetryAt: null
      }
    });
    const config = await communityConfig();
    await manageAnnouncementPin(config, campaign.chatId, sent.message_id, 'campaign');
    await logCommunityActivity(config, 'Scheduled community post delivered', [
      `Group: ${campaign.chatId}`,
      `Content type: ${item.kind}`,
      `Delivery: ${deliveryId}`
    ]);
  } catch (error) {
    await prisma.telegramCampaignDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        error: String(error instanceof Error ? error.message : error).slice(0, 1000),
        nextRetryAt: new Date(now.getTime() + 5 * 60_000)
      }
    });
    const config = await communityConfig();
    await logCommunityActivity(config, 'Scheduled community post failed', [
      `Group: ${campaign.chatId}`,
      `Content type: ${item.kind}`,
      `Delivery: ${deliveryId}`,
      'It will retry automatically.'
    ]);
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

export async function runTelegramCampaignScheduler(now = new Date()) {
  await runScheduledCommunityMessageCleanup(now);
  await unpinExpiredAnnouncements(now);
  await runCommunityDataRetentionCleanupHourly(now);
  await restoreExpiredCommunityLockdowns(now);
  if (!telegramCampaignSweepEnabled) return;
  await runTelegramCommunityEventScheduler(now);
  await closeExpiredPolls(now);
  const retries = await prisma.telegramCampaignDelivery.findMany({
    where: { status: 'FAILED', attempts: { lt: 3 }, nextRetryAt: { lte: now } },
    select: { id: true },
    orderBy: { nextRetryAt: 'asc' },
    take: 5
  });
  await Promise.allSettled(
    retries.map((delivery) => retryTelegramCampaignDelivery(delivery.id, now))
  );
  for (let index = 0; index < MAX_DELIVERIES_PER_SWEEP; index += 1) {
    const claimed = await claimNextCampaign(now);
    if (!claimed) break;
    await deliverClaimedCampaign(claimed, now);
  }
}

export async function handleTelegramCommunityVoiceChatEnded(message: CommunityTelegramMessage) {
  if (!message.video_chat_ended || !['group', 'supergroup'].includes(message.chat.type || '')) {
    return false;
  }
  const chatId = String(message.chat.id);
  const now = new Date();
  const recoveryAfter = new Date(now.getTime() + VOICE_EVENT_RECOVERY_DELAY_MS);
  const stateKey = { bot_chatId: { bot: NATIVE_VOICE_SCHEDULER_STATE, chatId } };
  const nativeState = await prisma.telegramCommunityState.findUnique({ where: stateKey });
  const nativePayload = nativeVoiceStatePayload(nativeState?.payload);
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
        recoveryAfter: recoveryAfter.toISOString()
      },
      expiresAt: recoveryAfter
    },
    update: {
      state: 'NATIVE_VOICE_RECOVERY',
      payload: {
        eventId: nativePayload.eventId,
        endedAt: now.toISOString(),
        recoveryAfter: recoveryAfter.toISOString()
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
  if (!activeEvent) return false;
  const startedEarly = activeEvent.startsAt > now;
  if (!startedEarly) {
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
        eventId: activeEvent.id,
        startedAt: now.toISOString(),
        startedEarly
      },
      // Event updates are primary. This is only a 15-minute fallback in case
      // Telegram does not deliver the eventual video_chat_ended update.
      expiresAt: new Date(now.getTime() + VOICE_EVENT_RECOVERY_DELAY_MS)
    },
    update: {
      state: 'NATIVE_VOICE_ACTIVE',
      payload: {
        ...nativePayload,
        eventId: activeEvent.id,
        startedAt: now.toISOString(),
        startedEarly
      },
      expiresAt: new Date(now.getTime() + VOICE_EVENT_RECOVERY_DELAY_MS)
    }
  });
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
  const config = await communityConfig();
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
    let needsVerification = ['captcha', 'strict'].includes(config.joinProtection);
    const captchaEnabled = needsVerification && config.captchaMode !== 'off';
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
            state: 'awaiting-verification',
            payload: {
              groupChatId: String(chat.id),
              captchaAnswer: captchaEnabled ? captchaAnswer : null,
              attempts: 0
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          update: {
            state: 'awaiting-verification',
            payload: {
              groupChatId: String(chat.id),
              captchaAnswer: captchaEnabled ? captchaAnswer : null,
              attempts: 0
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });
      }
    }
    const welcomeText = config.welcomeText
      .replaceAll('{mention}', memberMention(member))
      .replaceAll('{id}', String(member.id));
    const welcomeKeyboard = needsVerification
      ? {
          inline_keyboard: [
            ...(captchaEnabled
              ? [
                  captchaOptions.map((option) => ({
                    text: String(option),
                    callback_data: `hh_join_captcha:${chat.id}:${member.id}:${option}`
                  }))
                ]
              : [[{ text: 'I’m here', callback_data: `hh_join_verify:${chat.id}:${member.id}` }]]),
            ...(config.welcomeKeyboard?.inline_keyboard || [])
          ]
        }
      : config.welcomeKeyboard;
    const verificationPrompt = captchaEnabled
      ? `\n\nTo join the conversation, choose the answer: ${first} + ${second} = ?`
      : '';
    const welcomeMessageText = `${welcomeText}${verificationPrompt}`;
    const media = config.welcomeMediaUrl ? communityMediaPayload(config.welcomeMediaUrl) : null;
    const sent =
      media && welcomeMessageText.length <= 1024
        ? await callCommunityTelegramApi<{ message_id: number }>(CAMPAIGN_BOT, media.method, {
            chat_id: chat.id,
            ...media.media,
            caption: welcomeMessageText,
            parse_mode: 'Markdown',
            message_thread_id: message?.message_thread_id,
            reply_markup: welcomeKeyboard
          }).catch(async (error) => {
            console.error('[telegram-community] Could not send welcome media.', error);
            return sendCommunityMessage(CAMPAIGN_BOT, chat.id, welcomeMessageText, {
              parse_mode: 'Markdown',
              message_thread_id: message?.message_thread_id,
              reply_markup: welcomeKeyboard
            });
          })
        : await sendCommunityMessage(CAMPAIGN_BOT, chat.id, welcomeMessageText, {
            parse_mode: 'Markdown',
            message_thread_id: message?.message_thread_id,
            reply_markup: welcomeKeyboard
          });
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
            captchaAnswer: captchaEnabled ? captchaAnswer : null,
            attempts: 0,
            welcomeMessageId: sent.message_id
          }
        }
      });
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
      `Member: ${member.first_name || 'Telegram member'} (${member.id})`,
      needsVerification ? 'Join verification: required' : 'Join verification: not required'
    ]);
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
  await prisma.telegramCommunityMember.updateMany({
    where: { chatId: String(chat.id), telegramUserId: String(member.id) },
    data: { leftAt: new Date() }
  });
  const config = await communityConfig();
  if (config.joinLeaveMessages === 'join and leave' && config.goodbyeText) {
    const goodbye = config.goodbyeText
      .replaceAll('{mention}', memberMention(member))
      .replaceAll('{id}', String(member.id));
    const sent = await sendCommunityMessage(CAMPAIGN_BOT, chat.id, goodbye, {
      parse_mode: 'Markdown',
      message_thread_id: message?.message_thread_id
    }).catch(() => null);
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
    `Member: ${member.first_name || 'Telegram member'} (${member.id})`
  ]);
  return true;
}

export async function handleTelegramCommunityJoinVerificationCallback(
  update: CommunityTelegramUpdate
) {
  const callback = update.callback_query;
  const data = callback?.data;
  if (
    !callback ||
    (!data?.startsWith('hh_join_verify:') &&
      !data?.startsWith('hh_join_captcha:') &&
      !data?.startsWith('hh_join_allow:'))
  )
    return false;
  const [, chatId, userId, selectedAnswer] = data.split(':');
  if (data.startsWith('hh_join_allow:')) {
    if (!chatId || !userId) return false;
    const membership = await callCommunityTelegramApi<{ status?: string }>(
      CAMPAIGN_BOT,
      'getChatMember',
      {
        chat_id: chatId,
        user_id: callback.from.id
      }
    ).catch(() => null);
    if (!membership || !['creator', 'administrator'].includes(membership.status || ''))
      return 'denied';
    const state = await prisma.telegramCommunityState.findUnique({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
    });
    if (!state || state.expiresAt <= new Date()) return false;
    const approvalPayload = (state.payload || {}) as { welcomeMessageId?: number };
    const config = await communityConfig();
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
    if (approvalPayload.welcomeMessageId) {
      await scheduleCommunityMessageCleanup({
        bot: CAMPAIGN_BOT,
        chatId,
        messageId: approvalPayload.welcomeMessageId,
        kind: 'join-captcha',
        deleteAfter: new Date(Date.now() + config.captchaSuccessCleanupMinutes * 60_000)
      });
    }
    await prisma.telegramCommunityState.delete({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
    });
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
  if (!state || state.expiresAt <= new Date()) return false;
  const payload = (state.payload || {}) as {
    captchaAnswer?: number | null;
    attempts?: number;
    welcomeMessageId?: number;
  };
  if (data.startsWith('hh_join_captcha:') && Number(selectedAnswer) !== payload.captchaAnswer) {
    const config = await communityConfig();
    const attempts = Number(payload.attempts || 0) + 1;
    if (config.joinProtection === 'strict' && attempts >= 3) {
      const action = config.failedVerificationAction;
      const shouldRemove = action === 'remove from group' || action === 'kick';
      const shouldBan = action === 'ban';
      if (shouldRemove || shouldBan) {
        await callCommunityTelegramApi(CAMPAIGN_BOT, 'banChatMember', {
          chat_id: chatId,
          user_id: Number(userId)
        });
        // A kick removes the member but lets them join again later; a ban requires a staff member
        // to unban them intentionally.
        if (shouldRemove) {
          await callCommunityTelegramApi(CAMPAIGN_BOT, 'unbanChatMember', {
            chat_id: chatId,
            user_id: Number(userId),
            only_if_banned: true
          });
        }
        await prisma.telegramCommunityState.delete({
          where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
        });
        await logCommunityActivity(config, 'Join verification failed', [
          `Group: ${chatId}`,
          `Member ID: ${userId}`,
          `Action: ${action}`
        ]);
        return 'review';
      }
      await prisma.telegramCommunityState.update({
        where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
        data: { state: 'awaiting-admin-approval', payload: { ...payload, attempts } }
      });
      const destination = config.staffGroupId || config.logChannelId;
      if (destination) {
        await sendCommunityMessage(
          CAMPAIGN_BOT,
          destination,
          `Captcha review needed\n\nA member joined but failed the captcha 3 times. They are still restricted.\n\nMember: ${userId}\nGroup: ${chatId}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Allow member', callback_data: `hh_join_allow:${chatId}:${userId}` }]
              ]
            }
          }
        ).catch(() => null);
      }
      await logCommunityActivity(config, 'Join verification failed', [
        `Group: ${chatId}`,
        `Member ID: ${userId}`,
        `Action: ${action === 'keep restricted' || action === 'mute' ? 'kept restricted' : 'awaiting administrator approval'}`
      ]);
      return 'review';
    }
    await prisma.telegramCommunityState.update({
      where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } },
      data: { payload: { ...payload, attempts } }
    });
    return 'incorrect';
  }
  const config = await communityConfig();
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
  if (payload.welcomeMessageId) {
    await scheduleCommunityMessageCleanup({
      bot: CAMPAIGN_BOT,
      chatId,
      messageId: payload.welcomeMessageId,
      kind: 'join-captcha',
      deleteAfter: new Date(Date.now() + config.captchaSuccessCleanupMinutes * 60_000)
    });
  }
  await prisma.telegramCommunityState.delete({
    where: { bot_chatId: { bot: `group-join-verification:${chatId}`, chatId: userId } }
  });
  await logCommunityActivity(config, 'Join verification completed', [
    `Group: ${chatId}`,
    `Member ID: ${userId}`
  ]);
  return 'verified';
}

async function telegramCommunityEventKeyboard(
  event: { id: string; joinUrl: string },
  rsvpCount: number
) {
  const config = await communityConfig();
  return {
    inline_keyboard: [
      [{ text: `I’ll join (${rsvpCount})`, callback_data: `event:rsvp:${event.id}` }],
      [
        { text: 'Join voice circle', url: event.joinUrl },
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
        { text: 'Join voice circle', url: event.joinUrl },
        { text: 'Talk privately (paid)', url: config.supportUrl }
      ]
    ]
  };
}

export async function announceTelegramCommunityEvent(eventId: string) {
  const event = await prisma.telegramCommunityEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { rsvps: true } } }
  });
  if (!event || event.status !== 'SCHEDULED') return null;
  const keyboard = await telegramCommunityEventKeyboard(event, event._count.rsvps);
  const sent = await sendCommunityMessage(
    CAMPAIGN_BOT,
    event.chatId,
    [
      `🎧 ${event.title}`,
      event.description,
      '',
      `Starts: ${event.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ]
      .filter(Boolean)
      .join('\n'),
    {
      reply_markup: keyboard
    }
  );
  await manageAnnouncementPin(await communityConfig(), event.chatId, sent.message_id, 'event');
  return prisma.telegramCommunityEvent.update({
    where: { id: event.id },
    data: { telegramMessageId: sent.message_id, announcedAt: new Date() }
  });
}

export async function refreshTelegramCommunityEventAnnouncement(eventId: string) {
  const event = await prisma.telegramCommunityEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { rsvps: { where: { status: 'GOING' } } } } }
  });
  if (!event) return null;
  if (!event.telegramMessageId) return announceTelegramCommunityEvent(event.id);
  const keyboard = await telegramCommunityEventKeyboard(event, event._count.rsvps);
  await callCommunityTelegramApi(CAMPAIGN_BOT, 'editMessageText', {
    chat_id: event.chatId,
    message_id: event.telegramMessageId,
    text: [
      `🎧 ${event.title}`,
      event.description,
      '',
      `Starts: ${event.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ]
      .filter(Boolean)
      .join('\n'),
    reply_markup: keyboard
  });
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
    const keyboard = await telegramCommunityEventKeyboard(event, total);
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
    await sendCommunityMessage(
      CAMPAIGN_BOT,
      event.chatId,
      `🎧 ${event.title} starts soon. ${event._count.rsvps} people plan to join.`,
      { reply_markup: await telegramCommunityEventReminderKeyboard(event) }
    );
    await prisma.telegramCommunityEvent.update({
      where: { id: event.id },
      data: { reminderSentAt: now }
    });
  }
  await prisma.telegramCommunityEvent.updateMany({
    where: { status: 'SCHEDULED', startsAt: { lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } },
    data: { status: 'COMPLETED' }
  });
}
