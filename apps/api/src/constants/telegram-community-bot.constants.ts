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
  GROUP_HELP: 'hopehubai',
  TOXIC_MOVIE: 'toxic-movie'
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
  GROUP_HELP: 'Hope Hub AI Community Bot',
  TOXIC_MOVIE: 'Toxic Movie Updates | Yash — Unofficial'
} as const;

export const TELEGRAM_BOT_USERNAMES = {
  CONTACT: '@Contacthopehubbot',
  CONFESSION: '@Hopehubconfessionbot',
  RULES: '@HHrules',
  GROUP_HELP: '@Hopehubbot',
  WEB: '@Hopehubwebbot',
  TOXIC_MOVIE: '@ToxicYashUpdatesBot'
} as const;

export const TELEGRAM_BOT_URLS = Object.fromEntries(
  Object.entries(TELEGRAM_BOT_USERNAMES).map(([key, username]) => [
    key,
    `https://t.me/${username.slice(1)}`
  ])
) as { [K in keyof typeof TELEGRAM_BOT_USERNAMES]: string };

export const GROUP_HELP_BOT_SLUG = COMMUNITY_BOT_SLUGS.GROUP_HELP;
export const GROUP_HELP_BOT_DISPLAY_NAME = 'Hope Hub community bot';

/**
 * Trusted private-staff identities that receive full bot powers when first detected.
 * Values are normalized without @. The historical spelling is retained because it
 * is the username previously used by the Mind Craft account.
 */
export const GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAMES = [
  'spiritualspirit',
  'spiritualspirirt'
] as const;

/** Matches the requested Stoic staff identity when its complete username changes. */
export const GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAME_MARKERS = ['stoic'] as const;

export function isGroupHelpAutomaticFullAdminUsername(username: string | undefined) {
  const normalized = username?.trim().replace(/^@/, '').toLowerCase() || '';
  return (
    GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAMES.some((candidate) => candidate === normalized) ||
    GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAME_MARKERS.some((marker) => normalized.includes(marker))
  );
}
