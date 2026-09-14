import type { CommunityBotSlug, TelegramKeyboard } from './telegram-community-bots.types.js';
import { colorizeTelegramKeyboard, colorizeTelegramPayload } from './telegram-button-styles.js';
import { callTelegramBotApi } from './telegram-api-request.js';
import {
  COMMUNITY_BOT_SLUGS,
  TELEGRAM_BOT_DISPLAY_NAMES
} from '../constants/telegram-community-bot.constants.js';

const COMMUNITY_BOTS: Record<
  CommunityBotSlug,
  {
    name: string;
    tokenEnv: string;
    commands: Array<{ command: string; description: string }>;
    allowedUpdates: string[];
    description?: string;
    shortDescription?: string;
  }
> = {
  [COMMUNITY_BOT_SLUGS.CONTACT]: {
    name: TELEGRAM_BOT_DISPLAY_NAMES.CONTACT,
    tokenEnv: 'TELEGRAM_CONTACT_BOT_TOKEN',
    commands: [
      { command: 'start', description: 'Contact Hope Hub' },
      { command: 'status', description: 'Check your latest message' },
      { command: 'cancel', description: 'Cancel current message' },
      { command: 'help', description: 'Contact bot help' },
      { command: 'setsupport', description: 'Connect a private support group (admins)' },
      { command: 'ban', description: 'Ban a ticket sender (support admins)' },
      { command: 'kick', description: 'Remove a ticket sender (support admins)' },
      { command: 'mute', description: 'Mute a ticket sender (support admins)' },
      { command: 'unban', description: 'Unban a ticket sender (support admins)' },
      { command: 'unmute', description: 'Unmute a ticket sender (support admins)' }
    ],
    allowedUpdates: ['message', 'callback_query', 'my_chat_member']
  },
  [COMMUNITY_BOT_SLUGS.CONFESSION]: {
    name: TELEGRAM_BOT_DISPLAY_NAMES.CONFESSION,
    tokenEnv: 'TELEGRAM_CONFESSION_BOT_TOKEN',
    commands: [
      { command: 'start', description: 'Send an anonymous confession' },
      { command: 'cancel', description: 'Cancel current confession' },
      { command: 'help', description: 'Confession bot help' }
    ],
    allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_member', 'channel_post']
  },
  [COMMUNITY_BOT_SLUGS.RULES]: {
    name: TELEGRAM_BOT_DISPLAY_NAMES.RULES,
    tokenEnv: 'TELEGRAM_RULES_BOT_TOKEN',
    commands: [
      { command: 'start', description: 'Open rules menu' },
      { command: 'rules', description: 'Community rules' },
      { command: 'about', description: 'About Hope Hub' },
      { command: 'disclaimer', description: 'Community disclaimer' },
      { command: 'privacy', description: 'Privacy guide' },
      { command: 'report', description: 'How to report' },
      { command: 'helpline', description: 'Mental health helplines' },
      { command: 'help', description: 'Rules bot help' }
    ],
    allowedUpdates: [
      'message',
      'callback_query',
      'poll',
      'poll_answer',
      'message_reaction',
      'my_chat_member'
    ]
  },
  [COMMUNITY_BOT_SLUGS.GROUP_HELP]: {
    name: TELEGRAM_BOT_DISPLAY_NAMES.GROUP_HELP,
    tokenEnv: 'TELEGRAM_HOPEHUBBOT_TOKEN',
    commands: [
      { command: 'id', description: 'Show your ID or replied member ID' },
      { command: 'staffid', description: 'Look up staff member ID by username' },
      { command: 'rules', description: 'Community rules' },
      { command: 'support', description: 'Private Hope Hub support' },
      { command: 'warn', description: 'Warn replied member (staff)' },
      { command: 'dwarn', description: 'Delete replied message and warn' },
      { command: 'swarn', description: 'Silently warn a member' },
      { command: 'unwarn', description: 'Remove latest warning (staff)' },
      { command: 'rmwarn', description: 'Remove latest warning (staff)' },
      { command: 'del', description: 'Delete replied message (staff)' },
      { command: 'mute', description: 'Mute replied member (moderators)' },
      { command: 'tmute', description: 'Temporarily mute a member (moderators)' },
      { command: 'dmute', description: 'Delete replied message and mute' },
      { command: 'smute', description: 'Silently mute a member' },
      { command: 'unmute', description: 'Unmute replied member (moderators)' },
      { command: 'ro', description: 'Set replied member read-only (moderators)' },
      { command: 'unro', description: 'Remove read-only (moderators)' },
      { command: 'ban', description: 'Ban replied member (moderators)' },
      { command: 'tban', description: 'Temporarily ban a member' },
      { command: 'dban', description: 'Delete replied message and ban' },
      { command: 'sban', description: 'Silently ban a member' },
      { command: 'unban', description: 'Unban replied member (moderators)' },
      { command: 'kick', description: 'Kick replied member (moderators)' },
      { command: 'dkick', description: 'Delete replied message and kick' },
      { command: 'skick', description: 'Silently kick a member' },
      { command: 'delwarn', description: 'Delete message and warn (staff)' },
      { command: 'delmute', description: 'Delete message and mute (moderators)' },
      { command: 'delban', description: 'Delete message and ban (moderators)' },
      { command: 'delkick', description: 'Delete message and kick (moderators)' },
      { command: 'clearwarnings', description: 'Clear replied member warnings (moderators)' },
      { command: 'resetwarn', description: 'Clear all member warnings (moderators)' },
      { command: 'adminlist', description: 'List group admins (staff)' },
      { command: 'staff', description: 'Show community staff (staff)' },
      { command: 'info', description: 'Show replied member details (staff)' },
      { command: 'history', description: 'Show member name history (staff)' },
      { command: 'perms', description: 'Show member bot permissions (staff)' },
      { command: 'geturl', description: 'Get link to replied message (staff)' },
      { command: 'stats', description: 'Group activity snapshot (moderators)' },
      { command: 'admin', description: 'Promote replied member to admin (admins)' },
      { command: 'unadmin', description: 'Demote replied admin (admins)' },
      { command: 'title', description: 'Set admin title (admins)' },
      { command: 'untitle', description: 'Remove admin title (admins)' },
      { command: 'helper', description: 'Assign helper role (admins)' },
      { command: 'unhelper', description: 'Remove helper role (admins)' },
      { command: 'mod', description: 'Assign moderator role (admins)' },
      { command: 'unmod', description: 'Remove moderator role (admins)' },
      { command: 'free', description: 'Assign free role (admins)' },
      { command: 'unfree', description: 'Remove free role (admins)' },
      { command: 'pin', description: 'Pin replied message (admins)' },
      { command: 'unpin', description: 'Unpin current message (admins)' },
      { command: 'unpinall', description: 'Unpin all messages (admins)' },
      { command: 'pinned', description: 'Show current pinned message (admins)' },
      { command: 'welcome', description: 'Toggle welcome on/off (admins)' },
      { command: 'filter', description: 'Add a word filter (admins)' },
      { command: 'stop', description: 'Remove a reply filter (admins)' },
      { command: 'stopall', description: 'Remove all reply filters (owner)' },
      { command: 'unfilter', description: 'Alias for stop (admins)' },
      { command: 'filters', description: 'List active reply filters' },
      { command: 'blockword', description: 'Add a blocked phrase (admins)' },
      { command: 'unblockword', description: 'Remove a blocked phrase (admins)' },
      { command: 'blockwords', description: 'List blocked phrases (admins)' },
      { command: 'settings', description: 'Open group settings (admins)' },
      { command: 'setwarnlimit', description: 'Set warning limit (admins)' },
      { command: 'setwarnmode', description: 'Set warning punishment (admins)' },
      { command: 'setwarntime', description: 'Set warning expiry (admins)' },
      { command: 'warntime', description: 'View or set warning expiry (admins)' },
      { command: 'lockdown', description: 'Lock group for N minutes (admins)' },
      { command: 'unlock', description: 'Unlock group (admins)' },
      { command: 'warnings', description: 'Warning settings and your count' },
      { command: 'warns', description: 'View warning details' },
      { command: 'disabled', description: 'Show disabled commands' },
      { command: 'disableable', description: 'List commands that can be disabled' },
      { command: 'me', description: 'Show your group profile' },
      { command: 'report', description: 'Report a message to admins' },
      { command: 'reports', description: 'Toggle user reports (admins)' },
      { command: 'disable', description: 'Disable a member command (admins)' },
      { command: 'enable', description: 'Enable a member command (admins)' },
      { command: 'disabledel', description: 'Delete ignored disabled commands' },
      { command: 'disableadmin', description: 'Apply disabled commands to admins' },
      { command: 'cleancommand', description: 'Delete selected command types (admins)' },
      { command: 'keepcommand', description: 'Keep selected command types (admins)' },
      { command: 'cleancommandtypes', description: 'List command cleanup types' },
      { command: 'cleanmsg', description: 'Auto-delete selected bot replies (admins)' },
      { command: 'keepmsg', description: 'Keep selected bot replies (admins)' },
      { command: 'cleanmsgtypes', description: 'List bot-message cleanup types' },
      { command: 'cleanservice', description: 'Delete Telegram service notices (admins)' },
      { command: 'nocleanservice', description: 'Keep Telegram service notices (admins)' },
      { command: 'cleanservicetypes', description: 'List service cleanup types' },
      { command: 'save', description: 'Save or update a note (admins)' },
      { command: 'clear', description: 'Delete a saved note (admins)' },
      { command: 'privatenotes', description: 'Toggle private note delivery (admins)' },
      { command: 'get', description: 'Open a saved note' },
      { command: 'notes', description: 'List saved notes' },
      { command: 'forgot', description: 'Remove your data from this group' },
      { command: 'setofftopic', description: 'Register off-topic group (admins)' },
      { command: 'setlog', description: 'Set moderation log channel (admins)' },
      { command: 'help', description: 'Community bot help' }
    ],
    allowedUpdates: [
      'message',
      'edited_message',
      'callback_query',
      'poll',
      'poll_answer',
      'message_reaction',
      'chat_member',
      'my_chat_member'
    ]
  },
  [COMMUNITY_BOT_SLUGS.TOXIC_MOVIE]: {
    name: TELEGRAM_BOT_DISPLAY_NAMES.TOXIC_MOVIE,
    tokenEnv: 'TELEGRAM_TOXIC_MOVIE_BOT_TOKEN',
    description:
      'Unofficial verified Toxic and Yash updates without piracy links. Join HopeHub India for friendly conversation and emotional support: https://t.me/hopehubindia',
    shortDescription:
      'Verified Toxic and Yash updates. Join HopeHub India: https://t.me/hopehubindia',
    commands: [
      { command: 'start', description: 'Open Toxic movie updates' },
      { command: 'latest', description: 'Find the latest verified updates' },
      { command: 'about', description: 'About this unofficial bot' },
      { command: 'community', description: 'Join HopeHub India' },
      { command: 'help', description: 'Show available commands' }
    ],
    allowedUpdates: ['message', 'callback_query', 'my_chat_member']
  }
};

export function communityBotFromSlug(value: string): CommunityBotSlug | null {
  return value in COMMUNITY_BOTS ? (value as CommunityBotSlug) : null;
}

export function communityBotToken(slug: CommunityBotSlug) {
  return process.env[COMMUNITY_BOTS[slug].tokenEnv]?.trim() || '';
}

export function communityBotStatus() {
  return (Object.keys(COMMUNITY_BOTS) as CommunityBotSlug[]).map((slug) => ({
    kind: slug.toUpperCase(),
    slug,
    name: COMMUNITY_BOTS[slug].name,
    configured: Boolean(communityBotToken(slug)),
    tokenEnv: COMMUNITY_BOTS[slug].tokenEnv,
    runtime: 'api-webhook' as const
  }));
}

export async function callCommunityTelegramApi<T>(
  slug: CommunityBotSlug,
  method: string,
  payload: unknown
) {
  const token = communityBotToken(slug);
  if (!token) throw new Error(`${COMMUNITY_BOTS[slug].tokenEnv} is not configured.`);
  return callTelegramBotApi<T>(token, method, colorizeTelegramPayload(payload));
}

export function sendCommunityMessage(
  slug: CommunityBotSlug,
  chatId: string | number,
  text: string,
  options: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: TelegramKeyboard;
    reply_to_message_id?: number;
    message_thread_id?: number;
    disable_notification?: boolean;
    protect_content?: boolean;
    link_preview_options?: { is_disabled: boolean };
  } = {}
) {
  const replyMarkup = options.reply_markup
    ? colorizeTelegramKeyboard(options.reply_markup)
    : undefined;
  return callCommunityTelegramApi<{ message_id: number }>(slug, 'sendMessage', {
    chat_id: chatId,
    text,
    ...options,
    reply_markup: replyMarkup
  });
}

export function answerCommunityCallback(
  slug: CommunityBotSlug,
  callbackQueryId: string,
  text?: string
) {
  return callCommunityTelegramApi(slug, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

export function isTelegramMessageNotModifiedError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return /message is not modified/i.test(detail);
}

export async function editCommunityReplyMarkup(
  slug: CommunityBotSlug,
  chatId: string | number,
  messageId: number,
  replyMarkup: TelegramKeyboard
) {
  try {
    return await callCommunityTelegramApi(slug, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: colorizeTelegramKeyboard(replyMarkup)
    });
  } catch (error) {
    // An RSVP can be delivered twice or tapped simultaneously. Telegram
    // already has the requested keyboard in that case, so this is success,
    // not a failed webhook update that should be retried or alerted.
    if (isTelegramMessageNotModifiedError(error)) return null;
    throw error;
  }
}

export function getCommunityWebhookInfo(slug: CommunityBotSlug) {
  return callCommunityTelegramApi(slug, 'getWebhookInfo', {});
}

export async function syncGroupHelpChatCommands(
  chatId: string,
  customCommands: Array<{ command: string; description: string }>
) {
  const base = COMMUNITY_BOTS[COMMUNITY_BOT_SLUGS.GROUP_HELP].commands;
  const seen = new Set(base.map((item) => item.command));
  const commands = [
    ...base,
    ...customCommands.filter((item) => {
      if (seen.has(item.command)) return false;
      seen.add(item.command);
      return /^[a-z0-9_]{1,32}$/.test(item.command) && Boolean(item.description.trim());
    })
  ].slice(0, 100);
  return callCommunityTelegramApi(COMMUNITY_BOT_SLUGS.GROUP_HELP, 'setMyCommands', {
    commands,
    scope: { type: 'chat', chat_id: chatId }
  });
}

export async function setupCommunityBot(input: {
  slug: CommunityBotSlug;
  publicApiUrl: string;
  webhookSecret?: string;
  dropPendingUpdates?: boolean;
}) {
  const config = COMMUNITY_BOTS[input.slug];
  await callCommunityTelegramApi(input.slug, 'setMyCommands', { commands: config.commands });
  if (config.description) {
    await callCommunityTelegramApi(input.slug, 'setMyDescription', {
      description: config.description
    });
  }
  if (config.shortDescription) {
    await callCommunityTelegramApi(input.slug, 'setMyShortDescription', {
      short_description: config.shortDescription
    });
  }
  // Community bots use their inline keyboards, not a stale global web-app menu button.
  await callCommunityTelegramApi(input.slug, 'setChatMenuButton', {
    menu_button: { type: 'default' }
  });
  return callCommunityTelegramApi(input.slug, 'setWebhook', {
    url: `${input.publicApiUrl.replace(/\/$/, '')}/telegram/webhook/${input.slug}`,
    secret_token: input.webhookSecret || undefined,
    allowed_updates: config.allowedUpdates,
    drop_pending_updates: Boolean(input.dropPendingUpdates)
  });
}
