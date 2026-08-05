export type BotConfig = {
  token: string;
  mode: 'polling' | 'webhook';
  port: number;
  webhookBaseUrl: string;
  webhookSecret: string;
  logoUrl: string;
  websiteUrl: string;
  servicesUrl: string;
  assessmentsUrl: string;
  packagesUrl: string;
  careersUrl: string;
  feedbackUrl: string;
  userBotUrl: string;
  providerBotUrl: string;
  whatsappUrl: string;
  telegramCommunityUrl: string;
  supportEmail: string;
  adminUserIds: string[];
  blockLinks: boolean;
  welcomeMessage: string;
  rules: string[];
};

function env(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function envLines(name: string, fallback: string[]) {
  const value = env(name);
  if (!value) return fallback;
  return value
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function envCsv(name: string) {
  return env(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const websiteUrl = env('HOPEHUB_WEBSITE_URL', 'https://hopehub.in').replace(/\/$/, '');
const logoUrl = env(
  'HOPEHUB_LOGO_URL',
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/brand/hopehublogom.jpg'
);
const userBotUrl = env('HOPEHUB_USER_BOT_URL', 'https://t.me/Hopehubbot');
const providerBotUrl = env('HOPEHUB_PROVIDER_BOT_URL', 'https://t.me/Hopehubprovidersbot');
const whatsappUrl = env('HOPEHUB_WHATSAPP_URL');
const telegramCommunityUrl = env('HOPEHUB_TELEGRAM_COMMUNITY_URL', 'https://t.me/hopehubindia');

export function loadConfig(): BotConfig {
  const token = env('TELEGRAM_COMMUNITY_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN');
  if (!token) {
    throw new Error(
      'TELEGRAM_COMMUNITY_BOT_TOKEN is required. Create a bot with BotFather and set the token.'
    );
  }

  const webhookBaseUrl = env('COMMUNITY_BOT_WEBHOOK_BASE_URL');
  const mode =
    env('COMMUNITY_BOT_MODE', webhookBaseUrl ? 'webhook' : 'polling').toLowerCase() === 'webhook'
      ? 'webhook'
      : 'polling';

  return {
    token,
    mode,
    port: Number(env('PORT', '3104')),
    webhookBaseUrl,
    webhookSecret: env('TELEGRAM_COMMUNITY_WEBHOOK_SECRET'),
    logoUrl,
    websiteUrl,
    servicesUrl: env('HOPEHUB_SERVICES_URL', `${websiteUrl}/services`),
    assessmentsUrl: env('HOPEHUB_ASSESSMENTS_URL', `${websiteUrl}/assessments`),
    packagesUrl: env('HOPEHUB_PACKAGES_URL', `${websiteUrl}/packages`),
    careersUrl: env('HOPEHUB_CAREERS_URL', `${websiteUrl}/careers`),
    feedbackUrl: env('HOPEHUB_FEEDBACK_URL', `${websiteUrl}/feedback`),
    userBotUrl,
    providerBotUrl,
    whatsappUrl,
    telegramCommunityUrl,
    supportEmail: env('HOPEHUB_SUPPORT_EMAIL', 'support@hopehub.in'),
    adminUserIds: envCsv('COMMUNITY_BOT_ADMIN_USER_IDS'),
    blockLinks: env('COMMUNITY_BOT_BLOCK_LINKS', 'false').toLowerCase() === 'true',
    welcomeMessage: env(
      'COMMUNITY_BOT_WELCOME',
      'Welcome to Hope Hub India 💙\nA privacy-aware mental wellness community for emotional support, self-checks, guided exercises, and bookable care sessions.\n\nPlease keep private details out of the group. Use our private bot or website when you need personal help.'
    ),
    rules: envLines('COMMUNITY_BOT_RULES', [
      'Be warm and respectful. No shaming, judging, bullying, or personal attacks.',
      'Protect privacy. Do not post medical records, prescriptions, payment screenshots, IDs, phone numbers, or another person’s private details.',
      'Hope Hub is supportive care, not emergency care. If there is immediate danger, self-harm risk, violence, or a medical emergency, contact local emergency services now.',
      'No spam, promotions, repeated forwards, affiliate links, or unrelated selling.',
      'For personal concerns, booking, payment help, assessments, or volunteer support, use the Hope Hub Care Bot or website instead of sharing sensitive details in group.'
    ])
  };
}

export const config = loadConfig();
