import 'dotenv/config';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_PATH = '/etc/hopehub-telegram-content-channels.json';
const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';

type ChannelPlan = {
  slug: string;
  title: string;
  username: string;
  category: string;
  about: string;
};

type ChannelState = Record<
  string,
  { id: string; title: string; username: string; chatId: string; createdAt: string }
>;

const plans: ChannelPlan[] = [
  {
    slug: 'mental-health',
    title: 'Mindspace Daily',
    username: 'MindspaceDaily',
    category: 'Mental health',
    about:
      'Practical, source-linked mental wellbeing education for everyday life. This channel is not a substitute for professional care.'
  },
  {
    slug: 'relationships',
    title: 'HeartTalk',
    username: 'HeartTalkDaily',
    category: 'Relationships',
    about:
      'Thoughtful relationship, communication, and connection insights from trusted public sources.'
  },
  {
    slug: 'motivation',
    title: 'Daily Spark',
    username: 'DailySpark',
    category: 'Motivation',
    about: 'Small daily ideas for motivation, habits, resilience, and personal growth.'
  },
  {
    slug: 'career',
    title: 'Career Compass',
    username: 'CareerCompassDaily',
    category: 'Career',
    about: 'Career guidance, skills, work-life insights, and useful opportunities.'
  },
  {
    slug: 'technology',
    title: 'Tech Pulse',
    username: 'TechPulseDaily',
    category: 'Technology',
    about: 'Clear, useful technology news and practical digital tools.'
  },
  {
    slug: 'ai',
    title: 'AI Brief',
    username: 'AIBriefDaily',
    category: 'Artificial intelligence',
    about: 'AI news, tools, and explainers for curious everyday learners.'
  },
  {
    slug: 'finance',
    title: 'Money Sense',
    username: 'MoneySenseDaily',
    category: 'Personal finance',
    about: 'Personal-finance education and economic explainers. Not investment advice.'
  },
  {
    slug: 'health',
    title: 'Health Notes',
    username: 'HealthNotesDaily',
    category: 'Health education',
    about:
      'Trusted, source-linked health education and everyday wellness notes. Not medical advice.'
  },
  {
    slug: 'startups',
    title: 'Startup Circle',
    username: 'StartupCircleDaily',
    category: 'Startups',
    about: 'Startup stories, founder lessons, and practical business ideas.'
  },
  {
    slug: 'education',
    title: 'LearnLab',
    username: 'LearnLabDaily',
    category: 'Education',
    about: 'Courses, scholarships, learning methods, and useful educational resources.'
  },
  {
    slug: 'ayurveda',
    title: 'Ayurveda Guide',
    username: 'AyurvedaGuideDaily',
    category: 'Ayurveda',
    about:
      'Educational Ayurveda traditions, routines, and safe wellness information. Not medical advice.'
  },
  {
    slug: 'exercise',
    title: 'MoveWell',
    username: 'MoveWellDaily',
    category: 'Exercise',
    about: 'Beginner-friendly movement, mobility, fitness, and recovery education.'
  },
  {
    slug: 'nutrition',
    title: 'Food & Wellness',
    username: 'FoodWellnessDaily',
    category: 'Nutrition',
    about:
      'Food, nutrition, and practical healthy habits from credible sources. Not medical advice.'
  },
  {
    slug: 'sleep',
    title: 'Sleep Better',
    username: 'SleepBetterDaily',
    category: 'Sleep',
    about: 'Sleep, recovery, and calm routines for healthier everyday living.'
  },
  {
    slug: 'yoga',
    title: 'Yoga & Breath',
    username: 'YogaBreathDaily',
    category: 'Yoga and breathwork',
    about: 'Yoga, meditation, and breathwork education for mindful daily practice.'
  },
  {
    slug: 'womens-wellness',
    title: 'Her Wellness',
    username: 'HerWellnessDaily',
    category: "Women's wellness",
    about: "Women's wellbeing and health education from trusted public sources. Not medical advice."
  },
  {
    slug: 'mens-wellness',
    title: "Men's Wellbeing",
    username: 'MensWellbeingDaily',
    category: "Men's wellness",
    about: "Men's wellbeing, fitness, and emotional-health education. Not medical advice."
  },
  {
    slug: 'parenting',
    title: 'Parenting Circle',
    username: 'ParentingCircleDaily',
    category: 'Parenting',
    about: 'Practical parenting, family wellbeing, and child development education.'
  },
  {
    slug: 'calm-living',
    title: 'Calm Living',
    username: 'CalmLivingDaily',
    category: 'Mindful living',
    about: 'Mindfulness, self-care, journals, and small ideas for a calmer life.'
  },
  {
    slug: 'health-research',
    title: 'Health Research Desk',
    username: 'HealthResearchDesk',
    category: 'Health research',
    about: 'Readable summaries of credible public-health and health-research information.'
  },
  {
    slug: 'hindi-mind',
    title: 'मन की बात',
    username: 'ManKiBaatDaily',
    category: 'Hindi mental wellbeing',
    about: 'मानसिक स्वास्थ्य, तनाव और भावनात्मक wellbeing पर सरल, भरोसेमंद जानकारी।'
  },
  {
    slug: 'hindi-health',
    title: 'सेहत साथी',
    username: 'SehatSaathiDaily',
    category: 'Hindi health',
    about: 'स्वास्थ्य, व्यायाम, भोजन और wellness पर सरल, source-linked जानकारी।'
  },
  {
    slug: 'hindi-motivation',
    title: 'प्रेरणा',
    username: 'PrernaDaily',
    category: 'Hindi motivation',
    about: 'रोज़ की प्रेरणा, अच्छी आदतें और personal growth के छोटे विचार।'
  },
  {
    slug: 'bhakti',
    title: 'भक्ति पथ',
    username: 'BhaktiPathDaily',
    category: 'Bhakti',
    about: 'भक्ति, आध्यात्मिक चिंतन और सकारात्मक दैनिक संदेश।'
  },
  {
    slug: 'hindi-career',
    title: 'करियर दिशा',
    username: 'CareerDishaHindi',
    category: 'Hindi career',
    about: 'नौकरी, skills, education और career guidance की उपयोगी जानकारी।'
  }
];

function secret(name: string) {
  return readFileSync(`/etc/${name}`, 'utf8').trim();
}

function normalizedUsername(value: string | undefined) {
  return value?.trim().replace(/^@/, '').toLowerCase();
}

function toBotApiChatId(channelId: string | number | bigint) {
  return `-100${String(channelId)}`;
}

function readState(): ChannelState {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as ChannelState;
}

function writeState(state: ChannelState) {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  chmodSync(STATE_PATH, 0o600);
}

async function hopeHubBotUsername(token: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const body = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };
  if (!response.ok || !body.ok || !body.result?.username) {
    throw new Error(
      `Could not identify HopeHub AI bot: ${body.description || response.statusText}`
    );
  }
  return body.result.username;
}

function canTryAnotherUsername(error: unknown) {
  const detail = [
    error instanceof Error ? error.message : String(error),
    error && typeof error === 'object' && 'errorMessage' in error
      ? String((error as { errorMessage?: unknown }).errorMessage || '')
      : ''
  ].join(' ');
  return /USERNAME_(?:NOT_OCCUPIED|INVALID|OCCUPIED|PURCHASE_AVAILABLE)|username.*(?:not occupied|occupied|purchased|not valid)/i.test(
    detail
  );
}

async function existingOwnedChannel(client: TelegramClient, title: string) {
  const dialogs = await client.getDialogs({ limit: 100 });
  const dialog = dialogs.find(
    (entry) =>
      entry.isChannel &&
      entry.title === title &&
      Boolean((entry.entity as { creator?: boolean })?.creator)
  );
  return dialog?.entity || null;
}

async function assignPublicUsername(client: TelegramClient, channel: unknown, preferred: string) {
  const peer = await client.getInputEntity(channel as never);
  for (const username of [preferred, `${preferred}HQ`, `${preferred}Now`]) {
    try {
      await client.api.channels.updateUsername({ channel: peer, username });
      return username;
    } catch (error) {
      if (!canTryAnotherUsername(error)) throw error;
    }
  }
  throw new Error(`No usable public username was available for @${preferred}.`);
}

async function main() {
  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  const botToken = secret('hopehub-telegram-hopehubbot-token');
  if (!Number.isInteger(apiId) || !apiHash || !session || !botToken) {
    throw new Error('The saved MTProto session or HopeHub AI bot credentials are incomplete.');
  }

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    const owner = await client.getMe();
    if (normalizedUsername(owner.username) !== EXPECTED_OWNER_USERNAME) {
      throw new Error(`MTProto session must belong to @${EXPECTED_OWNER_USERNAME}.`);
    }
    const botUsername = await hopeHubBotUsername(botToken);
    const bot = await client.getInputEntity(`@${botUsername}`);
    const state = readState();

    for (const plan of plans) {
      if (state[plan.slug]) {
        console.log(`SKIP ${plan.slug}: ${state[plan.slug].chatId} already recorded.`);
        continue;
      }

      const existing = await existingOwnedChannel(client, plan.title);
      const channel =
        existing || (await client.createChannel({ title: plan.title, about: plan.about }));
      const username = await assignPublicUsername(client, channel, plan.username);
      await client.editAdmin(channel, bot, {
        postMessages: true,
        editMessages: true,
        deleteMessages: true,
        rank: 'Content publisher'
      });

      state[plan.slug] = {
        id: String(channel.id),
        title: plan.title,
        username,
        chatId: toBotApiChatId(channel.id),
        createdAt: new Date().toISOString()
      };
      writeState(state);
      console.log(`CREATED ${plan.slug}: https://t.me/${username} (${state[plan.slug].chatId})`);
    }
  } finally {
    await client.disconnect();
  }
}

await main();
