import {
  GROUP_HELP_BOT_SLUG,
  TELEGRAM_BOT_URLS
} from '../constants/telegram-community-bot.constants.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import { scheduleCommunityMessageCleanup } from './telegram-community-bots.store.js';
import type {
  CommunityTelegramMessage,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';
import {
  GROUP_HELP_CLEAN_MESSAGE_TYPES,
  shouldCleanGroupHelpType
} from './telegram-group-help.cleaning.js';
import { formatGroupHelpMessage } from './telegram-group-help.formatting.js';
import { renderGroupHelpFilterHtml } from './telegram-group-help.filters.js';
import type { GroupHelpNote } from './telegram-group-help.notes.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import {
  groupHelpNote,
  parseGroupHelpNotes,
  serializeGroupHelpNotes
} from './telegram-group-help.notes.js';
import { prisma } from '../db.js';
import {
  getTelegramCommunityGroupPolicy,
  saveTelegramCommunityGroupPolicy
} from './telegram-community-group-policy.js';

export async function isGroupHelpNoteAdmin(chatId: string, userId: number | undefined) {
  if (!userId) return false;
  const member = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    { chat_id: chatId, user_id: userId }
  ).catch(() => null);
  return ['creator', 'administrator', 'owner'].includes(member?.status || '');
}

export async function isGroupHelpNoteMember(chatId: string, userId: number | undefined) {
  if (!userId) return false;
  const member = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    { chat_id: chatId, user_id: userId }
  ).catch(() => null);
  return Boolean(member && !['left', 'kicked'].includes(member.status || 'left'));
}

function noteKeyboardForSource(keyboard: TelegramKeyboard | undefined, sourceChatId: string) {
  if (!keyboard) return undefined;
  return {
    inline_keyboard: keyboard.inline_keyboard.map((row) =>
      row.map((button) => ({
        ...button,
        ...(button.callback_data?.startsWith('hh_note:')
          ? {
              callback_data:
                `hh_note:${sourceChatId}:${button.callback_data.slice('hh_note:'.length)}`.slice(
                  0,
                  64
                )
            }
          : {})
      }))
    )
  };
}

export function groupHelpPrivateNoteUrl(sourceChatId: string, noteName: string) {
  return `${TELEGRAM_BOT_URLS.GROUP_HELP}?start=note_${sourceChatId}_${noteName}`;
}

export async function sendGroupHelpNote(input: {
  note: GroupHelpNote;
  sourceChatId: string;
  destinationChatId: string;
  message: CommunityTelegramMessage;
  values: Record<string, string>;
}) {
  const fillingTarget = input.message.reply_to_message?.from || input.message.from;
  const formatted = formatGroupHelpMessage(input.note.text || '');
  const text = renderGroupHelpFilterHtml(formatted.text, {
    ...input.message,
    chat: { ...input.message.chat, id: input.destinationChatId },
    from: fillingTarget,
    reply_to_message: undefined
  });
  const replyMarkup = noteKeyboardForSource(formatted.replyMarkup, input.sourceChatId);
  const inOriginalChat = String(input.message.chat.id) === input.destinationChatId;
  const replyMessageId = inOriginalChat
    ? input.message.reply_to_message?.message_id || input.message.message_id
    : 0;
  const options = {
    ...(replyMessageId > 0
      ? {
          reply_to_message_id: replyMessageId,
          ...(input.message.message_thread_id
            ? { message_thread_id: input.message.message_thread_id }
            : {})
        }
      : {}),
    parse_mode: 'HTML' as const,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    disable_notification: formatted.disableNotification,
    protect_content: formatted.protectContent,
    link_preview_options: { is_disabled: !formatted.showLinkPreview }
  };
  if (!input.note.media) {
    return sendTemporaryGroupHelpMessage(
      input.destinationChatId,
      text,
      input.values,
      options,
      'note'
    );
  }
  const methodByType = {
    sticker: 'sendSticker',
    photo: 'sendPhoto',
    animation: 'sendAnimation',
    video: 'sendVideo',
    video_note: 'sendVideoNote',
    document: 'sendDocument',
    audio: 'sendAudio',
    voice: 'sendVoice'
  } as const;
  const sent = await callCommunityTelegramApi<{ message_id: number }>(
    GROUP_HELP_BOT_SLUG,
    methodByType[input.note.media.type],
    {
      chat_id: input.destinationChatId,
      [input.note.media.type]: input.note.media.fileId,
      ...(text && !['sticker', 'video_note'].includes(input.note.media.type)
        ? { caption: text, parse_mode: 'HTML' }
        : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      ...(options.reply_to_message_id ? { reply_to_message_id: options.reply_to_message_id } : {}),
      ...(options.message_thread_id ? { message_thread_id: options.message_thread_id } : {}),
      disable_notification: formatted.disableNotification,
      protect_content: formatted.protectContent,
      ...(formatted.mediaSpoiler && ['photo', 'video', 'animation'].includes(input.note.media.type)
        ? { has_spoiler: true }
        : {})
    }
  );
  if (
    shouldCleanGroupHelpType(
      input.values.telegramGroupHelpCleanMessageTypes,
      'note',
      GROUP_HELP_CLEAN_MESSAGE_TYPES,
      true
    )
  ) {
    await scheduleCommunityMessageCleanup({
      bot: GROUP_HELP_BOT_SLUG,
      chatId: input.destinationChatId,
      messageId: sent.message_id,
      kind: 'transient',
      deleteAfter: new Date(Date.now() + 300_000)
    });
  }
  if (text && ['sticker', 'video_note'].includes(input.note.media.type)) {
    await sendTemporaryGroupHelpMessage(
      input.destinationChatId,
      text,
      input.values,
      options,
      'note'
    );
  }
  return sent;
}

export async function sendGroupHelpPrivateNotePrompt(
  message: CommunityTelegramMessage,
  sourceChatId: string,
  noteName: string,
  values: Record<string, string>
) {
  return sendTemporaryGroupHelpMessage(
    String(message.chat.id),
    'Open this note privately to keep the group tidy.',
    values,
    {
      reply_to_message_id: message.reply_to_message?.message_id || message.message_id,
      message_thread_id: message.message_thread_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: `Open #${noteName}`, url: groupHelpPrivateNoteUrl(sourceChatId, noteName) }]
        ]
      }
    }
  );
}

export async function openGroupHelpNote(input: {
  message: CommunityTelegramMessage;
  sourceChatId: string;
  noteName: string;
  values?: Record<string, string>;
  forcePrivateDelivery?: boolean;
}) {
  const values = input.values || (await groupHelpConfig(input.sourceChatId));
  const note = groupHelpNote(parseGroupHelpNotes(values.telegramGroupHelpNotes), input.noteName);
  if (!note) return 'missing' as const;
  if (note.adminOnly && !(await isGroupHelpNoteAdmin(input.sourceChatId, input.message.from?.id)))
    return 'denied' as const;
  const privateByDefault = values.telegramGroupHelpPrivateNotes === 'on';
  const shouldOpenPrivately =
    note.privacy === 'private' || (note.privacy === 'default' && privateByDefault);
  if (shouldOpenPrivately && !input.forcePrivateDelivery && input.message.chat.type !== 'private') {
    await sendGroupHelpPrivateNotePrompt(input.message, input.sourceChatId, note.name, values);
    return 'private-prompt' as const;
  }
  await sendGroupHelpNote({
    note,
    sourceChatId: input.sourceChatId,
    destinationChatId: String(input.message.chat.id),
    message: input.message,
    values
  });
  return 'sent' as const;
}

export async function runRepeatedGroupHelpNotes(now = new Date()) {
  const groups = await prisma.telegramCommunityGroupPolicy.findMany({ select: { chatId: true } });
  for (const { chatId } of groups) {
    const values = await groupHelpConfig(chatId);
    const notes = parseGroupHelpNotes(values.telegramGroupHelpNotes);
    const due = notes.filter(
      (note) =>
        note.repeatSeconds &&
        note.nextRepeatAt &&
        new Date(note.nextRepeatAt).getTime() <= now.getTime()
    );
    if (!due.length) continue;
    const chat = await callCommunityTelegramApi<{ title?: string }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: chatId }
    ).catch(() => null);
    let changed = false;
    const nextByName = new Map<string, string>();
    for (const note of due) {
      try {
        await sendGroupHelpNote({
          note,
          sourceChatId: chatId,
          destinationChatId: chatId,
          message: {
            message_id: 0,
            chat: { id: chatId, type: 'supergroup', title: chat?.title }
          },
          values
        });
        note.nextRepeatAt = new Date(now.getTime() + note.repeatSeconds! * 1000).toISOString();
        nextByName.set(note.name, note.nextRepeatAt);
        changed = true;
      } catch (error) {
        console.error('[telegram-group-help] Could not send repeated note.', {
          chatId,
          note: note.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    if (changed) {
      const policy = await getTelegramCommunityGroupPolicy(chatId);
      const latestNotes = parseGroupHelpNotes(policy.telegramGroupHelpNotes);
      for (const note of latestNotes) {
        const nextRepeatAt = nextByName.get(note.name);
        if (nextRepeatAt && note.repeatSeconds) note.nextRepeatAt = nextRepeatAt;
      }
      await saveTelegramCommunityGroupPolicy(chatId, {
        ...policy,
        telegramGroupHelpNotes: serializeGroupHelpNotes(latestNotes)
      });
    }
  }
}
