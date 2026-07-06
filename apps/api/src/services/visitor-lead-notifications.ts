import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { enabledNotificationChannels, notificationService } from './notification-service.js';

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

  const staff = await prisma.user.findMany({
    where: {
      role: { in: [Role.RECEPTIONIST, Role.PATIENT_COORDINATOR] },
      isActive: true
    },
    select: { id: true, name: true }
  });

  if (!staff.length) return;

  const who = lead.visitorName || lead.visitorPhone || 'Visitor';
  const source = SOURCE_LABELS[lead.source] ?? lead.source;
  const callback = lead.preferredCallbackTime ? ` Preferred: ${lead.preferredCallbackTime}.` : '';
  const body = `${who} via ${source}. ${lead.concern ?? 'Follow-up needed.'}${callback}`;

  const channels = enabledNotificationChannels.filter((c) => c === 'IN_APP');
  if (!channels.length) return;

  await notificationService.sendBatch(
    staff.flatMap((user) =>
      channels.map((channel) => ({
        eventType: 'VISITOR_LEAD_NEW' as const,
        channel,
        recipientId: user.id,
        recipientName: user.name,
        title: 'New visitor lead',
        body,
        metadata: { leadId: lead.id, source: lead.source, followUpStatus: lead.followUpStatus }
      }))
    )
  );
}
