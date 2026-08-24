import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import { adminUrl } from './telegram-bots.ui.js';

export async function notifyAdminsAboutDoctorSignup(doctor: {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  specialty: string;
  registrationNo?: string | null;
  requiresCredentialApproval?: boolean;
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
          '<b>New provider signup</b>',
          `Name: ${escapeHtml(doctor.name)}`,
          `Specialty: ${escapeHtml(doctor.specialty)}`,
          `Email: ${escapeHtml(doctor.email)}`,
          `Mobile: ${escapeHtml(doctor.mobile || 'Not provided')}`,
          `Registration: ${escapeHtml(doctor.registrationNo || 'Not provided')}`,
          `Provider: ${escapeHtml(doctor.id.slice(-8))}`,
          '',
          doctor.requiresCredentialApproval
            ? 'Credential review required. Verify the registration, then remove the provider suspension to enable sign-in and clinical tools.'
            : 'This provider can log in now. Review profile readiness and website visibility when needed.'
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Review providers', url: adminUrl('/doctors') }]]
        }
      })
    )
  );
}
