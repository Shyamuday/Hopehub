/**
 * Stable internal identity for the bot that owns the Hope Hub community.
 *
 * This is a service slug, not a Telegram username. To replace the actual bot,
 * update its token and the editable `telegramGroupHelpBotUsername` setting,
 * then run the normal bot setup. Campaigns and moderation keep working.
 */
export const COMMUNITY_BOT_SLUGS = {
  CONTACT: 'contact',
  CONFESSION: 'confession',
  RULES: 'rules',
  GROUP_HELP: 'hopehubai'
} as const;

export type CommunityBotSlug = (typeof COMMUNITY_BOT_SLUGS)[keyof typeof COMMUNITY_BOT_SLUGS];

export const COMMUNITY_SUBMISSION_BOT_SLUGS = [
  COMMUNITY_BOT_SLUGS.CONTACT,
  COMMUNITY_BOT_SLUGS.CONFESSION
] as const;
export type CommunitySubmissionBotSlug = (typeof COMMUNITY_SUBMISSION_BOT_SLUGS)[number];

export const TELEGRAM_BOT_DISPLAY_NAMES = {
  CONTACT: 'Hope Hub Contact Bot',
  CONFESSION: 'Hope Hub Confession Bot',
  RULES: 'Hope Hub Rules Bot',
  GROUP_HELP: 'Hope Hub AI Community Bot'
} as const;

export const TELEGRAM_BOT_USERNAMES = {
  CONTACT: '@Contacthopehubbot',
  CONFESSION: '@Hopehubconfessionbot',
  RULES: '@HHrules',
  GROUP_HELP: '@Hopehubaibot',
  HOPE_HUB: '@Hopehubbot'
} as const;

export const TELEGRAM_BOT_URLS = Object.fromEntries(
  Object.entries(TELEGRAM_BOT_USERNAMES).map(([key, username]) => [
    key,
    `https://t.me/${username.slice(1)}`
  ])
) as { [K in keyof typeof TELEGRAM_BOT_USERNAMES]: string };

export const GROUP_HELP_BOT_SLUG = COMMUNITY_BOT_SLUGS.GROUP_HELP;
export const GROUP_HELP_BOT_DISPLAY_NAME = 'HopeHubAI';
