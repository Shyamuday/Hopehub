import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import { scheduleCommunityMessageCleanup } from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export async function sendModerationLog(
  values: Record<string, string>,
  message: CommunityTelegramMessage,
  reason: string,
  action: string
) {
  const destination =
    values.telegramGroupHelpLogChannelId?.trim() || values.telegramGroupHelpStaffGroupId?.trim();
  if (!destination || !message.from) return;
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    destination,
    `🛡 Moderation action\n\nReason: ${reason}\nAction: ${action}\nMember: ${message.from.first_name || 'Telegram member'} (${message.from.id})\nGroup: ${message.chat.title || message.chat.id}`
  ).catch(() => null);
}

/** Records a privacy-safe operational event in the configured staff log channel. */
export async function sendGroupHelpActivityLog(
  values: Record<string, string>,
  title: string,
  details: Array<string | null | undefined> = []
) {
  const destination = values.telegramGroupHelpLogChannelId?.trim();
  if (!destination) return;
  const body = details.filter((detail): detail is string => Boolean(detail?.trim())).join('\n');
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    destination,
    ['📋 ' + title, body].filter(Boolean).join('\n\n')
  ).catch(() => null);
}

export async function deleteGroupHelpMessage(chatId: string, messageId: number) {
  await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

export async function sendTemporaryGroupHelpMessage(
  chatId: string,
  text: string,
  values: Record<string, string>,
  options: Parameters<typeof sendCommunityMessage>[3] = {}
) {
  const sent = await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text, options);
  const delaySeconds = Math.max(0, Number(values.telegramGroupHelpAutoDeleteSeconds || 300));
  if (delaySeconds > 0) {
    await scheduleCommunityMessageCleanup({
      bot: GROUP_HELP_BOT_SLUG,
      chatId,
      messageId: sent.message_id,
      kind: 'transient',
      deleteAfter: new Date(Date.now() + delaySeconds * 1000)
    });
  }
  return sent;
}

export async function applyGroupHelpMemberAction(chatId: string, userId: number, action: string) {
  if (action === 'ban' || action === 'kick') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'banChatMember', {
      chat_id: chatId,
      user_id: userId,
      revoke_messages: false
    });
    if (action === 'kick') {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
        chat_id: chatId,
        user_id: userId,
        only_if_banned: true
      });
    }
  } else if (action === 'mute') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + 60 * 60
    });
  } else if (action === 'unban') {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
      chat_id: chatId,
      user_id: userId,
      only_if_banned: true
    });
  }
}
