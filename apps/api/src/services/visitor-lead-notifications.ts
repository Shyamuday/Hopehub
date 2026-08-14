import { Role, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { enabledNotificationChannels, notificationService } from './notification-service.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import { adminUrl } from './telegram-bots.ui.js';

const SOURCE_LABELS: Record<string, string> = {
  CHAT_BOT: 'Website chat',
  HOME_BOOKING: 'Home booking',
  PROMO_POPUP: 'Promo popup'
};

export async function notifyStaffOnVisitorLead(lead: {
  id: string;
  source: string;
  followUpStatus: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  concern?: string | null;
  preferredCallbackTime?: string | null;
}) {
  if (!['NEW', 'NEEDS_CALLBACK'].includes(lead.followUpStatus)) {
    return;
  }

  const [staff, adminSessions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: [Role.RECEPTIONIST, Role.PATIENT_COORDINATOR] },
        isActive: true
      },
      select: { id: true, name: true }
    }),
    prisma.telegramBotSession.findMany({
      where: {
        botKind: TelegramBotKind.ADMIN,
        linkedUser: { role: Role.ADMIN, isActive: true }
      },
      select: { chatId: true }
    })
  ]);

  const who = lead.visitorName || lead.visitorPhone || 'Visitor';
  const source = SOURCE_LABELS[lead.source] ?? lead.source;
  const callback = lead.preferredCallbackTime ? ` Preferred: ${lead.preferredCallbackTime}.` : '';
  const body = `${who} via ${source}. ${lead.concern ?? 'Follow-up needed.'}${callback}`;

  const channels = enabledNotificationChannels.filter((c) => c === 'IN_APP');
  const isCommunityAdminApplication = lead.concern?.startsWith('Application: Telegram group admin');
  const concernPreview = (lead.concern || 'Follow-up needed.').slice(0, 700);
  const telegramTitle = isCommunityAdminApplication
    ? 'New Hope Hub community admin application'
    : 'New website lead';

  await Promise.allSettled([
    ...(staff.length && channels.length
      ? [
          notificationService.sendBatch(
            staff.flatMap((user) =>
              channels.map((channel) => ({
                eventType: 'VISITOR_LEAD_NEW' as const,
                channel,
                recipientId: user.id,
                recipientName: user.name,
                title: 'New visitor lead',
                body,
                metadata: {
                  leadId: lead.id,
                  source: lead.source,
                  followUpStatus: lead.followUpStatus
                }
              }))
            )
          )
        ]
      : []),
    ...adminSessions.map((session) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: session.chatId,
        text: [
          `<b>${telegramTitle}</b>`,
          `Name: ${escapeHtml(who)}`,
          `Source: ${escapeHtml(source)}`,
          `Status: ${escapeHtml(lead.followUpStatus)}`,
          callback ? `Callback:${escapeHtml(callback)}` : '',
          '',
          escapeHtml(concernPreview),
          '',
          `Lead: ${escapeHtml(lead.id.slice(-8))}`
        ]
          .filter(Boolean)
          .join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Acknowledge follow-up', callback_data: `lead:followup:${lead.id}` }],
            [
              {
                text: 'Open lead in admin',
                url: adminUrl(`/chat-inbox?leadId=${encodeURIComponent(lead.id)}`)
              }
            ]
          ]
        }
      })
    )
  ]);
}
