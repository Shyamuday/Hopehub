/**
 * Stable internal identity for the bot that owns the Hope Hub community.
 *
 * This is a service slug, not a Telegram username. To replace the actual bot,
 * update its token and the editable `telegramGroupHelpBotUsername` setting,
 * then run the normal bot setup. Campaigns and moderation keep working.
 */
export const GROUP_HELP_BOT_SLUG = 'hopehubai' as const;
export const GROUP_HELP_BOT_DISPLAY_NAME = 'HopeHubAI';
