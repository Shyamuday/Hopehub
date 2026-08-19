import { ConsultationStatus, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { listPublicRewardCoupons } from './reward-rules.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { webUrl } from './telegram-bots.ui.js';

export async function showUserLiveSession(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const consultation = await prisma.consultation.findFirst({
    where: {
      patientId: session.linkedUserId!,
      status: { in: [ConsultationStatus.ASSIGNED, ConsultationStatus.IN_PROGRESS] }
    },
    select: {
      id: true,
      status: true,
      consultationMode: true,
      assignedDoctor: { select: { name: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  if (!consultation) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'There is no active Hope Hub session right now.',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'View my requests', callback_data: 'user:requests' }],
          [{ text: 'Get support', callback_data: 'user:support' }]
        ]
      }
    });
    return;
  }
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Your live Hope Hub session</b>',
      `Status: ${consultation.status === ConsultationStatus.IN_PROGRESS ? 'Connected' : 'Waiting for the provider'}`,
      consultation.assignedDoctor?.name
        ? `Care provider: ${escapeHtml(consultation.assignedDoctor.name)}`
        : 'A care provider will join shortly.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open live session', url: webUrl(`/live-session/${consultation.id}`) }],
        [{ text: 'My requests', callback_data: 'user:requests' }]
      ]
    }
  });
}

export async function showUserRewards(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const [referrals, coupons] = await Promise.all([
    prisma.referralFreeCallReward.findMany({
      where: { patientId: session.linkedUserId!, status: 'AVAILABLE' },
      select: { couponCode: true, earnedAt: true },
      orderBy: { earnedAt: 'desc' },
      take: 10
    }),
    listPublicRewardCoupons()
  ]);
  const featured = coupons
    .slice(0, 4)
    .map((coupon) => `${escapeHtml(coupon.code)} — ${escapeHtml(coupon.label || coupon.name)}`);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>My rewards and offers</b>',
      referrals.length
        ? `Free listener-call reward${referrals.length === 1 ? '' : 's'}: ${referrals.map((reward) => escapeHtml(reward.couponCode)).join(', ')}`
        : 'No referral free-call reward available yet.',
      '',
      ...(featured.length
        ? ['Available Hope Hub offers:', ...featured]
        : ['Offers are shown at checkout when available.']),
      '',
      'At checkout, Hope Hub automatically uses the best eligible offer. Offers do not stack unless shown there.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open booking', url: webUrl('/#live-connect') }],
        [{ text: 'My profile', url: webUrl('/profile') }]
      ]
    }
  });
}

export async function showUserFeedback(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const consultations = await prisma.consultation.findMany({
    where: {
      patientId: session.linkedUserId!,
      status: ConsultationStatus.COMPLETED,
      feedback: { none: { actorUserId: session.linkedUserId!, actorRole: 'CONSUMER' } }
    },
    select: { id: true, disease: { select: { name: true } }, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  if (!consultations.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'There are no completed sessions waiting for feedback. Thank you for sharing when a session is complete.',
      reply_markup: { inline_keyboard: [[{ text: 'My requests', callback_data: 'user:requests' }]] }
    });
    return;
  }
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: '<b>How was your session?</b>\nYour rating is linked to a verified session and helps Hope Hub improve care.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: consultations.map((consultation) => [
        {
          text: `Rate ${consultation.disease?.name || 'Hope Hub session'}`.slice(0, 48),
          callback_data: `user:feedback:${consultation.id}`
        }
      ])
    }
  });
}

export async function chooseUserFeedbackRating(
  kind: TelegramBotKind,
  session: TelegramSession,
  consultationId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const exists = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      patientId: session.linkedUserId!,
      status: ConsultationStatus.COMPLETED
    },
    select: { id: true }
  });
  if (!exists) return showUserFeedback(kind, session);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Choose a rating for this completed session.',
    reply_markup: {
      inline_keyboard: [
        [1, 2, 3, 4, 5].map((rating) => ({
          text: `${rating}/5`,
          callback_data: `user:feedback:rate:${consultationId}:${rating}`
        }))
      ]
    }
  });
}

export async function saveUserFeedbackRating(
  kind: TelegramBotKind,
  session: TelegramSession,
  consultationId: string,
  rating: number
) {
  if (!(await requireLinked(kind, session))) return;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return showUserFeedback(kind, session);
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      patientId: session.linkedUserId!,
      status: ConsultationStatus.COMPLETED
    },
    select: { id: true, assignedDoctorId: true }
  });
  if (!consultation) return showUserFeedback(kind, session);
  await prisma.consultationFeedback.upsert({
    where: { consultationId_actorUserId: { consultationId, actorUserId: session.linkedUserId! } },
    create: {
      consultationId,
      actorUserId: session.linkedUserId!,
      actorRole: 'CONSUMER',
      rating,
      tags: []
    },
    update: { rating }
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Thank you. Your ${rating}/5 rating was saved. You can add more detail later from your Hope Hub dashboard.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open dashboard', url: webUrl('/dashboard') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

export async function showUrgentSupport(kind: TelegramBotKind, session: TelegramSession) {
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>If you are in immediate danger</b>',
      'Please call your local emergency number now or go to the nearest emergency department. If possible, contact a trusted person who can stay with you.',
      '',
      'Hope Hub can help you request non-emergency emotional support, but Telegram is not an emergency service.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Request Hope Hub support', callback_data: 'user:support' }],
        [{ text: 'Open safety support', url: webUrl('/#live-connect') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}
