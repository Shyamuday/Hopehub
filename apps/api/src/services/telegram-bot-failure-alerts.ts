import { TelegramBotKind } from '@prisma/client';
import { escapeHtml } from './telegram-bots.helpers.js';
import { sendTelegramMessage } from './telegram-bots.client.js';

const ALERT_COOLDOWN_MS = 15 * 60_000;
const recentAlerts = new Map<string, number>();

function errorDetail(error: unknown) {
  const value = error instanceof Error ? error.message : String(error);
  return value.replace(/\s+/g, ' ').trim().slice(0, 900) || 'Unknown error';
}

function configuredRecipients() {
  return [
    ...new Set(
      (process.env.TELEGRAM_ADMIN_ALERT_CHAT_IDS || '')
        .split(/[\s,;]+/)
        .map((value) => value.trim())
        .filter((value) => /^-?\d+$/.test(value))
    )
  ];
}

function canSendAlert(key: string, now = Date.now()) {
  for (const [candidate, sentAt] of recentAlerts) {
    if (now - sentAt >= ALERT_COOLDOWN_MS) recentAlerts.delete(candidate);
  }
  const sentAt = recentAlerts.get(key);
  if (sentAt && now - sentAt < ALERT_COOLDOWN_MS) return false;
  recentAlerts.set(key, now);
  return true;
}

/**
 * Sends a bounded, non-sensitive operational alert to the private admin bot.
 * Never throw from this helper: an alert failure must not create a Telegram
 * webhook retry storm or hide the original bot error.
 */
export async function notifyTelegramBotFailure(input: {
  bot: string;
  area: string;
  error: unknown;
  updateId?: number | string | null;
  chatId?: number | string | null;
}) {
  const recipients = configuredRecipients();
  if (!recipients.length) return false;

  const detail = errorDetail(input.error);
  const fingerprint = [input.bot, input.area, detail].join('|');
  if (!canSendAlert(fingerprint)) return false;

  const body = [
    '<b>Hope Hub bot needs attention</b>',
    `Bot: <code>${escapeHtml(input.bot)}</code>`,
    `Area: ${escapeHtml(input.area)}`,
    input.chatId == null ? '' : `Chat: <code>${escapeHtml(String(input.chatId))}</code>`,
    input.updateId == null ? '' : `Update: <code>${escapeHtml(String(input.updateId))}</code>`,
    '',
    `<b>Reason:</b> ${escapeHtml(detail)}`,
    '',
    'The error is recorded in the API logs and webhook receipts. Repeated identical alerts are grouped for 15 minutes.'
  ]
    .filter(Boolean)
    .join('\n');

  const deliveries = await Promise.allSettled(
    recipients.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: chatId,
        text: body,
        parse_mode: 'HTML'
      })
    )
  );
  const delivered = deliveries.some((delivery) => delivery.status === 'fulfilled');
  if (!delivered) {
    console.error('[telegram-alert] Could not deliver bot failure alert.', {
      bot: input.bot,
      area: input.area,
      failures: deliveries.length
    });
  }
  return delivered;
}
