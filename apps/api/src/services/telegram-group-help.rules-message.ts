import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import { scheduleCommunityMessageCleanup } from './telegram-community-bots.store.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';

export function isGroupHelpRulesRequest(text: string | null | undefined) {
  return /^(?:rule|rules)[.!?]*$/i.test((text || '').normalize('NFKC').trim());
}

export function isGroupHelpModerationKeywordRequest(text: string | null | undefined) {
  return /^(?:ban|unban|mute|unmute|warn|unwarn|kick|block|report)[.!?]*$/i.test(
    (text || '').normalize('NFKC').trim()
  );
}

function groupHelpMediaPayload(url: string) {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) {
    return { method: 'sendVideo' as const, media: { video: url } };
  }
  if (/\.(gif|webp)$/.test(path)) {
    return { method: 'sendAnimation' as const, media: { animation: url } };
  }
  return { method: 'sendPhoto' as const, media: { photo: url } };
}

async function sendGroupHelpConfiguredMediaMessage(input: {
  chatId: string;
  values: Record<string, string>;
  text: string;
  mediaUrl: string;
  replyToMessageId?: number;
  messageThreadId?: number;
  mainMenu?: boolean;
}) {
  const { chatId, values, replyToMessageId, messageThreadId } = input;
  const text = input.text.trim();
  const mediaUrl = input.mediaUrl.trim();
  const baseKeyboard = input.mainMenu
    ? { inline_keyboard: [[{ text: 'Main menu', callback_data: 'hh_menu_home' }]] }
    : undefined;
  const keyboard = withCrossCommunityButton(baseKeyboard, values, chatId);

  if (mediaUrl) {
    const media = groupHelpMediaPayload(mediaUrl);
    const useCaption = Array.from(text).length <= 1024;
    const sent = await callCommunityTelegramApi<{ message_id: number }>(
      GROUP_HELP_BOT_SLUG,
      media.method,
      {
        chat_id: chatId,
        ...media.media,
        ...(useCaption ? { caption: text } : {}),
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
        ...(keyboard ? { reply_markup: keyboard } : {})
      }
    ).catch(() => null);

    if (sent) {
      await scheduleCommunityMessageCleanup({
        bot: GROUP_HELP_BOT_SLUG,
        chatId,
        messageId: sent.message_id,
        kind: 'transient',
        deleteAfter: new Date(Date.now() + 60_000)
      });
      if (!useCaption) {
        await sendTemporaryGroupHelpMessage(
          chatId,
          text,
          { ...values, telegramGroupHelpAutoDeleteSeconds: '60' },
          {
            ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
            ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
            ...(keyboard ? { reply_markup: keyboard } : {})
          }
        );
      }
      return;
    }
  }

  await sendTemporaryGroupHelpMessage(
    chatId,
    text,
    { ...values, telegramGroupHelpAutoDeleteSeconds: '60' },
    {
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
      ...(keyboard ? { reply_markup: keyboard } : {})
    }
  );
}

type GroupHelpConfiguredMessageInput = Omit<
  Parameters<typeof sendGroupHelpConfiguredMediaMessage>[0],
  'text' | 'mediaUrl'
>;

export async function sendGroupHelpRulesMessage(input: GroupHelpConfiguredMessageInput) {
  return sendGroupHelpConfiguredMediaMessage({
    ...input,
    text: input.values.telegramGroupHelpRulesMessage || 'Please follow the community rules.',
    mediaUrl: input.values.telegramGroupHelpRulesImageUrl || ''
  });
}

export async function sendGroupHelpSupportMessage(input: GroupHelpConfiguredMessageInput) {
  return sendGroupHelpConfiguredMediaMessage({
    ...input,
    text:
      input.values.telegramGroupHelpSupportMessage ||
      'Visit https://hopehub.in if you need one-to-one support.',
    mediaUrl: input.values.telegramGroupHelpSupportImageUrl || ''
  });
}
