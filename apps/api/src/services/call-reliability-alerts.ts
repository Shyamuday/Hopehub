import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';

const ALERT_WINDOW_MS = 30 * 60_000;
const ALERT_COOLDOWN_MS = 60 * 60_000;
const MINIMUM_ATTEMPTS = 5;
const MINIMUM_INFRA_FAILURES = 3;
const INFRA_FAILURE_REASONS = new Set([
  'CONNECTION_FAILED',
  'ICE_FAILED',
  'MEDIA_TIMEOUT',
  'RECONNECT_TIMEOUT',
  'STALE_CONNECTED_CLEANUP'
]);

let lastAlertAt = 0;

function recipients() {
  return [
    ...new Set(
      (process.env.TELEGRAM_ADMIN_ALERT_CHAT_IDS || '')
        .split(/[\s,;]+/)
        .map((value) => value.trim())
        .filter((value) => /^-?\d+$/.test(value))
    )
  ];
}

/** Alert only on a cluster of infrastructure failures, never on a single declined/unanswered call. */
export async function maybeNotifyCallReliabilityIssue(latestReason?: string | null) {
  if (!INFRA_FAILURE_REASONS.has(String(latestReason || '').toUpperCase())) return false;
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return false;
  const chatIds = recipients();
  if (!chatIds.length) return false;

  const sessions = await prisma.consultationCallSession.findMany({
    where: { startedAt: { gte: new Date(now - ALERT_WINDOW_MS) } },
    orderBy: { startedAt: 'desc' },
    take: 20,
    select: { status: true, endReason: true }
  });
  if (sessions.length < MINIMUM_ATTEMPTS) return false;

  const failed = sessions.filter((session) =>
    INFRA_FAILURE_REASONS.has(String(session.endReason || session.status).toUpperCase())
  );
  if (failed.length < MINIMUM_INFRA_FAILURES || failed.length / sessions.length < 0.3) return false;

  lastAlertAt = now;
  const reasons = new Map<string, number>();
  for (const session of failed) {
    const reason = String(session.endReason || session.status).toUpperCase();
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
  }
  const reasonSummary = [...reasons.entries()]
    .map(([reason, count]) => `${reason.replace(/_/g, ' ')}: ${count}`)
    .join(', ');
  const text = [
    '<b>Hope Hub call reliability needs attention</b>',
    '',
    `${failed.length} of the last ${sessions.length} call attempts had connection-related failures.`,
    `Reasons: ${reasonSummary}`,
    '',
    'Review Admin → Call health and verify TURN UDP, TCP and TLS 443 connectivity.'
  ].join('\n');

  const deliveries = await Promise.allSettled(
    chatIds.map((chatId) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    )
  );
  return deliveries.some((delivery) => delivery.status === 'fulfilled');
}
