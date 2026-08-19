import type { CommunityBotSlug, TelegramKeyboard } from './telegram-community-bots.types.js';
import { colorizeTelegramKeyboard, colorizeTelegramPayload } from './telegram-button-styles.js';
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
      { command: 'unwarn', description: 'Remove latest warning (staff)' },
      { command: 'del', description: 'Delete replied message (staff)' },
      { command: 'mute', description: 'Mute replied member (moderators)' },
      { command: 'unmute', description: 'Unmute replied member (moderators)' },
      { command: 'ro', description: 'Set replied member read-only (moderators)' },
      { command: 'unro', description: 'Remove read-only (moderators)' },
      { command: 'ban', description: 'Ban replied member (moderators)' },
      { command: 'unban', description: 'Unban replied member (moderators)' },
      { command: 'kick', description: 'Kick replied member (moderators)' },
      { command: 'delwarn', description: 'Delete message and warn (staff)' },
      { command: 'delmute', description: 'Delete message and mute (moderators)' },
      { command: 'delban', description: 'Delete message and ban (moderators)' },
      { command: 'delkick', description: 'Delete message and kick (moderators)' },
      { command: 'clearwarnings', description: 'Clear replied member warnings (moderators)' },
      { command: 'adminlist', description: 'List group admins (staff)' },
      { command: 'staff', description: 'Show community staff (staff)' },
      { command: 'info', description: 'Show replied member details (staff)' },
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
      { command: 'unfilter', description: 'Remove a word filter (admins)' },
      { command: 'filters', description: 'List active word filters (admins)' },
      { command: 'settings', description: 'Open group settings (admins)' },
      { command: 'lockdown', description: 'Lock group for N minutes (admins)' },
      { command: 'unlock', description: 'Unlock group (admins)' },
      { command: 'warnings', description: 'Check your warnings' },
      { command: 'me', description: 'Show your group profile' },
      { command: 'report', description: 'Report a message to admins' },
      { command: 'forgot', description: 'Remove your data from this group' },
      { command: 'settestgroup', description: 'Register test group (admins)' },
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

export function sendCommunityMessage(
  slug: CommunityBotSlug,
  chatId: string | number,
  text: string,
  options: {
    parse_mode?: 'Markdown';
    reply_markup?: TelegramKeyboard;
    reply_to_message_id?: number;
    message_thread_id?: number;
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

export function editCommunityReplyMarkup(
  slug: CommunityBotSlug,
  chatId: string | number,
  messageId: number,
  replyMarkup: TelegramKeyboard
) {
  return callCommunityTelegramApi(slug, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: colorizeTelegramKeyboard(replyMarkup)
  });
}

export function getCommunityWebhookInfo(slug: CommunityBotSlug) {
  return callCommunityTelegramApi(slug, 'getWebhookInfo', {});
}

export async function setupCommunityBot(input: {
  slug: CommunityBotSlug;
  publicApiUrl: string;
  webhookSecret?: string;
  dropPendingUpdates?: boolean;
}) {
  const config = COMMUNITY_BOTS[input.slug];
  await callCommunityTelegramApi(input.slug, 'setMyCommands', { commands: config.commands });
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
