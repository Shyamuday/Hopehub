import { ConsultationStatus, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { applySessionOutcome, type SessionOutcomeStatus } from './consultation-outcomes.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { doctorUrl } from './telegram-bots.ui.js';

const outcomeLabels: Record<SessionOutcomeStatus, string> = {
  COMPLETED: 'Completed',
  USER_MISSED: 'User missed',
  PROVIDER_NO_SHOW: 'Provider no-show',
  RESCHEDULE_NEEDED: 'Reschedule needed'
};

function shortId(id: string) {
  return id.slice(-6);
}

export async function showDoctorOutcomeSessions(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  const consultations = await prisma.consultation.findMany({
    where: {
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: {
      patient: { select: { name: true, patientCode: true } },
      disease: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 8
  });

  if (!consultations.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No open sessions to close right now.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Open appointments', url: doctorUrl('/appointments') }]]
      }
    });
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Close session with outcome</b>',
      'Choose the session first. Keep clinical/private notes in the doctor portal.',
      '',
      ...consultations.map(
        (item, index) =>
          `${index + 1}. ${escapeHtml(item.patient.name)} · ${escapeHtml(item.disease.name)} · ${escapeHtml(item.status)} · ${shortId(item.id)}`
      )
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...consultations.map((item) => [
          {
            text: `Close ${escapeHtml(item.patient.name)} · ${shortId(item.id)}`,
            callback_data: `doctor:outcomes:${item.id}`
          }
        ]),
        [{ text: 'Open appointments', url: doctorUrl('/appointments') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

export async function showDoctorOutcomeOptions(
  kind: TelegramBotKind,
  session: TelegramSession,
  consultationId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: {
      patient: { select: { name: true, patientCode: true } },
      disease: { select: { name: true } }
    }
  });

  if (!consultation) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'This session was not found or is already closed.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Refresh sessions', callback_data: 'doctor:outcomes' }]]
      }
    });
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Select session outcome</b>',
      `User: ${escapeHtml(consultation.patient.name)} (${escapeHtml(consultation.patient.patientCode || '-')})`,
      `Session: ${escapeHtml(consultation.disease.name)}`,
      '',
      'Package restore/payout hold is automatic for provider no-show and reschedule-needed outcomes.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: outcomeLabels.COMPLETED,
            callback_data: `doctor:outcome:COMPLETED:${consultation.id}`
          },
          {
            text: outcomeLabels.USER_MISSED,
            callback_data: `doctor:outcome:USER_MISSED:${consultation.id}`
          }
        ],
        [
          {
            text: outcomeLabels.PROVIDER_NO_SHOW,
            callback_data: `doctor:outcome:PROVIDER_NO_SHOW:${consultation.id}`
          }
        ],
        [
          {
            text: outcomeLabels.RESCHEDULE_NEEDED,
            callback_data: `doctor:outcome:RESCHEDULE_NEEDED:${consultation.id}`
          }
        ],
        [{ text: 'Back to sessions', callback_data: 'doctor:outcomes' }]
      ]
    }
  });
}

export async function applyDoctorSessionOutcome(
  kind: TelegramBotKind,
  session: TelegramSession,
  outcome: SessionOutcomeStatus,
  consultationId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: {
      patient: { select: { name: true } },
      disease: { select: { name: true } }
    }
  });

  if (!consultation) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'This session was not found or is already closed.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Refresh sessions', callback_data: 'doctor:outcomes' }]]
      }
    });
    return;
  }

  const result = await applySessionOutcome({
    consultationId: consultation.id,
    actorId: session.linkedUserId!,
    actorRole: 'DOCTOR',
    outcome,
    privateNote: 'Closed from Telegram doctor bot.',
    userSummary:
      outcome === 'COMPLETED'
        ? 'Session completed.'
        : outcome === 'USER_MISSED'
          ? 'User missed the session.'
          : outcome === 'PROVIDER_NO_SHOW'
            ? 'Provider could not attend the session.'
            : 'Session needs rescheduling.',
    recommendedNextStep:
      outcome === 'COMPLETED'
        ? 'Continue the plan or book a follow-up if needed.'
        : 'Please coordinate a new suitable time.',
    restorePackageSession: outcome === 'PROVIDER_NO_SHOW' || outcome === 'RESCHEDULE_NEEDED',
    holdProviderPayout: outcome === 'PROVIDER_NO_SHOW' || outcome === 'RESCHEDULE_NEEDED'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Session outcome saved</b>',
      `Outcome: ${escapeHtml(outcomeLabels[outcome])}`,
      `User: ${escapeHtml(consultation.patient.name)}`,
      `Session: ${escapeHtml(consultation.disease.name)}`,
      result?.sessionOutcome?.packageRestored ? 'Package session restored.' : '',
      result?.sessionOutcome?.payoutAction === 'HOLD' ? 'Provider payout held.' : ''
    ]
      .filter(Boolean)
      .join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Close another session', callback_data: 'doctor:outcomes' }],
        [{ text: 'Open appointments', url: doctorUrl('/appointments') }]
      ]
    }
  });
}
