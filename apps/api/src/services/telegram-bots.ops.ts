import {
  ConsultationStatus,
  CounsellorApplicationStatus,
  LivePresenceStatus,
  TelegramBotKind
} from '@prisma/client';
import { prisma } from '../db.js';
import { setDoctorLiveStatus } from './online-doctor-presence.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { requireLinked } from './telegram-bots.account.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { adminUrl, doctorUrl } from './telegram-bots.ui.js';

export async function doctorQueue(kind: TelegramBotKind, session: TelegramSession) {
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
    take: 5
  });
  const counts = await prisma.consultation.groupBy({
    by: ['status'],
    where: {
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    _count: { _all: true }
  });
  const countText =
    counts.map((item) => `${item.status}: ${item._count._all}`).join('\n') || 'No open cases.';
  const rows =
    consultations
      .map(
        (item, index) =>
          `${index + 1}. ${escapeHtml(item.patient.name)} (${escapeHtml(item.patient.patientCode || '-')}) - ${escapeHtml(item.disease.name)}`
      )
      .join('\n') || 'Your queue is clear.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>Doctor queue</b>`, countText, '', rows].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Open appointments', url: doctorUrl('/appointments') }]]
    }
  });
}

export async function setDoctorPresence(
  kind: TelegramBotKind,
  session: TelegramSession,
  online: boolean
) {
  if (!(await requireLinked(kind, session))) return;
  const profile = await setDoctorLiveStatus(session.linkedUserId!, {
    liveStatus: online ? LivePresenceStatus.ONLINE : LivePresenceStatus.OFFLINE
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: profile
      ? `Doctor status updated: ${online ? 'ONLINE' : 'OFFLINE'}`
      : 'Doctor profile was not found.'
  });
}

export async function adminSummary(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const [newLeads, callbackLeads, newContributors, shortlistedContributors, openConsultations] =
    await Promise.all([
      prisma.websiteLead.count({ where: { followUpStatus: 'NEW' } }),
      prisma.websiteLead.count({ where: { followUpStatus: 'NEEDS_CALLBACK' } }),
      prisma.counsellorApplication.count({ where: { status: CounsellorApplicationStatus.NEW } }),
      prisma.counsellorApplication.count({
        where: { status: CounsellorApplicationStatus.SHORTLISTED }
      }),
      prisma.consultation.count({
        where: {
          status: {
            in: [
              ConsultationStatus.PAID,
              ConsultationStatus.ASSIGNED,
              ConsultationStatus.IN_PROGRESS
            ]
          }
        }
      })
    ]);

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Hope Hub ops summary</b>',
      `New leads: ${newLeads}`,
      `Needs callback: ${callbackLeads}`,
      `New contributor applications: ${newContributors}`,
      `Shortlisted contributors: ${shortlistedContributors}`,
      `Open consultations: ${openConsultations}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open leads', url: adminUrl('/visitor-leads') },
          { text: 'Contributors', url: adminUrl('/counsellor-applications') }
        ]
      ]
    }
  });
}

export async function adminLeads(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const leads = await prisma.websiteLead.findMany({
    where: { followUpStatus: { in: ['NEW', 'NEEDS_CALLBACK'] } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const rows =
    leads
      .map(
        (lead, index) =>
          `${index + 1}. ${escapeHtml(lead.visitorName || 'Visitor')} - ${escapeHtml(lead.concern || 'No concern added')}`
      )
      .join('\n') || 'No fresh leads.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Latest leads</b>\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: 'Open leads', url: adminUrl('/visitor-leads') }]] }
  });
}

export async function adminContributors(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const applications = await prisma.counsellorApplication.findMany({
    where: {
      status: {
        in: [
          CounsellorApplicationStatus.NEW,
          CounsellorApplicationStatus.REVIEWING,
          CounsellorApplicationStatus.SHORTLISTED
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const rows =
    applications
      .map(
        (app, index) =>
          `${index + 1}. ${escapeHtml(app.fullName)} - ${app.applicationTrack} - ${app.status}`
      )
      .join('\n') || 'No pending contributor applications.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Contributor applications</b>\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Open contributors', url: adminUrl('/counsellor-applications') }]]
    }
  });
}
