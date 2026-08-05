import express from 'express';
import { Bot, GrammyError, HttpError, type Context, webhookCallback } from 'grammy';
import { config } from './config.js';
import { replyWithHopeHubLogo, startText, welcomeText } from './messages.js';

const bot = new Bot(config.token);
const webhookPath = '/telegram/community/webhook';

function displayName(user: NonNullable<Context['from']>) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'friend';
}

bot.api.setMyCommands([
  { command: 'start', description: 'Open Hope Hub bot link' },
  { command: 'help', description: 'Open Hope Hub bot link' }
]);

bot.command(['start', 'help'], async (ctx) => {
  await replyWithHopeHubLogo(ctx, startText());
});

bot.on('message:new_chat_members', async (ctx) => {
  const names =
    ctx.message.new_chat_members
      ?.filter((member) => !member.is_bot)
      .map((member) => displayName(member)) ?? [];

  if (!names.length) return;

  await replyWithHopeHubLogo(ctx, welcomeText(names));
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Hope Hub welcome bot error while handling update ${ctx.update.update_id}:`);
  if (err.error instanceof GrammyError) {
    console.error('Telegram API error:', err.error.description);
  } else if (err.error instanceof HttpError) {
    console.error('Telegram network error:', err.error);
  } else {
    console.error(err.error);
  }
});

async function startPolling() {
  await bot.start({
    drop_pending_updates: true,
    onStart: (botInfo) => {
      console.log(`Hope Hub welcome bot polling as @${botInfo.username}`);
    }
  });
}

async function startWebhook() {
  if (!config.webhookBaseUrl) {
    throw new Error('COMMUNITY_BOT_WEBHOOK_BASE_URL is required in webhook mode.');
  }

  const webhookUrl = `${config.webhookBaseUrl.replace(/\/$/, '')}${webhookPath}`;
  await bot.api.setWebhook(webhookUrl, {
    secret_token: config.webhookSecret || undefined,
    allowed_updates: ['message']
  });

  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true, bot: 'hopehub-welcome-bot' }));
  app.post(
    webhookPath,
    webhookCallback(bot, 'express', {
      secretToken: config.webhookSecret || undefined
    })
  );

  app.listen(config.port, () => {
    console.log(`Hope Hub welcome bot webhook listening on :${config.port}`);
    console.log(`Webhook URL: ${webhookUrl}`);
  });
}

if (config.mode === 'webhook') {
  await startWebhook();
} else {
  await startPolling();
}
