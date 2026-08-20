import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import {
  handleTelegramUpdate,
  setTelegramCommands,
  setTelegramWebsiteMenuButton,
  setTelegramWebhook,
  telegramBotKindFromSlug,
  telegramBotStatus,
  telegramWebhookSecret,
  type TelegramUpdate
} from '../services/telegram-bots.js';
import {
  communityBotFromSlug,
  communityBotStatus,
  handleCommunityBotUpdate,
  setupCommunityBot,
  type CommunityTelegramUpdate
} from '../services/telegram-community-bots.js';
import {
  checkTelegramPrivateRateLimit,
  claimCommunityWebhookUpdate,
  completeCommunityWebhookUpdate,
  failCommunityWebhookUpdate
} from '../services/telegram-community-bots.store.js';
import {
  controlBoolean,
  controlNumber,
  getTelegramBotControls
} from '../services/telegram-bot-controls.js';
import { sendTelegramMessage } from '../services/telegram-bots.client.js';
import { sendCommunityMessage } from '../services/telegram-community-bots.client.js';
import { groupHelpBotStatus } from '../services/telegram-group-help.client.js';

export const telegramBotsRouter = Router();

const setupSchema = z.object({
  publicApiUrl: z.string().url().optional(),
  dropPendingUpdates: z.boolean().optional()
});

function assertTelegramSecret(req: import('express').Request) {
  const expected = telegramWebhookSecret();
  const received = req.header('x-telegram-bot-api-secret-token') || '';
  // A webhook without a secret must never be accepted in production. This
  // prevents anyone on the internet from fabricating bot updates if a deploy
  // is missing its secret configuration.
  if (!expected || !received || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function assertTelegramSetupSecret(req: import('express').Request) {
  const expected = process.env.TELEGRAM_SETUP_SECRET || '';
  if (!expected) return false;
  return req.header('x-telegram-setup-secret') === expected;
}

telegramBotsRouter.get('/telegram/bots/health', (_req, res) => {
  res.json({
    bots: [...telegramBotStatus(), ...communityBotStatus(), groupHelpBotStatus()],
    webhookSecretConfigured: Boolean(telegramWebhookSecret())
  });
});

telegramBotsRouter.post(
  '/telegram/webhook/:bot',
  asyncRoute(async (req, res) => {
    if (!assertTelegramSecret(req)) {
      return res.status(401).json({ message: 'Invalid Telegram webhook secret.' });
    }

    const botSlug = routeParam(req, 'bot');
    const kind = telegramBotKindFromSlug(botSlug);
    const communityBot = communityBotFromSlug(botSlug);
    if (!kind && !communityBot) return res.status(404).json({ message: 'Unknown Telegram bot.' });

    const update = req.body as TelegramUpdate & CommunityTelegramUpdate;
    const claimed = await claimCommunityWebhookUpdate(botSlug, update.update_id, update);
    if (!claimed) return res.json({ ok: true, duplicate: true });

    try {
      const incomingMessage = update.message || update.channel_post;
      const chat = incomingMessage?.chat || update.callback_query?.message?.chat;
      if (incomingMessage && chat?.type === 'private') {
        const controls = await getTelegramBotControls();
        if (controlBoolean(controls.telegramProtectionEnabled)) {
          const rate = await checkTelegramPrivateRateLimit({
            bot: botSlug,
            chatId: String(chat.id),
            limit: controlNumber(controls.telegramRateLimitPerMinute, 15),
            blockMinutes: controlNumber(controls.telegramRateLimitBlockMinutes, 5)
          });
          if (!rate.allowed) {
            if (rate.newlyBlocked) {
              const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
              const text = `You are moving a little too quickly. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
              if (kind) {
                await sendTelegramMessage(kind, { chat_id: String(chat.id), text });
              } else {
                await sendCommunityMessage(communityBot!, chat.id, text);
              }
            }
            await completeCommunityWebhookUpdate(botSlug, update.update_id);
            return res.json({ ok: true, rateLimited: true });
          }
        }
      }
      if (kind) await handleTelegramUpdate(kind, update);
      else await handleCommunityBotUpdate(communityBot!, update);
      await completeCommunityWebhookUpdate(botSlug, update.update_id);
      res.json({ ok: true });
    } catch (error) {
      await failCommunityWebhookUpdate(botSlug, update.update_id, error).catch((receiptError) =>
        console.error('[telegram] Could not record failed webhook update.', receiptError)
      );
      console.error(`[telegram] ${botSlug} update ${update.update_id} failed.`, error);
      // Telegram retries every non-2xx response. Acknowledge handled failures so one blocked
      // user or malformed update cannot create a retry storm; diagnostics remain in the database.
      res.json({ ok: true, handled: false });
    }
  })
);

telegramBotsRouter.post(
  '/telegram/bots/:bot/setup',
  asyncRoute(async (req, res) => {
    if (!assertTelegramSetupSecret(req)) {
      return res.status(401).json({ message: 'Telegram setup secret is required.' });
    }

    const botSlug = routeParam(req, 'bot');
    const kind = telegramBotKindFromSlug(botSlug);
    const communityBot = communityBotFromSlug(botSlug);
    if (!kind && !communityBot) return res.status(404).json({ message: 'Unknown Telegram bot.' });

    const body = setupSchema.parse(req.body);
    const publicApiUrl =
      body.publicApiUrl ||
      process.env.API_PUBLIC_URL ||
      process.env.API_URL ||
      SERVER_CONFIG.ORIGINS.WEB;

    const menuButton = kind === 'USER' ? await setTelegramWebsiteMenuButton(kind) : null;
    const webhookResult = kind
      ? await (async () => {
          await setTelegramCommands(kind);
          return setTelegramWebhook({
            kind,
            publicApiUrl,
            dropPendingUpdates: body.dropPendingUpdates
          });
        })()
      : await setupCommunityBot({
          slug: communityBot!,
          publicApiUrl,
          webhookSecret: telegramWebhookSecret(),
          dropPendingUpdates: body.dropPendingUpdates
        });

    res.json({
      ok: true,
      bot: kind || communityBot,
      publicApiUrl,
      menuButton,
      webhookResult
    });
  })
);

telegramBotsRouter.post(
  '/telegram/bots/setup-all',
  asyncRoute(async (req, res) => {
    if (!assertTelegramSetupSecret(req)) {
      return res.status(401).json({ message: 'Telegram setup secret is required.' });
    }

    const body = setupSchema.parse(req.body);
    const publicApiUrl =
      body.publicApiUrl ||
      process.env.API_PUBLIC_URL ||
      process.env.API_URL ||
      SERVER_CONFIG.ORIGINS.WEB;

    const results = [];
    for (const status of telegramBotStatus()) {
      if (!status.configured) {
        results.push({ bot: status.kind, skipped: true, reason: `${status.tokenEnv} missing` });
        continue;
      }

      await setTelegramCommands(status.kind);
      const menuButton =
        status.kind === 'USER' ? await setTelegramWebsiteMenuButton(status.kind) : null;
      const webhookResult = await setTelegramWebhook({
        kind: status.kind,
        publicApiUrl,
        dropPendingUpdates: body.dropPendingUpdates
      });
      results.push({ bot: status.kind, skipped: false, menuButton, webhookResult });
    }
    for (const status of communityBotStatus()) {
      if (!status.configured) {
        results.push({ bot: status.kind, skipped: true, reason: `${status.tokenEnv} missing` });
        continue;
      }
      const webhookResult = await setupCommunityBot({
        slug: status.slug,
        publicApiUrl,
        webhookSecret: telegramWebhookSecret(),
        dropPendingUpdates: body.dropPendingUpdates
      });
      results.push({ bot: status.kind, skipped: false, menuButton: null, webhookResult });
    }

    res.json({ ok: true, publicApiUrl, results });
  })
);
