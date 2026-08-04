import { ConsultationStatus, Prisma, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { adminUrl } from './telegram-bots.ui.js';

async function consultationQualitySummary(days: number) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const baseWhere: Prisma.ConsultationWhereInput = { updatedAt: { gte: from } };
  const jsonOutcome = (outcome: string): Prisma.ConsultationWhereInput => ({
    ...baseWhere,
    pricingSnapshot: { path: ['sessionOutcome', 'outcome'], equals: outcome }
  });
  const jsonFlag = (
    key: 'packageRestored' | 'payoutAction',
    value: boolean | string
  ): Prisma.ConsultationWhereInput => ({
    ...baseWhere,
    pricingSnapshot: { path: ['sessionOutcome', key], equals: value }
  });

  const [
    totalClosed,
    completed,
    userMissed,
    providerNoShow,
    rescheduleNeeded,
    packageRestored,
    payoutHeld,
    cancelled
  ] = await Promise.all([
    prisma.consultation.count({
      where: {
        ...baseWhere,
        OR: [
          { status: ConsultationStatus.COMPLETED },
          { status: ConsultationStatus.CANCELLED },
          { pricingSnapshot: { path: ['sessionOutcome', 'outcome'], not: Prisma.JsonNull } }
        ]
      }
    }),
    prisma.consultation.count({ where: jsonOutcome('COMPLETED') }),
    prisma.consultation.count({ where: jsonOutcome('USER_MISSED') }),
    prisma.consultation.count({ where: jsonOutcome('PROVIDER_NO_SHOW') }),
    prisma.consultation.count({ where: jsonOutcome('RESCHEDULE_NEEDED') }),
    prisma.consultation.count({ where: jsonFlag('packageRestored', true) }),
    prisma.consultation.count({ where: jsonFlag('payoutAction', 'HOLD') }),
    prisma.consultation.count({ where: { ...baseWhere, status: ConsultationStatus.CANCELLED } })
  ]);

  const issueCount = userMissed + providerNoShow + rescheduleNeeded;
  const issueRate = totalClosed ? Math.round((issueCount / totalClosed) * 100) : 0;
  return {
    totalClosed,
    completed,
    userMissed,
    providerNoShow,
    rescheduleNeeded,
    packageRestored,
    payoutHeld,
    cancelled,
    issueCount,
    issueRate
  };
}

export async function adminQualitySummary(
  kind: TelegramBotKind,
  session: TelegramSession,
  days = 30
) {
  if (!(await requireLinked(kind, session))) return;
  const safeDays = Math.max(1, Math.min(365, days));
  const summary = await consultationQualitySummary(safeDays);

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>Session quality · last ${safeDays} days</b>`,
      `Closed sessions: ${summary.totalClosed}`,
      `Completed: ${summary.completed}`,
      `Issue rate: ${summary.issueRate}% (${summary.issueCount})`,
      '',
      `User missed: ${summary.userMissed}`,
      `Provider no-show: ${summary.providerNoShow}`,
      `Reschedule needed: ${summary.rescheduleNeeded}`,
      '',
      `Package restored: ${summary.packageRestored}`,
      `Payout held: ${summary.payoutHeld}`,
      `Cancelled total: ${summary.cancelled}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '7d', callback_data: 'admin:quality:7' },
          { text: '30d', callback_data: 'admin:quality:30' },
          { text: '90d', callback_data: 'admin:quality:90' }
        ],
        [{ text: 'Open consultations', url: adminUrl('/consultations') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}
