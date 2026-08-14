import { handleConfessionBotUpdate } from './telegram-confession-bot.js';
import { handleContactBotUpdate } from './telegram-contact-bot.js';
import { handleRulesBotUpdate } from './telegram-rules-bot.js';
import type { CommunityBotSlug, CommunityTelegramUpdate } from './telegram-community-bots.types.js';

export {
  communityBotFromSlug,
  communityBotStatus,
  getCommunityWebhookInfo,
  setupCommunityBot
} from './telegram-community-bots.client.js';

export function handleCommunityBotUpdate(slug: CommunityBotSlug, update: CommunityTelegramUpdate) {
  if (slug === 'contact') return handleContactBotUpdate(update);
  if (slug === 'confession') return handleConfessionBotUpdate(update);
  return handleRulesBotUpdate(update);
}

export type { CommunityBotSlug, CommunityTelegramUpdate } from './telegram-community-bots.types.js';
