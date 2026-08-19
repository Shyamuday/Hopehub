import { ConsultationStatus, ProviderPayoutStatus, TelegramBotKind } from '@prisma/client';
import { providerPublicReadiness } from '../doctor-capabilities.js';
import { prisma } from '../db.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { doctorUrl, webUrl } from './telegram-bots.ui.js';

function rupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function profileSlug(name: string, doctorId: string) {
  const safeName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safeName || 'provider'}-${doctorId}`;
}

async function providerDashboardData(userId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [doctor, activeSessions, services, feedback, earnings] = await Promise.all([
    prisma.doctor.findUnique({
      where: { userId },
      select: {
        id: true,
        isOnline: true,
        showOnWebsite: true,
        user: { select: { name: true } },
        mentalHealthProfile: { select: { acceptingNewUsers: true } }
      }
    }),
    prisma.consultation.count({
      where: {
        assignedDoctorId: userId,
        status: { in: [ConsultationStatus.ASSIGNED, ConsultationStatus.IN_PROGRESS] }
      }
    }),
    prisma.careTeamService.findMany({
      where: { mentalHealthProfile: { doctor: { userId } } },
      select: { isActive: true, approvalStatus: true }
    }),
    prisma.consultationFeedback.aggregate({
      where: {
        actorRole: 'CONSUMER',
        consultation: { is: { assignedDoctorId: userId, status: ConsultationStatus.COMPLETED } }
      },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.providerEarning.findMany({
      where: { doctorUserId: userId, createdAt: { gte: monthStart } },
      select: { providerEarningInPaise: true, payoutStatus: true }
    })
  ]);
  return { doctor, activeSessions, services, feedback, earnings };
}

export async function showProviderDashboard(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const data = await providerDashboardData(session.linkedUserId!);
  if (!data.doctor) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Provider profile not found. Complete provider onboarding first.',
      reply_markup: { inline_keyboard: [[{ text: 'Open provider portal', url: doctorUrl('/') }]] }
    });
    return;
  }
  const activeServices = data.services.filter((service) => service.isActive).length;
  const pendingApproval = data.services.filter(
    (service) => service.approvalStatus !== 'APPROVED'
  ).length;
  const monthEarned = data.earnings.reduce(
    (sum, earning) => sum + earning.providerEarningInPaise,
    0
  );
  const pendingPayout = data.earnings
    .filter((earning) => earning.payoutStatus === ProviderPayoutStatus.PENDING)
    .reduce((sum, earning) => sum + earning.providerEarningInPaise, 0);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Provider dashboard</b>',
      `Status: ${data.doctor.isOnline ? 'Online' : 'Offline'} · ${data.doctor.mentalHealthProfile?.acceptingNewUsers ? 'Accepting new people' : 'New sessions paused'}`,
      `Active sessions: ${data.activeSessions}`,
      `Services: ${activeServices} active${pendingApproval ? ` · ${pendingApproval} awaiting approval` : ''}`,
      `Feedback: ${data.feedback._count._all ? `${Number(data.feedback._avg.rating || 0).toFixed(1)}/5 from ${data.feedback._count._all}` : 'No feedback yet'}`,
      `This month: ${rupees(monthEarned)} · ${rupees(pendingPayout)} pending payout`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'My queue', callback_data: 'doctor:queue' },
          { text: 'Earnings', callback_data: 'provider:earnings' }
        ],
        [
          { text: 'Feedback', callback_data: 'provider:feedback' },
          { text: 'Readiness', callback_data: 'provider:readiness' }
        ],
        [{ text: 'Open provider portal', url: doctorUrl('/') }]
      ]
    }
  });
}

export async function showProviderFeedback(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const [summary, feedback] = await Promise.all([
    prisma.consultationFeedback.aggregate({
      where: {
        actorRole: 'CONSUMER',
        consultation: {
          is: { assignedDoctorId: session.linkedUserId!, status: ConsultationStatus.COMPLETED }
        }
      },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.consultationFeedback.findMany({
      where: {
        actorRole: 'CONSUMER',
        consultation: {
          is: { assignedDoctorId: session.linkedUserId!, status: ConsultationStatus.COMPLETED }
        }
      },
      select: {
        rating: true,
        helpful: true,
        followUpNeeded: true,
        tags: true,
        message: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
  ]);
  const items = feedback.length
    ? feedback
        .map((item, index) => {
          const tags = Array.isArray(item.tags)
            ? item.tags
                .filter((tag): tag is string => typeof tag === 'string')
                .slice(0, 3)
                .join(', ')
            : '';
          return `${index + 1}. <b>${item.rating}/5</b>${item.helpful === false ? ' · Needs improvement' : ''}${item.followUpNeeded ? ' · Follow-up requested' : ''}\n${escapeHtml(item.message || tags || 'No written note')}`;
        })
        .join('\n\n')
    : 'No consumer feedback has been received yet.';
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>Feedback</b>`,
      `Average: ${summary._count._all ? `${Number(summary._avg.rating || 0).toFixed(1)}/5` : '—'} · ${summary._count._all} response${summary._count._all === 1 ? '' : 's'}`,
      '',
      items
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open full feedback', url: doctorUrl('/feedback') }],
        [{ text: 'Dashboard', callback_data: 'provider:dashboard' }]
      ]
    }
  });
}

export async function showProviderEarnings(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const earnings = await prisma.providerEarning.findMany({
    where: { doctorUserId: session.linkedUserId!, createdAt: { gte: monthStart } },
    select: {
      providerEarningInPaise: true,
      platformFeeInPaise: true,
      payoutStatus: true,
      serviceTitle: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  const total = earnings.reduce((sum, item) => sum + item.providerEarningInPaise, 0);
  const pending = earnings
    .filter((item) => item.payoutStatus === ProviderPayoutStatus.PENDING)
    .reduce((sum, item) => sum + item.providerEarningInPaise, 0);
  const paid = earnings
    .filter((item) => item.payoutStatus === ProviderPayoutStatus.PAID)
    .reduce((sum, item) => sum + item.providerEarningInPaise, 0);
  const onHold = earnings
    .filter((item) => item.payoutStatus === ProviderPayoutStatus.HOLD)
    .reduce((sum, item) => sum + item.providerEarningInPaise, 0);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>My earnings this month</b>',
      `Earned: ${rupees(total)}`,
      `Pending: ${rupees(pending)} · Paid: ${rupees(paid)}${onHold ? ` · On hold: ${rupees(onHold)}` : ''}`,
      '',
      ...(earnings.length
        ? earnings.map(
            (item) =>
              `${escapeHtml(item.serviceTitle || 'Hope Hub session')} · ${rupees(item.providerEarningInPaise)} · ${item.payoutStatus}`
          )
        : ['No provider earnings recorded this month.'])
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open earnings details', url: doctorUrl('/payments') }],
        [{ text: 'Dashboard', callback_data: 'provider:dashboard' }]
      ]
    }
  });
}

export async function showProviderShareLinks(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.linkedUserId! },
    select: { id: true, showOnWebsite: true, user: { select: { name: true } } }
  });
  if (!doctor) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Provider profile not found.'
    });
    return;
  }
  const profileUrl = webUrl(`/p/${profileSlug(doctor.user.name, doctor.id)}`);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Share your Hope Hub profile</b>',
      doctor.showOnWebsite
        ? 'These links are ready to share.'
        : 'Your public profile is not yet published. Complete readiness requirements first.',
      '',
      escapeHtml(profileUrl)
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open profile', url: profileUrl },
          { text: 'Book a session', url: `${profileUrl}?intent=book` }
        ],
        [
          { text: 'Start chat', url: `${profileUrl}?intent=talk&mode=chat` },
          { text: 'Start voice call', url: `${profileUrl}?intent=talk&mode=voice` }
        ],
        [{ text: 'Start video call', url: `${profileUrl}?intent=talk&mode=video` }],
        [{ text: 'Manage share links', url: doctorUrl('/profile') }]
      ]
    }
  });
}

export async function showProviderReadiness(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const readiness = await providerPublicReadiness(session.linkedUserId!);
  const details = readiness.ready
    ? 'Your profile is ready to accept public bookings.'
    : readiness.blockers
        .map(
          (blocker, index) =>
            `${index + 1}. ${escapeHtml(blocker.label)}${blocker.action ? ` — ${escapeHtml(blocker.action)}` : ''}`
        )
        .join('\n');
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>Provider readiness</b>`, '', details].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open provider profile', url: doctorUrl('/profile') }],
        [{ text: 'Dashboard', callback_data: 'provider:dashboard' }]
      ]
    }
  });
}

function indiaDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00+05:30`);
}

function indiaHour(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23'
    }).format(now)
  );
}

/** Sends one concise morning overview after 9am IST to each linked provider. */
export async function runProviderDailyDigestScheduler(now = new Date()) {
  if ((process.env.TELEGRAM_PROVIDER_DAILY_DIGEST_ENABLED || 'true').toLowerCase() === 'false') {
    return { sent: 0 };
  }
  if (indiaHour(now) < 9) return { sent: 0 };
  const dayStart = indiaDayStart(now);
  const sessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.DOCTOR,
      linkedUserId: { not: null },
      linkedUser: { is: { isActive: true, role: 'DOCTOR' } }
    },
    select: { id: true, chatId: true, linkedUserId: true },
    take: 500
  });
  let sent = 0;
  for (const session of sessions) {
    if (!session.linkedUserId) continue;
    const alreadySent = await prisma.telegramBotEvent.findFirst({
      where: {
        sessionId: session.id,
        botKind: TelegramBotKind.DOCTOR,
        eventType: 'PROVIDER_DAILY_DIGEST_SENT',
        createdAt: { gte: dayStart }
      },
      select: { id: true }
    });
    if (alreadySent) continue;
    const data = await providerDashboardData(session.linkedUserId);
    if (!data.doctor) continue;
    const pendingPayout = data.earnings
      .filter((earning) => earning.payoutStatus === ProviderPayoutStatus.PENDING)
      .reduce((sum, earning) => sum + earning.providerEarningInPaise, 0);
    try {
      await sendTelegramMessage(TelegramBotKind.DOCTOR, {
        chat_id: session.chatId,
        text: [
          '<b>Good morning — your Hope Hub overview</b>',
          `You are ${data.doctor.isOnline ? 'online' : 'offline'} · ${data.activeSessions} active session${data.activeSessions === 1 ? '' : 's'}.`,
          `Pending payout this month: ${rupees(pendingPayout)}.`,
          'Open your dashboard to check availability, feedback, and your queue.'
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Open dashboard', callback_data: 'provider:dashboard' }]]
        }
      });
      await prisma.telegramBotEvent.create({
        data: {
          sessionId: session.id,
          botKind: TelegramBotKind.DOCTOR,
          chatId: session.chatId,
          eventType: 'PROVIDER_DAILY_DIGEST_SENT',
          payload: { dayStart: dayStart.toISOString() }
        }
      });
      sent += 1;
    } catch (error) {
      console.error('[telegram-provider] daily digest failed', error);
    }
  }
  return { sent };
}
