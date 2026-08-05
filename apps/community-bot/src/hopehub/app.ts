import express from 'express';
import { Bot, GrammyError, HttpError, type Context, webhookCallback } from 'grammy';
import { config } from './config.js';
import {
  commandsText,
  groupStartText,
  linksText,
  mainKeyboard,
  privateStartText,
  reportText,
  rulesText,
  welcomeText
} from './messages.js';

const bot = new Bot(config.token);
const webhookPath = '/telegram/community/webhook';
const messageBursts = new Map<string, number[]>();

function displayName(user: NonNullable<Context['from']>) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'friend';
}

function isPrivate(ctx: Context) {
  return ctx.chat?.type === 'private';
}

function isGroup(ctx: Context) {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

async function isAdmin(ctx: Context) {
  const from = ctx.from;
  if (!from || !ctx.chat) return false;
  if (config.adminUserIds.includes(String(from.id))) return true;
  if (!isGroup(ctx)) return false;

  try {
    const member = await ctx.getChatMember(from.id);
    return member.status === 'creator' || member.status === 'administrator';
  } catch {
    return false;
  }
}

async function requireAdmin(ctx: Context) {
  if (await isAdmin(ctx)) return true;
  await ctx.reply('Admin-only command.');
  return false;
}

function containsLink(ctx: Context) {
  const text = ctx.message?.text || ctx.message?.caption || '';
  return /(https?:\/\/|t\.me\/|telegram\.me\/|www\.)/i.test(text);
}

function isTooFast(ctx: Context) {
  if (!ctx.chat || !ctx.from) return false;
  const key = `${ctx.chat.id}:${ctx.from.id}`;
  const now = Date.now();
  const recent = (messageBursts.get(key) || []).filter((time) => now - time < 10_000);
  recent.push(now);
  messageBursts.set(key, recent);
  return recent.length > 6;
}

async function safeDelete(ctx: Context) {
  try {
    await ctx.deleteMessage();
  } catch {
    // Bot may not be admin or may not have delete permission. Ignore safely.
  }
}

bot.api.setMyCommands([
  { command: 'start', description: 'Show community bot intro' },
  { command: 'help', description: 'Show commands' },
  { command: 'rules', description: 'Show group rules' },
  { command: 'links', description: 'Official Hope Hub links' },
  { command: 'report', description: 'Reply to report a message' },
  { command: 'clean', description: 'Admin: delete replied message' },
  { command: 'pinrules', description: 'Admin: send and pin rules' }
]);

bot.command(['start', 'help'], async (ctx) => {
  await ctx.reply(isPrivate(ctx) ? privateStartText() : groupStartText(), {
    parse_mode: 'HTML',
    reply_markup: mainKeyboard()
  });
});

bot.command('rules', async (ctx) => {
  await ctx.reply(rulesText(), { parse_mode: 'HTML', reply_markup: mainKeyboard() });
});

bot.command('links', async (ctx) => {
  await ctx.reply(linksText(), { parse_mode: 'HTML', reply_markup: mainKeyboard() });
});

bot.command('report', async (ctx) => {
  if (!isGroup(ctx)) {
    await ctx.reply(
      'Use /report inside a group as a reply to the message you want admins to review.'
    );
    return;
  }
  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Reply to a message with /report so admins know what to review.');
    return;
  }
  await ctx.reply(reportText(ctx.from ? displayName(ctx.from) : 'A member'), {
    reply_parameters: { message_id: ctx.message.reply_to_message.message_id }
  });
});

bot.command('clean', async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = ctx.message?.reply_to_message;
  if (!target) {
    await ctx.reply('Reply to the message you want deleted, then send /clean.');
    return;
  }

  try {
    await ctx.api.deleteMessage(ctx.chat!.id, target.message_id);
    await safeDelete(ctx);
  } catch {
    await ctx.reply('I could not delete that message. Make me admin with delete permission.');
  }
});

bot.command('pinrules', async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const message = await ctx.reply(rulesText(), {
    parse_mode: 'HTML',
    reply_markup: mainKeyboard()
  });
  try {
    await ctx.api.pinChatMessage(ctx.chat!.id, message.message_id, {
      disable_notification: true
    });
  } catch {
    await ctx.reply('Rules sent, but I could not pin them. Make me admin with pin permission.');
  }
});

bot.on('message:new_chat_members', async (ctx) => {
  const names =
    ctx.message.new_chat_members
      ?.filter((member) => !member.is_bot)
      .map((member) => displayName(member)) ?? [];

  if (!names.length) return;

  await ctx.reply(welcomeText(names), {
    parse_mode: 'HTML',
    reply_markup: mainKeyboard()
  });
});

bot.on('message', async (ctx, next) => {
  if (!isGroup(ctx) || !ctx.from || (await isAdmin(ctx))) {
    await next();
    return;
  }

  if (isTooFast(ctx)) {
    await safeDelete(ctx);
    return;
  }

  if (config.blockLinks && containsLink(ctx)) {
    await safeDelete(ctx);
    await ctx.reply(
      'Links are restricted in this group. Please use /links for official Hope Hub links.'
    );
    return;
  }

  await next();
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Community bot error while handling update ${ctx.update.update_id}:`);
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
      console.log(`Hope Hub Community Bot polling as @${botInfo.username}`);
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
  app.get('/health', (_req, res) => res.json({ ok: true, bot: 'hopehub-community-bot' }));
  app.post(
    webhookPath,
    webhookCallback(bot, 'express', {
      secretToken: config.webhookSecret || undefined
    })
  );

  app.listen(config.port, () => {
    console.log(`Hope Hub Community Bot webhook listening on :${config.port}`);
    console.log(`Webhook URL: ${webhookUrl}`);
  });
}

if (config.mode === 'webhook') {
  await startWebhook();
} else {
  await startPolling();
}
