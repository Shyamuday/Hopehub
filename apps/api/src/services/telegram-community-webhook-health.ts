import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { apiUrl } from './telegram-bots.ui.js';
import { notifyTelegramBotFailure } from './telegram-bot-failure-alerts.js';
import { telegramWebhookSecret } from './telegram-bots.client.js';
import {
  communityBotToken,
  getCommunityWebhookInfo,
  setupCommunityBot
} from './telegram-community-bots.client.js';

const PENDING_UPDATES_ALERT_THRESHOLD = 25;

type TelegramWebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
};

/**
 * Telegram does not send a webhook update when its configured secret is stale:
 * it only records a 401 in getWebhookInfo. Check that external state regularly
 * so a deployment or token rotation cannot silently disable welcomes/moderation.
 */
export async function monitorHopeHubCommunityWebhook() {
  if (!communityBotToken(GROUP_HELP_BOT_SLUG)) return { checked: false, repaired: false };

  try {
    const info = (await getCommunityWebhookInfo(GROUP_HELP_BOT_SLUG)) as TelegramWebhookInfo;
    const expectedUrl = apiUrl(`/telegram/webhook/${GROUP_HELP_BOT_SLUG}`);
    const actualUrl = info.url?.trim() || '';
    const telegramError = info.last_error_message?.trim() || '';
    const pending = Math.max(0, Number(info.pending_update_count) || 0);
    const wrongTarget = actualUrl !== expectedUrl;
    const secretRejected = /401|unauthorized|secret/i.test(telegramError);

    if (wrongTarget || secretRejected) {
      await setupCommunityBot({
        slug: GROUP_HELP_BOT_SLUG,
        publicApiUrl: apiUrl(),
        webhookSecret: telegramWebhookSecret(),
        dropPendingUpdates: false
      });
      await notifyTelegramBotFailure({
        bot: GROUP_HELP_BOT_SLUG,
        area: 'webhook monitor — automatically repaired',
        error: new Error(
          wrongTarget
            ? `Webhook target was ${actualUrl || 'missing'}; restored ${expectedUrl}.`
            : `Telegram rejected the webhook (${telegramError}); refreshed its secret.`
        )
      });
      return { checked: true, repaired: true };
    }

    if (telegramError || pending >= PENDING_UPDATES_ALERT_THRESHOLD) {
      await notifyTelegramBotFailure({
        bot: GROUP_HELP_BOT_SLUG,
        area: 'webhook health monitor',
        error: new Error(
          telegramError || `${pending} Telegram webhook updates are waiting to be processed.`
        )
      });
    }
    return { checked: true, repaired: false, pending, telegramError: telegramError || null };
  } catch (error) {
    await notifyTelegramBotFailure({
      bot: GROUP_HELP_BOT_SLUG,
      area: 'webhook health monitor failed',
      error
    });
    throw error;
  }
}
