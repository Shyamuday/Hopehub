export type BotConfig = {
  token: string;
  mode: 'polling' | 'webhook';
  port: number;
  webhookBaseUrl: string;
  webhookSecret: string;
  webBotUrl: string;
  websiteUrl: string;
  logoUrl: string;
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

export function loadConfig(): BotConfig {
  const token = env('TELEGRAM_COMMUNITY_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN');
  if (!token) {
    throw new Error(
      'TELEGRAM_COMMUNITY_BOT_TOKEN is required. Use the @Hopehubbot token for this welcome bot.'
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
    webBotUrl: env('HOPEHUB_WEB_BOT_URL', 'https://t.me/Hopehubwebbot'),
    websiteUrl: env('HOPEHUB_WEBSITE_URL', 'https://hopehub.in'),
    logoUrl: env(
      'HOPEHUB_LOGO_URL',
      'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/brand/hopehublogom.jpg'
    ),
    welcomeMessage: env(
      'COMMUNITY_BOT_WELCOME',
      'Welcome to HopeHub, India’s best emotional support and peer-support group! 🌟\nWe’re thrilled to have you in this one-of-a-kind community where we uplift, listen, and support each other. 😊\n\nThis is a safe space to share, listen, experience growth and progress, and connect with people who care. Feel free to introduce yourself, ask for support, or simply browse the conversations at your own pace. 💚\n\nRemember, we’re all in this together — with kindness, respect, and hope.'
    ),
    rules: envLines('COMMUNITY_BOT_RULES', [
      'Protect the vibe. Speak with kindness, dignity, and patience — no judging, shaming, bullying, or personal attacks.',
      'Protect privacy. Do not post private documents, medical records, payment screenshots, phone numbers, or anyone’s personal details.',
      'Share support, not diagnosis. You may share experiences, but avoid labelling, prescribing, or giving unsafe advice.',
      'Keep the group clean. No spam, promotions, repeated forwards, unrelated links, or aggressive selling.',
      'Use private support for personal help. For booking, tests, payments, volunteer support, or account help, tap the Hope Hub Bot button.',
      'Emergency note: Hope Hub is not an emergency service. If there is immediate danger, self-harm risk, violence, or a medical emergency, contact local emergency services now.'
    ])
  };
}

export const config = loadConfig();
