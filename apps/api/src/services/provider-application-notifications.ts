import { CounsellorApplicationTrack, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import { adminUrl } from './telegram-bots.ui.js';

const providerTrackLabels: Record<CounsellorApplicationTrack, string> = {
  PROFESSIONAL_PSYCHOLOGIST: 'Professional psychologist',
  PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student volunteer',
  PEER_SUPPORT_VOLUNTEER: 'Peer support volunteer'
};

export async function notifyAdminsAboutProviderApplication(application: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  applicationTrack: CounsellorApplicationTrack;
}) {
  const adminSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.ADMIN,
      linkedUser: { role: 'ADMIN', isActive: true }
    },
    select: { chatId: true }
  });

  if (!adminSessions.length) return;

  await Promise.allSettled(
    adminSessions.map((adminSession) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: adminSession.chatId,
        text: [
          '<b>New care team application</b>',
          `Name: ${escapeHtml(application.fullName)}`,
          `Role: ${escapeHtml(providerTrackLabels[application.applicationTrack])}`,
          `Email: ${escapeHtml(application.email)}`,
          `Phone: ${escapeHtml(application.phone)}`,
          `Application: ${escapeHtml(application.id.slice(-8))}`
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open contributors', url: adminUrl('/counsellor-applications') }]
          ]
        }
      })
    )
  );
}
