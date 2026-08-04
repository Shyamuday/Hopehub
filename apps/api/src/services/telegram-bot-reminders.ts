import { Prisma, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { webUrl } from './telegram-bots.ui.js';
import { escapeHtml, metadataOf } from './telegram-bots.helpers.js';

const REMINDER_TIME_ZONE = process.env.TELEGRAM_REMINDER_TIME_ZONE || 'Asia/Kolkata';

export const telegramReminderSweepEnabled =
  (process.env.TELEGRAM_REMINDER_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';

export const telegramReminderSweepIntervalMs = Math.max(
  60_000,
  Number(process.env.TELEGRAM_REMINDER_SWEEP_INTERVAL_MS || 10 * 60_000)
);

function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REMINDER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    dateKey: `${parts['year']}-${parts['month']}-${parts['day']}`,
    hour: Number(parts['hour'] || '0')
  };
}

function todayPlanDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function alreadySent(sessionId: string, eventType: string, dateKey: string) {
  const existing = await prisma.telegramBotEvent.findFirst({
    where: {
      sessionId,
      eventType,
      payload: {
        path: ['dateKey'],
        equals: dateKey
      }
    },
    select: { id: true }
  });
  return Boolean(existing);
}

async function markSent(
  session: { id: string; chatId: string },
  eventType: string,
  payload: Record<string, unknown>
) {
  await prisma.telegramBotEvent.create({
    data: {
      sessionId: session.id,
      botKind: TelegramBotKind.USER,
      chatId: session.chatId,
      eventType,
      payload: payload as Prisma.InputJsonValue
    }
  });
}

export async function runTelegramReminderSchedulers(now = new Date()) {
  if (!telegramReminderSweepEnabled) return;

  const { dateKey, hour } = localParts(now);
  const isMorningWindow = hour >= 8 && hour < 11;
  const isEveningWindow = hour >= 19 && hour < 22;
  if (!isMorningWindow && !isEveningWindow) return;

  const sessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.USER,
      linkedUser: { isActive: true, role: 'PATIENT' }
    },
    select: {
      id: true,
      chatId: true,
      metadata: true,
      linkedUserId: true,
      linkedUser: { select: { name: true } }
    },
    take: 200
  });

  const optedInSessions = sessions.filter(
    (session) => metadataOf(session).settings?.dailyReminders === true && session.linkedUserId
  );
  if (!optedInSessions.length) return;

  const planDate = todayPlanDate(dateKey);
  await Promise.allSettled(
    optedInSessions.map(async (session) => {
      const plan = await prisma.patientDailyPlan.findUnique({
        where: { userId_planDate: { userId: session.linkedUserId!, planDate } },
        select: {
          id: true,
          title: true,
          reviewedAt: true,
          tasks: { select: { id: true, completed: true } }
        }
      });

      if (isMorningWindow) {
        const eventType = 'telegram_daily_plan_reminder';
        if (await alreadySent(session.id, eventType, dateKey)) return;
        const taskLine = plan?.tasks.length
          ? `${plan.tasks.filter((task) => task.completed).length}/${plan.tasks.length} tasks completed`
          : 'No tasks added yet';
        await sendTelegramMessage(TelegramBotKind.USER, {
          chat_id: session.chatId,
          text: [
            `<b>Good morning${session.linkedUser?.name ? `, ${escapeHtml(session.linkedUser.name)}` : ''}</b>`,
            plan
              ? `Your Hope Hub plan is ready: ${escapeHtml(plan.title)} (${taskLine}).`
              : 'Create a tiny plan for today — one grounding step is enough.',
            '',
            'Want to set the tone for today?'
          ].join('\n'),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: plan ? 'View today plan' : 'Create today plan', callback_data: 'user:plan' }
              ],
              [{ text: 'Open profile', url: webUrl('/profile') }],
              [{ text: 'Settings', callback_data: 'common:settings' }]
            ]
          }
        });
        await markSent(session, eventType, { dateKey, planId: plan?.id ?? null });
        return;
      }

      if (isEveningWindow) {
        const eventType = 'telegram_daily_review_reminder';
        if (!plan || plan.reviewedAt || (await alreadySent(session.id, eventType, dateKey))) return;
        const totalTasks = plan.tasks.length;
        const completedTasks = plan.tasks.filter((task) => task.completed).length;
        await sendTelegramMessage(TelegramBotKind.USER, {
          chat_id: session.chatId,
          text: [
            '<b>Evening check-in</b>',
            `Today plan: ${escapeHtml(plan.title)}`,
            totalTasks ? `Tasks: ${completedTasks}/${totalTasks} completed` : 'No tasks added yet',
            '',
            'Review your day in one tap or add a short note.'
          ].join('\n'),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Review day', callback_data: 'user:review' }],
              [{ text: 'View plan', callback_data: 'user:plan' }],
              [{ text: 'Settings', callback_data: 'common:settings' }]
            ]
          }
        });
        await markSent(session, eventType, { dateKey, planId: plan.id });
      }
    })
  );
}
