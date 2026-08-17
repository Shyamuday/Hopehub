import { TelegramBotKind } from '@prisma/client';
import {
  botNameByKind,
  botSlugByKind,
  botTokenEnvByKind,
  commandMenus
} from './telegram-bots.config.js';
import { apiUrl, webUrl } from './telegram-bots.ui.js';
import type { SendMessagePayload } from './telegram-bots.types.js';
import { colorizeTelegramKeyboard, colorizeTelegramPayload } from './telegram-button-styles.js';

export function telegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || '';
}

export function telegramBotToken(kind: TelegramBotKind) {
  return process.env[botTokenEnvByKind[kind]] || '';
}

function getBotTokenOrThrow(kind: TelegramBotKind) {
  const token = telegramBotToken(kind).trim();
  if (!token) throw new Error(`${botTokenEnvByKind[kind]} is not configured.`);
  return token;
}

async function callTelegramApi<T>(kind: TelegramBotKind, method: string, payload: unknown) {
  const token = getBotTokenOrThrow(kind);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colorizeTelegramPayload(payload))
    });
    const body = (await response.json()) as {
      ok?: boolean;
      description?: string;
      result?: T;
      parameters?: { retry_after?: number };
    };
    if (response.ok && body.ok) return body.result as T;

    const retryAfterSeconds = body.parameters?.retry_after;
    if (response.status === 429 && retryAfterSeconds && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, (retryAfterSeconds + 1) * 1000));
      continue;
    }
    throw new Error(body.description || `Telegram ${method} failed.`);
  }
  throw new Error(`Telegram ${method} could not be completed.`);
}

export function sendTelegramMessage(kind: TelegramBotKind, payload: SendMessagePayload) {
  return callTelegramApi(kind, 'sendMessage', {
    ...payload,
    reply_markup: payload.reply_markup ? colorizeTelegramKeyboard(payload.reply_markup) : undefined
  });
}

export function answerTelegramCallback(
  kind: TelegramBotKind,
  callbackQueryId: string,
  text?: string
) {
  return callTelegramApi(kind, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

export async function setTelegramWebhook(input: {
  kind: TelegramBotKind;
  publicApiUrl?: string;
  dropPendingUpdates?: boolean;
}) {
  const slug = botSlugByKind[input.kind];
  const secret = telegramWebhookSecret();
  return callTelegramApi(input.kind, 'setWebhook', {
    url: `${input.publicApiUrl || apiUrl()}/telegram/webhook/${slug}`,
    secret_token: secret || undefined,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: Boolean(input.dropPendingUpdates)
  });
}

export async function setTelegramCommands(kind: TelegramBotKind) {
  return callTelegramApi(kind, 'setMyCommands', {
    commands: commandMenus[kind]
  });
}

export async function setTelegramWebsiteMenuButton(kind: TelegramBotKind) {
  return callTelegramApi(kind, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Open Hope Hub',
      web_app: { url: webUrl('/') }
    }
  });
}

export function getTelegramWebhookInfo(kind: TelegramBotKind) {
  return callTelegramApi(kind, 'getWebhookInfo', {});
}

export function telegramBotStatus() {
  return Object.values(TelegramBotKind).map((kind) => ({
    kind,
    slug: botSlugByKind[kind],
    name: botNameByKind[kind],
    configured: Boolean(process.env[botTokenEnvByKind[kind]]),
    tokenEnv: botTokenEnvByKind[kind]
  }));
}
