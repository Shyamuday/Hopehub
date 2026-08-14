import {
  ConsultationStatus,
  CounsellorApplicationStatus,
  LivePresenceStatus,
  TelegramBotKind
} from '@prisma/client';
import { prisma } from '../db.js';
import { setDoctorLiveStatus } from './online-doctor-presence.js';
import {
  getTelegramWebhookInfo,
  sendTelegramMessage,
  telegramBotStatus
} from './telegram-bots.client.js';
import { communityBotStatus, getCommunityWebhookInfo } from './telegram-community-bots.client.js';
import { getGroupHelpWebhookInfo, groupHelpBotStatus } from './telegram-group-help.client.js';
import { requireLinked } from './telegram-bots.account.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { adminUrl, doctorUrl } from './telegram-bots.ui.js';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function rupees(amountInPaise: number | null | undefined) {
  return `₹${Math.round(Number(amountInPaise || 0) / 100)}`;
}

function queueMoneyLine(item: {
  pricingSnapshot?: unknown;
  payment?: {
    amountInPaise?: number | null;
    refundedAmountInPaise?: number | null;
    lineItems?: unknown;
    providerEarning?: {
      payoutStatus?: string | null;
      providerEarningInPaise?: number | null;
    } | null;
  } | null;
}) {
  const snapshot = asRecord(item.pricingSnapshot);
  const lineItems = asRecord(item.payment?.lineItems);
  const label = String(snapshot['careTeamPricingLabel'] || lineItems['careTeamPricingLabel'] || '');
  const billableMinutes = Number(lineItems['careTeamBillableMinutes'] || 0);
  const balanceDue = Number(snapshot['balanceDueInPaise'] ?? lineItems['balanceDueInPaise'] ?? 0);
  const refunded = Number(item.payment?.refundedAmountInPaise || 0);
  const payout = item.payment?.providerEarning;
  return [
    label,
    billableMinutes ? `${billableMinutes} billable min` : '',
    balanceDue ? `balance ${rupees(balanceDue)}` : '',
    refunded ? `refunded ${rupees(refunded)}` : '',
    payout
      ? `payout ${payout.payoutStatus || 'PENDING'} ${rupees(payout.providerEarningInPaise)}`
      : ''
  ]
    .filter(Boolean)
    .join(' · ');
}

export async function doctorQueue(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const consultations = await prisma.consultation.findMany({
    where: {
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: {
      patient: { select: { name: true, patientCode: true } },
      disease: { select: { name: true } },
      payment: {
        include: {
          providerEarning: {
            select: { payoutStatus: true, providerEarningInPaise: true }
          }
        }
      }
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
      .map((item, index) => {
        const money = queueMoneyLine(item);
        return `${index + 1}. ${escapeHtml(item.patient.name)} (${escapeHtml(item.patient.patientCode || '-')}) - ${escapeHtml(item.disease.name)}${money ? `\n   ${escapeHtml(money)}` : ''}`;
      })
      .join('\n') || 'Your queue is clear.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>Provider queue</b>`, countText, '', rows].join('\n'),
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
      ? `Provider status updated: ${online ? 'ONLINE' : 'OFFLINE'}`
      : 'Provider profile was not found.'
  });
}

export async function adminSummary(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const [
    newLeads,
    callbackLeads,
    communityAdminApplications,
    newContributors,
    shortlistedContributors,
    openConsultations
  ] = await Promise.all([
    prisma.websiteLead.count({ where: { followUpStatus: 'NEW' } }),
    prisma.websiteLead.count({ where: { followUpStatus: 'NEEDS_CALLBACK' } }),
    prisma.websiteLead.count({
      where: {
        concern: { startsWith: 'Application: Telegram group admin' },
        followUpStatus: { in: ['NEW', 'NEEDS_CALLBACK'] }
      }
    }),
    prisma.counsellorApplication.count({ where: { status: CounsellorApplicationStatus.NEW } }),
    prisma.counsellorApplication.count({
      where: { status: CounsellorApplicationStatus.SHORTLISTED }
    }),
    prisma.consultation.count({
      where: {
        status: {
          in: [ConsultationStatus.PAID, ConsultationStatus.ASSIGNED, ConsultationStatus.IN_PROGRESS]
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
      `Community admin applications: ${communityAdminApplications}`,
      `New contributor applications: ${newContributors}`,
      `Shortlisted contributors: ${shortlistedContributors}`,
      `Open consultations: ${openConsultations}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open leads', url: adminUrl('/chat-inbox') },
          { text: 'Contributors', url: adminUrl('/counsellor-applications') }
        ],
        [{ text: 'Refresh summary', callback_data: 'admin:summary' }]
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
      .map((lead, index) => {
        const firstLine = (lead.concern || 'No concern added').split('\n')[0].slice(0, 120);
        const contact = lead.visitorPhone || lead.visitorEmail || 'No contact shared';
        return [
          `<b>${index + 1}. ${escapeHtml(lead.visitorName || 'Visitor')}</b>`,
          `${escapeHtml(lead.followUpStatus)} · ${escapeHtml(contact)}`,
          escapeHtml(firstLine),
          `ID: ${escapeHtml(lead.id.slice(-8))}`
        ].join('\n');
      })
      .join('\n') || 'No fresh leads.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Latest leads</b>\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...leads.slice(0, 3).map((lead) => [
          {
            text: `Review ${lead.visitorName || lead.id.slice(-8)}`.slice(0, 40),
            url: adminUrl(`/chat-inbox?leadId=${encodeURIComponent(lead.id)}`)
          }
        ]),
        [
          { text: 'Refresh leads', callback_data: 'admin:leads' },
          { text: 'Open all', url: adminUrl('/chat-inbox') }
        ]
      ]
    }
  });
}

type TelegramWebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
};

type BotHealthCheck = {
  name: string;
  configured: boolean;
  external?: boolean;
  inspect: () => Promise<TelegramWebhookInfo>;
};

function webhookHealthLines(
  check: BotHealthCheck,
  result: { info?: TelegramWebhookInfo; error?: string }
) {
  if (!check.configured) return [`❌ <b>${escapeHtml(check.name)}</b>`, 'Token is not configured.'];
  if (result.error)
    return [
      `⚠️ <b>${escapeHtml(check.name)}</b>`,
      `Telegram check failed: ${escapeHtml(result.error)}`
    ];

  const info = result.info || {};
  const hasWebhook = Boolean(info.url);
  const pending = Number(info.pending_update_count || 0);
  const healthyRuntime = hasWebhook || check.external;
  const status = healthyRuntime ? '✅' : '⚠️';
  const runtime = hasWebhook
    ? 'Webhook active'
    : check.external
      ? 'Externally managed / polling'
      : 'Webhook missing';
  const errorTime = info.last_error_date
    ? new Date(info.last_error_date * 1000).toLocaleString('en-IN')
    : '';

  return [
    `${status} <b>${escapeHtml(check.name)}</b>`,
    `${runtime} · Pending updates: ${pending}`,
    info.last_error_message
      ? `Last error${errorTime ? ` (${escapeHtml(errorTime)})` : ''}: ${escapeHtml(info.last_error_message)}`
      : ''
  ].filter(Boolean);
}

export async function adminBotHealth(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  const primaryChecks: BotHealthCheck[] = telegramBotStatus().map((bot) => ({
    name: bot.name,
    configured: bot.configured,
    inspect: async () => (await getTelegramWebhookInfo(bot.kind)) as TelegramWebhookInfo
  }));
  const communityChecks: BotHealthCheck[] = communityBotStatus().map((bot) => ({
    name: bot.name,
    configured: bot.configured,
    inspect: async () => (await getCommunityWebhookInfo(bot.slug)) as TelegramWebhookInfo
  }));
  const groupHelp = groupHelpBotStatus();
  const checks: BotHealthCheck[] = [
    ...primaryChecks,
    ...communityChecks,
    {
      name: groupHelp.name,
      configured: groupHelp.configured,
      external: true,
      inspect: async () => (await getGroupHelpWebhookInfo()) as TelegramWebhookInfo
    }
  ];

  const results = await Promise.all(
    checks.map(async (check) => {
      if (!check.configured) return {};
      try {
        return { info: await check.inspect() };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown Telegram API error' };
      }
    })
  );
  const sections = checks.flatMap((check, index) => [
    ...webhookHealthLines(check, results[index]),
    ''
  ]);

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Hope Hub bot health</b>',
      'Tokens are never displayed.',
      '',
      ...sections,
      'Pending updates should normally stay near zero.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Refresh bot health', callback_data: 'admin:bot_health' }],
        [{ text: 'Open bot settings', url: adminUrl('/telegram-bots') }]
      ]
    }
  });
}

export async function adminCommunityAdminApplications(
  kind: TelegramBotKind,
  session: TelegramSession
) {
  if (!(await requireLinked(kind, session))) return;
  const applications = await prisma.websiteLead.findMany({
    where: {
      concern: { startsWith: 'Application: Telegram group admin' },
      followUpStatus: { notIn: ['CLOSED', 'NOT_INTERESTED'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  const rows =
    applications
      .map((application, index) => {
        const telegram = application.concern?.match(/^Telegram:\s*(.+)$/m)?.[1] || 'Not shared';
        const availability =
          application.concern?.match(/^Availability:\s*(.+)$/m)?.[1] || 'Not shared';
        return [
          `<b>${index + 1}. ${escapeHtml(application.visitorName || 'Applicant')}</b>`,
          `${escapeHtml(telegram)} · ${escapeHtml(availability)}`,
          `Status: ${escapeHtml(application.followUpStatus)}`,
          `ID: ${escapeHtml(application.id.slice(-8))}`
        ].join('\n');
      })
      .join('\n\n') || 'No open community admin applications.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Hope Hub community admin applications</b>\n\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...applications.slice(0, 4).map((application) => [
          {
            text: `Review ${application.visitorName || application.id.slice(-8)}`.slice(0, 40),
            url: adminUrl(`/chat-inbox?leadId=${encodeURIComponent(application.id)}`)
          }
        ]),
        [{ text: 'Refresh applications', callback_data: 'admin:community_admins' }]
      ]
    }
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
