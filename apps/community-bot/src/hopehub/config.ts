export type BotConfig = {
  token: string;
  mode: 'polling' | 'webhook';
  port: number;
  webhookBaseUrl: string;
  webhookSecret: string;
  webBotUrl: string;
  welcomeMessage: string;
};

function env(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
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
    welcomeMessage: env(
      'COMMUNITY_BOT_WELCOME',
      'Welcome to Hope Hub India 💙\nThis group is for Hope Hub community updates and gentle support. Please avoid sharing private documents or sensitive personal details here.'
    )
  };
}

export const config = loadConfig();
