import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

type BotSendOptions = {
  destinationChatId: string;
  replyToMessageId?: number;
  messageThreadId?: number;
  text?: string;
};

function mediaPayload(message: CommunityTelegramMessage | undefined) {
  if (!message) return null;
  const photo = message.photo?.at(-1)?.file_id;
  if (photo) return { method: 'sendPhoto', field: 'photo', fileId: photo, supportsCaption: true };
  const candidates = [
    ['sendVideo', 'video', message.video?.file_id, true],
    ['sendAnimation', 'animation', message.animation?.file_id, true],
    ['sendDocument', 'document', message.document?.file_id, true],
    ['sendAudio', 'audio', message.audio?.file_id, true],
    ['sendVoice', 'voice', message.voice?.file_id, true],
    ['sendVideoNote', 'video_note', message.video_note?.file_id, false],
    ['sendSticker', 'sticker', message.sticker?.file_id, false]
  ] as const;
  const selected = candidates.find(([, , fileId]) => Boolean(fileId));
  return selected
    ? {
        method: selected[0],
        field: selected[1],
        fileId: selected[2]!,
        supportsCaption: selected[3]
      }
    : null;
}

export function groupHelpMessageHasSendableMedia(message: CommunityTelegramMessage | undefined) {
  return Boolean(message && mediaPayload(message));
}

export async function sendGroupHelpBotContent(
  source: CommunityTelegramMessage,
  options: BotSendOptions
) {
  const sourceMedia = mediaPayload(source)
    ? source
    : mediaPayload(source.reply_to_message)
      ? source.reply_to_message!
      : null;
  const media = sourceMedia ? mediaPayload(sourceMedia) : null;
  const explicitText = (options.text || '').trim();
  if (!media) {
    if (!explicitText) throw new Error('Add a message or attach supported media to send.');
    return sendCommunityMessage(GROUP_HELP_BOT_SLUG, options.destinationChatId, explicitText, {
      ...(options.replyToMessageId ? { reply_to_message_id: options.replyToMessageId } : {}),
      ...(options.messageThreadId ? { message_thread_id: options.messageThreadId } : {})
    });
  }

  const caption =
    explicitText || (sourceMedia === source.reply_to_message ? sourceMedia.caption || '' : '');
  if (media.supportsCaption && Array.from(caption).length > 1024) {
    throw new Error('Media captions must be 1,024 characters or fewer.');
  }
  return callCommunityTelegramApi<{ message_id: number }>(GROUP_HELP_BOT_SLUG, media.method, {
    chat_id: options.destinationChatId,
    [media.field]: media.fileId,
    ...(media.supportsCaption && caption ? { caption } : {}),
    ...(options.replyToMessageId ? { reply_to_message_id: options.replyToMessageId } : {}),
    ...(options.messageThreadId ? { message_thread_id: options.messageThreadId } : {})
  });
}
