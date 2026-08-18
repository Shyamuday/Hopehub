import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db.js';
import {
  GROUP_HELP_CONFIG_FIELDS,
  GROUP_HELP_CONFIG_DEFAULTS,
  HOPEHUB_COMMUNITY_WELCOME_MESSAGE,
  LEGACY_HOPEHUB_COMMUNITY_WELCOME_MESSAGE
} from '../src/constants/group-help-config.constants.js';
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_META
} from '../src/constants/telegram-bot-controls.constants.js';
import { TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS } from '../src/constants/telegram-community-content.constants.js';
import {
  GROUP_HELP_BOT_SLUG,
  TELEGRAM_BOT_USERNAMES
} from '../src/constants/telegram-community-bot.constants.js';
import { colorizeTelegramPayload } from '../src/services/telegram-button-styles.js';

const GROUP_USERNAME = (process.env.TELEGRAM_COMMUNITY_GROUP_USERNAME || '@hopehubindia').replace(
  /^([^@])/,
  '@$1'
);
const MANAGED_DEFAULT_PREFIX = 'system:telegram-group-help:default:';

type TelegramGetChatResponse = {
  ok: boolean;
  result?: { id?: number };
  description?: string;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramAdministrator = {
  user: { id: number; is_bot?: boolean; username?: string };
  status: string;
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_pin_messages?: boolean;
};

async function telegramApi<T>(token: string, method: string, payload: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colorizeTelegramPayload(payload))
  });
  const body = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !body.ok) throw new Error(body.description || `Telegram ${method} failed.`);
  return body.result as T;
}

async function resolveGroupChatId() {
  const saved = await prisma.siteConfig.findUnique({
    where: { key: 'telegramGroupHelpGroupChatId' },
    select: { value: true }
  });
  const savedValue = saved?.value.trim() || '';
  if (/^-?\d+$/.test(savedValue)) return savedValue;

  const token =
    process.env.TELEGRAM_HOPEHUBBOT_TOKEN?.trim() || process.env.TELEGRAM_RULES_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'TELEGRAM_HOPEHUBBOT_TOKEN is required to resolve the Hope Hub community group ID.'
    );
  }
  const response = await fetch(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(GROUP_USERNAME)}`
  );
  const body = (await response.json()) as TelegramGetChatResponse;
  if (!response.ok || !body.ok || body.result?.id == null) {
    throw new Error(body.description || `Could not resolve Telegram group ${GROUP_USERNAME}.`);
  }
  return String(body.result.id);
}

function nextAt(hour: number, minute = 0, dayOffset = 0) {
  const now = new Date();
  const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
  const indiaNow = new Date(now.getTime() + indiaOffsetMs);
  const targetIndia = new Date(
    Date.UTC(
      indiaNow.getUTCFullYear(),
      indiaNow.getUTCMonth(),
      indiaNow.getUTCDate() + dayOffset,
      hour,
      minute
    )
  );
  if (targetIndia.getTime() <= indiaNow.getTime())
    targetIndia.setUTCDate(targetIndia.getUTCDate() + 1);
  return new Date(targetIndia.getTime() - indiaOffsetMs);
}

function nextWeekdayAt(weekday: number, hour: number, minute = 0) {
  const now = new Date();
  const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
  const indiaNow = new Date(now.getTime() + indiaOffsetMs);
  let daysUntilTarget = (weekday - indiaNow.getUTCDay() + 7) % 7;
  if (
    daysUntilTarget === 0 &&
    (indiaNow.getUTCHours() > hour ||
      (indiaNow.getUTCHours() === hour && indiaNow.getUTCMinutes() >= minute))
  )
    daysUntilTarget = 7;
  return nextAt(hour, minute, daysUntilTarget);
}

function nextSundayAt(hour: number) {
  return nextWeekdayAt(0, hour);
}

const campaigns = (chatId: string) =>
  [
    {
      id: 'seed_telegram_hourly_engagement',
      name: 'Smart rotating community engagement',
      intervalMinutes: 180,
      nextRunAt: nextAt(11),
      items: TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS
    },
    {
      id: 'seed_telegram_daily_discovery',
      name: 'Daily Hope Hub discovery links',
      intervalMinutes: 120,
      nextRunAt: nextAt(9),
      items: [
        {
          kind: 'MESSAGE',
          text: '💙 Could you help someone find a kind place today?\n\nIf Hope Hub has felt helpful to you, please invite five friends and add @hopehubindia to your bio if that feels right.\n\nYou never know who may be quietly going through a hard time. A small share can help someone find a place to talk, be heard, and feel less alone.\n\nThank you for helping this space grow with care.'
        },
        {
          kind: 'MESSAGE',
          text: '✨ Earn with Hope Hub\n\nWant to explore ways to earn while contributing to a kinder community?',
          buttons: [
            {
              text: 'Start earning with Hope Hub',
              url: 'https://earn.hopehub.in/',
              style: 'success'
            }
          ]
        },
        {
          kind: 'MESSAGE',
          text: '🌐 Explore Hope Hub\n\nFind private support, caring listeners, self-checks, care options, community spaces, and wellbeing tools.',
          buttons: [{ text: 'Explore Hope Hub', url: 'https://hopehub.in/', style: 'primary' }]
        },
        {
          kind: 'MESSAGE',
          text: '💙 Could you help someone find a kind place today?\n\nIf Hope Hub has felt helpful to you, please invite five friends and add @hopehubindia to your bio if that feels right.\n\nYou never know who may be quietly going through a hard time. A small share can help someone find a place to talk, be heard, and feel less alone.\n\nThank you for helping this space grow with care.'
        },
        {
          kind: 'MESSAGE',
          text: '✨ Earn with Hope Hub\n\nWant to explore ways to earn while contributing to a kinder community?',
          buttons: [
            {
              text: 'Start earning with Hope Hub',
              url: 'https://earn.hopehub.in/',
              style: 'success'
            }
          ]
        },
        {
          kind: 'MESSAGE',
          text: '🌐 Explore Hope Hub\n\nFind private support, caring listeners, self-checks, care options, community spaces, and wellbeing tools.',
          buttons: [{ text: 'Explore Hope Hub', url: 'https://hopehub.in/', style: 'primary' }]
        }
      ]
    },
    {
      id: 'seed_telegram_daily_checkin',
      name: 'Daily community check-in',
      intervalMinutes: 1440,
      nextRunAt: nextAt(10),
      items: [
        {
          kind: 'POLL',
          pollQuestion: 'How are you arriving today?',
          pollOptions: [
            'I need someone to listen',
            'Things feel heavy',
            'I am managing',
            'I feel good'
          ],
          pollAnonymous: false,
          pollMultiple: false,
          pollQuiz: false,
          closeAfterMinutes: 720,
          followUpOptionIds: [0, 1],
          followUpMessage:
            'Thank you for checking in. You do not have to carry this alone. A caring listener is available when you feel ready.'
        },
        {
          kind: 'MESSAGE',
          text: '💙 One-minute reset\n\nRelax your shoulders. Take one slow breath in, and a longer breath out. You only need to handle the next small moment.'
        },
        {
          kind: 'POLL',
          pollQuestion: 'What kind of support would feel most helpful today?',
          pollOptions: [
            'A private chat',
            'A voice conversation',
            'A calm group space',
            'A self-check'
          ],
          pollAnonymous: true,
          pollMultiple: false,
          pollQuiz: false,
          closeAfterMinutes: 720
        }
      ]
    },
    {
      id: 'seed_telegram_evening_prompt',
      name: 'Evening community prompt',
      intervalMinutes: 1440,
      nextRunAt: nextAt(18),
      items: [
        {
          kind: 'MESSAGE',
          text: '✨ Evening check-in\n\nWhat is one small thing you handled today, even if nobody noticed? Share only what feels comfortable.'
        },
        {
          kind: 'POLL',
          pollQuestion: 'Which reply is most supportive when someone shares a difficult feeling?',
          pollOptions: [
            'You should just stop thinking about it',
            'That sounds difficult. I am here to listen',
            'Other people have it worse'
          ],
          pollAnonymous: true,
          pollMultiple: false,
          pollQuiz: true,
          correctOptionIds: [1],
          pollExplanation: 'Listening without judging or minimising helps people feel safer.',
          closeAfterMinutes: 720
        },
        {
          kind: 'MESSAGE',
          text: `🕊️ Want to share without your name? Send an anonymous confession through ${TELEGRAM_BOT_USERNAMES.CONFESSION}. Every post is reviewed before publication.`
        }
      ]
    },
    {
      id: 'seed_telegram_weekly_summary',
      name: 'Weekly community summary',
      intervalMinutes: 10080,
      nextRunAt: nextSundayAt(20),
      items: [
        {
          kind: 'SUMMARY',
          text: '💙 Our Hope Hub community this week'
        }
      ]
    },
    {
      id: 'seed_telegram_weekly_needs_pulse',
      name: 'Weekly community needs pulse',
      intervalMinutes: 10080,
      nextRunAt: nextWeekdayAt(3, 19),
      items: [
        {
          kind: 'POLL',
          pollQuestion: 'What would support you most this week? Choose any that fit.',
          pollOptions: [
            'Someone to listen',
            'Better sleep and rest',
            'Calmer thoughts',
            'Motivation and routine',
            'A gentle group conversation'
          ],
          pollAnonymous: true,
          pollMultiple: true,
          pollQuiz: false,
          closeAfterMinutes: 1440
        },
        {
          kind: 'POLL',
          pollQuestion: 'Which community activity would you join this week?',
          pollOptions: [
            'A guided check-in',
            'Open voice circle',
            'Quiet listening space',
            'A practical wellbeing discussion'
          ],
          pollAnonymous: true,
          pollMultiple: true,
          pollQuiz: false,
          closeAfterMinutes: 1440
        },
        {
          kind: 'POLL',
          pollQuestion: 'When would a Hope Hub group activity suit you best?',
          pollOptions: ['Morning', 'Afternoon', 'Evening', 'Late evening'],
          pollAnonymous: true,
          pollMultiple: true,
          pollQuiz: false,
          closeAfterMinutes: 1440
        }
      ]
    },
    {
      id: 'seed_telegram_weekend_reflection',
      name: 'Weekend community reflection',
      intervalMinutes: 10080,
      nextRunAt: nextWeekdayAt(6, 11),
      items: [
        {
          kind: 'MESSAGE',
          text: '🌿 Weekend reflection\n\nWhat is one thing you want to leave behind from this week, and one feeling you want to carry forward? Share only what feels safe.'
        },
        {
          kind: 'POLL',
          pollQuestion: 'How would you like to care for yourself this weekend?',
          pollOptions: [
            'Rest without guilt',
            'Talk to someone I trust',
            'Spend time outside',
            'Complete one small task',
            'Join a supportive conversation'
          ],
          pollAnonymous: true,
          pollMultiple: true,
          pollQuiz: false,
          closeAfterMinutes: 1440
        },
        {
          kind: 'MESSAGE',
          text: '💛 A gentle reminder\n\nProgress can be quiet. Resting, asking for help, setting a boundary, or beginning again all count.'
        }
      ]
    },
    {
      id: 'seed_telegram_support_skills',
      name: 'Support skills and safer conversations',
      intervalMinutes: 4320,
      nextRunAt: nextAt(16),
      items: [
        {
          kind: 'POLL',
          pollQuestion: 'A friend says, “I feel overwhelmed.” What is the best first response?',
          pollOptions: [
            'Tell them what they should do',
            'Ask if they want listening or suggestions',
            'Explain why the problem is not serious'
          ],
          pollAnonymous: true,
          pollMultiple: false,
          pollQuiz: true,
          correctOptionIds: [1],
          pollExplanation:
            'Asking what kind of support they want respects their needs and reduces pressure.',
          closeAfterMinutes: 1440
        },
        {
          kind: 'POLL',
          pollQuestion: 'Which sentence shows a healthy boundary?',
          pollOptions: [
            'I must always be available',
            'I care about you, and I need to rest now',
            'Your feelings are not my problem'
          ],
          pollAnonymous: true,
          pollMultiple: false,
          pollQuiz: true,
          correctOptionIds: [1],
          pollExplanation: 'A clear and kind boundary protects both people without rejecting care.',
          closeAfterMinutes: 1440
        },
        {
          kind: 'POLL',
          pollQuestion: 'What helps make a peer-support group safer?',
          pollOptions: [
            'Keeping personal stories private',
            'Giving diagnoses to other members',
            'Pressuring people to share details'
          ],
          pollAnonymous: true,
          pollMultiple: false,
          pollQuiz: true,
          correctOptionIds: [0],
          pollExplanation:
            'Privacy, consent, and listening without diagnosis support a safer space.',
          closeAfterMinutes: 1440
        }
      ]
    }
  ].map((campaign) => ({ ...campaign, chatId }));

async function seedSiteConfig(chatId: string) {
  const seedDefaults: Record<string, string> = {
    ...GROUP_HELP_CONFIG_DEFAULTS,
    telegramGroupHelpGroupChatId: chatId,
    telegramGroupModerationRuntime: 'Hope Hub bot'
  };
  await syncManagedGroupHelpDefaults(seedDefaults);

  await prisma.siteConfig.updateMany({
    where: {
      key: 'telegramGroupHelpWelcomeMessage',
      value: LEGACY_HOPEHUB_COMMUNITY_WELCOME_MESSAGE
    },
    data: { value: HOPEHUB_COMMUNITY_WELCOME_MESSAGE }
  });
  await prisma.siteConfig.updateMany({
    where: { key: 'telegramCommunityMaxPostsPerDay', value: '8' },
    data: { value: '14' }
  });

  const botControlSeedDefaults: Record<string, string> = {
    ...TELEGRAM_BOT_CONTROL_DEFAULTS,
    telegramContactSupportGroupId:
      process.env.TELEGRAM_CONTACT_SUPPORT_GROUP_ID?.trim() ||
      process.env.TELEGRAM_CONTACT_ADMIN_CHAT_ID?.trim() ||
      process.env.SUPPORT_GROUP_ID?.trim() ||
      process.env.ADMIN_CHAT_ID?.trim() ||
      '',
    telegramConfessionAdminChatId: process.env.TELEGRAM_CONFESSION_ADMIN_CHAT_ID?.trim() || '',
    telegramConfessionApprovalGroupId:
      process.env.TELEGRAM_CONFESSION_APPROVAL_GROUP_ID?.trim() || '',
    telegramConfessionChannelId: process.env.TELEGRAM_CONFESSION_CHANNEL_ID?.trim() || '',
    telegramConfessionChannelName:
      process.env.TELEGRAM_CONFESSION_CHANNEL_NAME?.trim() ||
      TELEGRAM_BOT_CONTROL_DEFAULTS.telegramConfessionChannelName,
    telegramConfessionStartNumber:
      process.env.TELEGRAM_CONFESSION_START_NUMBER?.trim() ||
      TELEGRAM_BOT_CONTROL_DEFAULTS.telegramConfessionStartNumber
  };
  await syncManagedBotControlDefaults(botControlSeedDefaults);
}

/**
 * Keeps built-in configuration current without overwriting an administrator's
 * custom setting. A hidden snapshot records the last default the seed owned.
 */
async function syncManagedGroupHelpDefaults(defaults: Record<string, string>) {
  const fields = GROUP_HELP_CONFIG_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: defaults[field.key] ?? ''
  }));
  await syncManagedDefaults(fields);
}

async function syncManagedBotControlDefaults(defaults: Record<string, string>) {
  await syncManagedDefaults(
    Object.entries(defaults).map(([key, value]) => ({
      key,
      value,
      label: TELEGRAM_BOT_CONTROL_META[key as keyof typeof TELEGRAM_BOT_CONTROL_META].label
    }))
  );
}

async function syncManagedDefaults(fields: Array<{ key: string; label: string; value: string }>) {
  const keys = fields.flatMap((field) => [field.key, `${MANAGED_DEFAULT_PREFIX}${field.key}`]);
  const existing = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const values = new Map(existing.map((item) => [item.key, item]));

  await prisma.$transaction(
    fields.flatMap((field) => {
      const current = values.get(field.key);
      const snapshot = values.get(`${MANAGED_DEFAULT_PREFIX}${field.key}`);
      const shouldApplyDefault = !current || (snapshot != null && current.value === snapshot.value);
      const configWrite = current
        ? prisma.siteConfig.update({
            where: { key: field.key },
            data: {
              label: field.label,
              ...(shouldApplyDefault && current.value !== field.value ? { value: field.value } : {})
            }
          })
        : prisma.siteConfig.create({
            data: { key: field.key, value: field.value, label: field.label }
          });
      const snapshotWrite = prisma.siteConfig.upsert({
        where: { key: `${MANAGED_DEFAULT_PREFIX}${field.key}` },
        create: {
          key: `${MANAGED_DEFAULT_PREFIX}${field.key}`,
          value: field.value,
          label: `Managed default snapshot for ${field.label}`
        },
        update: { value: field.value }
      });
      return [configWrite, snapshotWrite];
    })
  );
}

async function seedCampaigns(chatId: string) {
  // Voice-circle notices are owned by TelegramCommunityEvent so that the
  // announcement and the native scheduled VC can never be duplicated by an
  // older recurring campaign.
  await prisma.telegramCampaign.updateMany({
    where: { id: 'seed_telegram_voice_circle' },
    data: { isActive: false, repeat: false }
  });
  for (const campaign of campaigns(chatId)) {
    const existing = await prisma.telegramCampaign.findUnique({
      where: { id: campaign.id },
      select: {
        id: true,
        items: { select: { buttons: true, text: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { items: true } }
      }
    });
    const expectedItemCount =
      campaign.id === 'seed_telegram_hourly_engagement'
        ? TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.length
        : campaign.id === 'seed_telegram_daily_discovery'
          ? 6
          : null;
    const promotionNeedsButtonMigration =
      campaign.id === 'seed_telegram_daily_discovery' &&
      Boolean(
        existing?.items.some(
          (storedItem, index) => 'buttons' in campaign.items[index] && !storedItem.buttons
        )
      );
    const promotionNeedsCopyMigration =
      campaign.id === 'seed_telegram_daily_discovery' &&
      Boolean(
        existing?.items.some((storedItem) => storedItem.text?.includes('t.me/hopehubindia/8941'))
      );
    const shouldRefreshLibrary =
      (expectedItemCount != null && existing?._count.items !== expectedItemCount) ||
      promotionNeedsButtonMigration ||
      promotionNeedsCopyMigration;
    if (existing && shouldRefreshLibrary) {
      await prisma.$transaction(async (tx) => {
        await tx.telegramCampaignItem.deleteMany({ where: { campaignId: campaign.id } });
        await tx.telegramCampaign.update({
          where: { id: campaign.id },
          data: {
            chatId,
            bot: GROUP_HELP_BOT_SLUG,
            name: campaign.name,
            intervalMinutes: campaign.intervalMinutes,
            currentItemIndex: 0,
            items: {
              create: campaign.items.map((item, sortOrder) => ({
                sortOrder,
                kind: item.kind,
                text: 'text' in item ? item.text : undefined,
                buttons: 'buttons' in item ? (item.buttons as Prisma.InputJsonValue) : undefined,
                pollQuestion: 'pollQuestion' in item ? item.pollQuestion : undefined,
                pollOptions:
                  'pollOptions' in item ? (item.pollOptions as Prisma.InputJsonValue) : undefined,
                pollAnonymous: 'pollAnonymous' in item ? item.pollAnonymous : true,
                pollMultiple: 'pollMultiple' in item ? item.pollMultiple : false,
                pollQuiz: 'pollQuiz' in item ? item.pollQuiz : false,
                correctOptionIds:
                  'correctOptionIds' in item
                    ? (item.correctOptionIds as Prisma.InputJsonValue)
                    : undefined,
                pollExplanation: 'pollExplanation' in item ? item.pollExplanation : undefined,
                closeAfterMinutes: 'closeAfterMinutes' in item ? item.closeAfterMinutes : undefined
              }))
            }
          }
        });
      });
      continue;
    }
    await prisma.telegramCampaign.upsert({
      where: { id: campaign.id },
      update: { chatId, bot: GROUP_HELP_BOT_SLUG },
      create: {
        id: campaign.id,
        name: campaign.name,
        bot: GROUP_HELP_BOT_SLUG,
        chatId,
        timezone: 'Asia/Kolkata',
        intervalMinutes: campaign.intervalMinutes,
        repeat: true,
        isActive: true,
        nextRunAt: campaign.nextRunAt,
        items: {
          create: campaign.items.map((item, sortOrder) => ({
            sortOrder,
            kind: item.kind,
            text: 'text' in item ? item.text : undefined,
            buttons: 'buttons' in item ? (item.buttons as Prisma.InputJsonValue) : undefined,
            pollQuestion: 'pollQuestion' in item ? item.pollQuestion : undefined,
            pollOptions:
              'pollOptions' in item ? (item.pollOptions as Prisma.InputJsonValue) : undefined,
            pollAnonymous: 'pollAnonymous' in item ? item.pollAnonymous : true,
            pollMultiple: 'pollMultiple' in item ? item.pollMultiple : false,
            pollQuiz: 'pollQuiz' in item ? item.pollQuiz : false,
            correctOptionIds:
              'correctOptionIds' in item
                ? (item.correctOptionIds as Prisma.InputJsonValue)
                : undefined,
            pollExplanation: 'pollExplanation' in item ? item.pollExplanation : undefined,
            closeAfterMinutes: 'closeAfterMinutes' in item ? item.closeAfterMinutes : undefined,
            followUpOptionIds:
              'followUpOptionIds' in item
                ? (item.followUpOptionIds as Prisma.InputJsonValue)
                : undefined,
            followUpMessage: 'followUpMessage' in item ? item.followUpMessage : undefined
          }))
        }
      }
    });
  }
}

async function sendPromotionPreviewToTestGroup() {
  const previewVersion = 'daily-discovery-buttons-v1';
  const priorPreview = await prisma.siteConfig.findUnique({
    where: { key: 'telegramCampaignPromotionPreviewVersion' },
    select: { value: true }
  });
  if (priorPreview?.value === previewVersion) return;

  const [testGroupConfig, token] = await Promise.all([
    prisma.siteConfig.findUnique({
      where: { key: 'telegramGroupHelpTestGroupChatId' },
      select: { value: true }
    }),
    Promise.resolve(process.env.TELEGRAM_HOPEHUBBOT_TOKEN?.trim())
  ]);
  const testGroupChatId = testGroupConfig?.value?.trim();
  if (!testGroupChatId || !token) {
    console.warn(
      '[telegram-seed] Promotion preview skipped: test group or HopeHubAI token is missing.'
    );
    return;
  }

  const discoveryCampaign = campaigns('preview').find(
    (campaign) => campaign.id === 'seed_telegram_daily_discovery'
  );
  if (!discoveryCampaign) return;

  for (const item of discoveryCampaign.items.slice(0, 3)) {
    const buttons = 'buttons' in item && Array.isArray(item.buttons) ? item.buttons : [];
    await telegramApi(token, 'sendMessage', {
      chat_id: testGroupChatId,
      text: `🧪 Scheduled post preview\n\n${'text' in item ? item.text : ''}`,
      disable_web_page_preview: true,
      ...(buttons.length
        ? { reply_markup: { inline_keyboard: buttons.map((button) => [button]) } }
        : {})
    });
  }
  await prisma.siteConfig.upsert({
    where: { key: 'telegramCampaignPromotionPreviewVersion' },
    create: {
      key: 'telegramCampaignPromotionPreviewVersion',
      value: previewVersion,
      label: 'Daily discovery campaign preview version'
    },
    update: { value: previewVersion }
  });
  console.log(
    `[telegram-seed] Sent the three daily discovery post previews to ${testGroupChatId}.`
  );
}

async function recordRoseStatus(value: string) {
  await prisma.siteConfig.upsert({
    where: { key: 'telegramRoseBotStatus' },
    create: { key: 'telegramRoseBotStatus', value, label: 'Rose bot handover status' },
    update: { value, label: 'Rose bot handover status' }
  });
}

async function retireRoseBot(chatId: string) {
  const token = process.env.TELEGRAM_HOPEHUBBOT_TOKEN?.trim();
  if (!token) {
    await recordRoseStatus('HopeHubAI token missing; Rose was not removed.');
    return;
  }

  const [me, administrators] = await Promise.all([
    telegramApi<{ id: number; username?: string }>(token, 'getMe', {}),
    telegramApi<TelegramAdministrator[]>(token, 'getChatAdministrators', { chat_id: chatId })
  ]);
  const hopeHubAdmin = administrators.find((admin) => admin.user.id === me.id);
  if (!hopeHubAdmin?.can_delete_messages || !hopeHubAdmin.can_restrict_members) {
    const missing = [
      !hopeHubAdmin?.can_delete_messages ? 'delete messages' : '',
      !hopeHubAdmin?.can_restrict_members ? 'restrict members' : ''
    ]
      .filter(Boolean)
      .join(', ');
    await recordRoseStatus(`Rose remains active. HopeHubAI needs permission to ${missing}.`);
    console.warn(`[telegram-seed] Rose not removed: HopeHubAI needs permission to ${missing}.`);
    return;
  }

  const rose = administrators.find(
    (admin) => admin.user.is_bot && /rose/i.test(admin.user.username || '')
  );
  if (!rose) {
    await recordRoseStatus('No Rose administrator bot found; HopeHubAI is the active runtime.');
    return;
  }

  await telegramApi(token, 'banChatMember', {
    chat_id: chatId,
    user_id: rose.user.id,
    revoke_messages: false
  });
  await telegramApi(token, 'unbanChatMember', {
    chat_id: chatId,
    user_id: rose.user.id,
    only_if_banned: true
  });
  const username = rose.user.username ? `@${rose.user.username}` : String(rose.user.id);
  await recordRoseStatus(
    `${username} removed on ${new Date().toISOString()}; HopeHubAI is the active runtime.`
  );
  console.log(`[telegram-seed] Removed legacy Rose bot ${username} from ${chatId}.`);
}

try {
  const chatId = await resolveGroupChatId();
  await seedSiteConfig(chatId);
  await seedCampaigns(chatId);
  await sendPromotionPreviewToTestGroup();
  await retireRoseBot(chatId);
  console.log(
    `[telegram-seed] Configured ${GROUP_USERNAME} (${chatId}) with ${campaigns(chatId).length} active campaigns.`
  );
} finally {
  await prisma.$disconnect();
}
