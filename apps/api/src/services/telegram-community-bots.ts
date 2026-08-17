import { handleConfessionBotUpdate } from './telegram-confession-bot.js';
import { handleContactBotUpdate } from './telegram-contact-bot.js';
import { handleRulesBotUpdate } from './telegram-rules-bot.js';
import { handleHopeHubAiBotUpdate } from './telegram-hopehub-ai-bot.js';
import type { CommunityBotSlug, CommunityTelegramUpdate } from './telegram-community-bots.types.js';
import { COMMUNITY_BOT_SLUGS } from '../constants/telegram-community-bot.constants.js';

export {
  communityBotFromSlug,
  communityBotStatus,
  getCommunityWebhookInfo,
  setupCommunityBot
} from './telegram-community-bots.client.js';

export function handleCommunityBotUpdate(slug: CommunityBotSlug, update: CommunityTelegramUpdate) {
  if (slug === COMMUNITY_BOT_SLUGS.CONTACT) return handleContactBotUpdate(update);
  if (slug === COMMUNITY_BOT_SLUGS.CONFESSION) return handleConfessionBotUpdate(update);
  if (slug === COMMUNITY_BOT_SLUGS.GROUP_HELP) return handleHopeHubAiBotUpdate(update);
  return handleRulesBotUpdate(update);
}

export type { CommunityBotSlug, CommunityTelegramUpdate } from './telegram-community-bots.types.js';
