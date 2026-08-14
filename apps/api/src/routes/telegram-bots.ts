import { Router } from 'express';
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
import { groupHelpBotStatus } from '../services/telegram-group-help.client.js';

export const telegramBotsRouter = Router();

const setupSchema = z.object({
  publicApiUrl: z.string().url().optional(),
  dropPendingUpdates: z.boolean().optional()
});

function assertTelegramSecret(req: import('express').Request) {
  const expected = telegramWebhookSecret();
  if (!expected) return true;
  return req.header('x-telegram-bot-api-secret-token') === expected;
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

    if (kind) await handleTelegramUpdate(kind, req.body as TelegramUpdate);
    else await handleCommunityBotUpdate(communityBot!, req.body as CommunityTelegramUpdate);
    res.json({ ok: true });
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
