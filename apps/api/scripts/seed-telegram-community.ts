import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db.js';
import {
  GROUP_HELP_CONFIG_FIELDS,
  GROUP_HELP_CONFIG_DEFAULTS
} from '../src/constants/group-help-config.constants.js';
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_META
} from '../src/constants/telegram-bot-controls.constants.js';

const GROUP_USERNAME = (process.env.TELEGRAM_COMMUNITY_GROUP_USERNAME || '@hopehubindia').replace(
  /^([^@])/,
  '@$1'
);

type TelegramGetChatResponse = {
  ok: boolean;
  result?: { id?: number };
  description?: string;
};

async function resolveGroupChatId() {
  const saved = await prisma.siteConfig.findUnique({
    where: { key: 'telegramGroupHelpGroupChatId' },
    select: { value: true }
  });
  const savedValue = saved?.value.trim() || '';
  if (/^-?\d+$/.test(savedValue)) return savedValue;

  const token = process.env.TELEGRAM_RULES_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'TELEGRAM_RULES_BOT_TOKEN is required to resolve the Hope Hub community group ID.'
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

function nextSundayAt(hour: number) {
  const now = new Date();
  const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
  const indiaNow = new Date(now.getTime() + indiaOffsetMs);
  let daysUntilSunday = (7 - indiaNow.getUTCDay()) % 7;
  if (daysUntilSunday === 0 && indiaNow.getUTCHours() >= hour) daysUntilSunday = 7;
  return nextAt(hour, 0, daysUntilSunday);
}

const campaigns = (chatId: string) =>
  [
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
          text: '🕊️ Want to share without your name? Send an anonymous confession through @Hopehubconfessionbot. Every post is reviewed before publication.'
        }
      ]
    },
    {
      id: 'seed_telegram_voice_circle',
      name: 'Daily 9 PM voice circle',
      intervalMinutes: 1440,
      nextRunAt: nextAt(20, 45),
      items: [
        {
          kind: 'MESSAGE',
          text: '🎧 Hope Hub voice circle starts at 9 PM\n\nJoin quietly, listen first, or speak when comfortable. Open the group voice chat here: https://t.me/hopehubindia'
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
    }
  ].map((campaign) => ({ ...campaign, chatId }));

async function seedSiteConfig(chatId: string) {
  for (const field of GROUP_HELP_CONFIG_FIELDS) {
    const value =
      field.key === 'telegramGroupHelpGroupChatId'
        ? chatId
        : GROUP_HELP_CONFIG_DEFAULTS[field.key] || '';
    await prisma.siteConfig.upsert({
      where: { key: field.key },
      create: { key: field.key, value, label: field.label },
      update: field.key === 'telegramGroupHelpGroupChatId' ? { value: chatId } : {}
    });
  }

  for (const [key, value] of Object.entries(TELEGRAM_BOT_CONTROL_DEFAULTS)) {
    await prisma.siteConfig.upsert({
      where: { key },
      create: {
        key,
        value,
        label: TELEGRAM_BOT_CONTROL_META[key as keyof typeof TELEGRAM_BOT_CONTROL_META].label
      },
      update: {}
    });
  }
}

async function seedCampaigns(chatId: string) {
  for (const campaign of campaigns(chatId)) {
    await prisma.telegramCampaign.upsert({
      where: { id: campaign.id },
      update: { chatId },
      create: {
        id: campaign.id,
        name: campaign.name,
        bot: 'rules',
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

try {
  const chatId = await resolveGroupChatId();
  await seedSiteConfig(chatId);
  await seedCampaigns(chatId);
  console.log(
    `[telegram-seed] Configured ${GROUP_USERNAME} (${chatId}) with ${campaigns(chatId).length} active campaigns.`
  );
} finally {
  await prisma.$disconnect();
}
