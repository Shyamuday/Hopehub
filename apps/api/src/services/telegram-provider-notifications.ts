import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import { doctorUrl, webUrl } from './telegram-bots.ui.js';

async function providerChatIds(providerUserId: string) {
  const sessions = await prisma.telegramBotSession.findMany({
    where: { botKind: TelegramBotKind.DOCTOR, linkedUserId: providerUserId },
    select: { chatId: true }
  });
  return [...new Set(sessions.map((session) => session.chatId))];
}

async function userChatIds(userId: string) {
  const sessions = await prisma.telegramBotSession.findMany({
    where: { botKind: TelegramBotKind.USER, linkedUserId: userId },
    select: { chatId: true }
  });
  return [...new Set(sessions.map((session) => session.chatId))];
}

export async function notifyUserBookingOnTelegram(input: {
  userId: string;
  consultationId: string;
  title: string;
  body: string;
  openLiveSession?: boolean;
}) {
  const chatIds = await userChatIds(input.userId);
  if (!chatIds.length) return;
  await Promise.allSettled(
    chatIds.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.USER, {
        chat_id: chatId,
        text: `<b>${escapeHtml(input.title)}</b>\n${escapeHtml(input.body)}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...(input.openLiveSession
              ? [
                  [
                    {
                      text: 'Open live session',
                      url: webUrl(`/live-session/${input.consultationId}`)
                    }
                  ]
                ]
              : []),
            [{ text: 'My requests', callback_data: 'user:requests' }],
            [{ text: 'Open Hope Hub', url: webUrl('/dashboard') }]
          ]
        }
      })
    )
  );
}

export async function notifyUserFeedbackRequestOnTelegram(input: {
  userId: string;
  consultationId: string;
}) {
  const chatIds = await userChatIds(input.userId);
  if (!chatIds.length) return;
  await Promise.allSettled(
    chatIds.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.USER, {
        chat_id: chatId,
        text: 'Your Hope Hub session is complete. A quick rating helps us improve care.',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Rate this session', callback_data: `user:feedback:${input.consultationId}` }],
            [{ text: 'Later', callback_data: 'common:menu' }]
          ]
        }
      })
    )
  );
}

export async function notifyProviderBookingOnTelegram(input: {
  providerUserId: string;
  consultationId: string;
  title: string;
  body: string;
}) {
  const chatIds = await providerChatIds(input.providerUserId);
  if (!chatIds.length) return;
  await Promise.allSettled(
    chatIds.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.DOCTOR, {
        chat_id: chatId,
        text: `<b>${escapeHtml(input.title)}</b>\n${escapeHtml(input.body)}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open queue', callback_data: 'doctor:queue' }],
            [
              {
                text: 'Open provider portal',
                url: doctorUrl(`/consultations/${input.consultationId}`)
              }
            ]
          ]
        }
      })
    )
  );
}

export async function notifyProviderFeedbackOnTelegram(input: {
  providerUserId: string;
  rating: number;
  helpful?: boolean | null;
  followUpNeeded?: boolean | null;
}) {
  const chatIds = await providerChatIds(input.providerUserId);
  if (!chatIds.length) return;
  const details = [
    `Rating: ${input.rating}/5`,
    input.helpful === false ? 'The member said the session needs improvement.' : '',
    input.followUpNeeded ? 'The member requested follow-up.' : ''
  ].filter(Boolean);
  await Promise.allSettled(
    chatIds.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.DOCTOR, {
        chat_id: chatId,
        text: `<b>New anonymous feedback</b>\n${details.join('\n')}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Open feedback', callback_data: 'provider:feedback' }]]
        }
      })
    )
  );
}
