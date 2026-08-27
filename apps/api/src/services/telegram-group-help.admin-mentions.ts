import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

const ADMIN_MENTION_STATE = 'group-help:admin-mention';
const ADMIN_MENTION_LIFETIME_MS = 7 * 24 * 60 * 60_000;
const ADMIN_MENTION_PATTERN = /(^|[^a-z0-9_])@(admins?|administrators?|moderators?|mods?)\b/i;

export type GroupHelpAdminMentionTarget = {
  targetChatId: string;
  targetMessageId: number;
  messageThreadId?: number;
  memberLabel: string;
};

export function hasGroupHelpAdminMention(text: string) {
  return ADMIN_MENTION_PATTERN.test(text.normalize('NFKC'));
}

function stateKey(staffChatId: string, messageId: number) {
  return `${staffChatId}:${messageId}`;
}

/** Sends an admin/moderator mention into the private staff group and retains its reply target. */
export async function forwardGroupHelpAdminMention(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  if (!message.from || !hasGroupHelpAdminMention(message.text || '')) return false;
  const staffChatId =
    values.telegramGroupHelpStaffGroupId?.trim() ||
    values.telegramGroupHelpLogChannelId?.trim() ||
    '';
  if (!staffChatId) return false;

  const targetChatId = String(message.chat.id);
  const memberLabel = telegramPersonLogLabel(message.from);
  const body = [
    'Administrator request',
    `Member: ${memberLabel}`,
    `Group: ${message.chat.title || targetChatId} [${targetChatId}]`,
    `Message: ${message.message_id}${message.message_thread_id ? ` · topic ${message.message_thread_id}` : ''}`,
    '',
    message.text?.trim() || '[No text]',
    '',
    'Reply to this alert with /send <message> to post as Hope Hub bot in the group.'
  ].join('\n');
  const sent = await sendCommunityMessage(GROUP_HELP_BOT_SLUG, staffChatId, body);
  await prisma.telegramCommunityState.upsert({
    where: {
      bot_chatId: { bot: ADMIN_MENTION_STATE, chatId: stateKey(staffChatId, sent.message_id) }
    },
    create: {
      bot: ADMIN_MENTION_STATE,
      chatId: stateKey(staffChatId, sent.message_id),
      state: 'OPEN',
      payload: {
        targetChatId,
        targetMessageId: message.message_id,
        messageThreadId: message.message_thread_id || null,
        memberLabel
      },
      expiresAt: new Date(Date.now() + ADMIN_MENTION_LIFETIME_MS)
    },
    update: {
      state: 'OPEN',
      payload: {
        targetChatId,
        targetMessageId: message.message_id,
        messageThreadId: message.message_thread_id || null,
        memberLabel
      },
      expiresAt: new Date(Date.now() + ADMIN_MENTION_LIFETIME_MS)
    }
  });
  return true;
}

/** Resolves the original group message when a staff member replies to an admin alert. */
export async function groupHelpAdminMentionReplyTarget(
  staffChatId: string,
  replyMessageId?: number
): Promise<GroupHelpAdminMentionTarget | null> {
  if (!replyMessageId) return null;
  const state = await prisma.telegramCommunityState.findUnique({
    where: {
      bot_chatId: { bot: ADMIN_MENTION_STATE, chatId: stateKey(staffChatId, replyMessageId) }
    }
  });
  if (!state || state.state !== 'OPEN' || state.expiresAt <= new Date()) return null;
  const payload = (state.payload || {}) as Partial<GroupHelpAdminMentionTarget>;
  const targetMessageId = payload.targetMessageId;
  if (
    !payload.targetChatId ||
    typeof targetMessageId !== 'number' ||
    !Number.isInteger(targetMessageId)
  )
    return null;
  return {
    targetChatId: payload.targetChatId,
    targetMessageId,
    ...(payload.messageThreadId ? { messageThreadId: payload.messageThreadId } : {}),
    memberLabel: payload.memberLabel || 'Telegram member'
  };
}
