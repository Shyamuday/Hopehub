import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendEmail } from './mail.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import { doctorUrl } from './telegram-bots.ui.js';

export async function notifyProviderApprovalStatus(input: {
  userId: string;
  status: 'APPROVED' | 'CHANGES_REQUESTED';
  note?: string | null;
}) {
  const provider = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      name: true,
      email: true,
      telegramBotSessions: {
        where: { botKind: TelegramBotKind.DOCTOR },
        select: { chatId: true }
      }
    }
  });
  if (!provider) return;
  const approved = input.status === 'APPROVED';
  const title = approved ? 'Your provider profile is approved' : 'Your profile needs changes';
  const detail = approved
    ? 'Your homeopathy provider profile is now active and can be shown to users.'
    : input.note || 'Please review the requested changes and resubmit your completed profile.';
  await Promise.allSettled([
    ...provider.telegramBotSessions.map((session) =>
      sendTelegramMessage(TelegramBotKind.DOCTOR, {
        chat_id: session.chatId,
        text: `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(detail)}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open provider profile', url: doctorUrl('/profile'), style: 'success' }]
          ]
        }
      })
    ),
    ...(provider.email
      ? [
          sendEmail({
            to: provider.email,
            subject: `Hope Hub: ${title}`,
            text: `Hi ${provider.name},\n\n${detail}\n\nOpen your profile: ${doctorUrl('/profile')}`
          })
        ]
      : [])
  ]);
}
