import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';

const STATE_BOT = 'group-help:command-confirmation';
const CONFIRM = 'hh_cmd_confirm';
const CANCEL = 'hh_cmd_cancel';
const TTL_MS = 5 * 60_000;

type PendingCommand = {
  text: string;
  chat: CommunityTelegramMessage['chat'];
  replyToMessage?: CommunityTelegramMessage;
  targetChatId: string;
  command: string;
};

function stateChatId(chatId: string | number, userId: number) {
  return `${chatId}:${userId}`;
}

export async function requestGroupHelpCommandConfirmation(input: {
  message: CommunityTelegramMessage;
  targetChatId: string;
  command: string;
}) {
  if (input.message._groupHelpConfirmed) return false;
  if (!input.message.from || input.message.sender_chat) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      input.message.chat.id,
      'For safety, this command must be sent from a visible administrator account so it can be confirmed.'
    );
    return true;
  }
  const key = stateChatId(input.message.chat.id, input.message.from.id);
  const payload: PendingCommand = {
    text: input.message.text || input.command,
    chat: input.message.chat,
    replyToMessage: input.message.reply_to_message,
    targetChatId: input.targetChatId,
    command: input.command
  };
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: STATE_BOT, chatId: key } },
    create: {
      bot: STATE_BOT,
      chatId: key,
      state: 'PENDING',
      payload: payload as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + TTL_MS)
    },
    update: {
      state: 'PENDING',
      payload: payload as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + TTL_MS)
    }
  });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    input.message.chat.id,
    `Confirm ${input.command} for the main group? This request expires in 5 minutes.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Confirm', callback_data: CONFIRM, style: 'danger' },
            { text: 'Cancel', callback_data: CANCEL }
          ]
        ]
      }
    }
  );
  return true;
}

export async function handleGroupHelpCommandConfirmationCallback(
  update: CommunityTelegramUpdate,
  execute: (message: CommunityTelegramMessage) => Promise<unknown>
) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data || ![CONFIRM, CANCEL].includes(callback.data)) {
    return false;
  }
  const key = stateChatId(callback.message.chat.id, callback.from.id);
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: STATE_BOT, chatId: key } },
    select: { payload: true, expiresAt: true }
  });
  const pending = row?.payload as PendingCommand | null;
  if (!row || row.expiresAt <= new Date() || !pending?.text) {
    await prisma.telegramCommunityState.deleteMany({ where: { bot: STATE_BOT, chatId: key } });
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'This confirmation has expired. Send the command again.'
    );
    return true;
  }
  await prisma.telegramCommunityState.deleteMany({ where: { bot: STATE_BOT, chatId: key } });
  if (callback.data === CANCEL) {
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'Command cancelled.');
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      callback.message.chat.id,
      'No action was applied.'
    );
    return true;
  }
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'Applying command…');
  await execute({
    message_id: callback.message.message_id,
    text: pending.text,
    chat: pending.chat,
    from: callback.from,
    reply_to_message: pending.replyToMessage,
    _groupHelpConfirmed: true
  });
  return true;
}
