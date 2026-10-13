import { Prisma } from '@prisma/client';
export async function lockCampaignGroup(tx: Prisma.TransactionClient, chatId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`telegram-campaign:${chatId}`}, 0))::text AS locked`;
}
export function fixedCampaignNextRun(due: Date, now: Date, minutes: number) {
  const period = Math.max(1, minutes) * 60_000;
  return new Date(
    due.getTime() + Math.max(1, Math.floor((now.getTime() - due.getTime()) / period) + 1) * period
  );
}
export async function cancelQueuedCampaignDeliveries(
  tx: Prisma.TransactionClient,
  campaignId: string
) {
  const payload = { cancelBefore: new Date().toISOString() };
  await tx.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: 'telegram-campaign:control', chatId: campaignId } },
    create: {
      bot: 'telegram-campaign:control',
      chatId: campaignId,
      state: 'CANCEL_CUTOFF',
      payload,
      expiresAt: new Date('2100-01-01')
    },
    update: { payload, expiresAt: new Date('2100-01-01') }
  });
  await tx.telegramCampaignDelivery.updateMany({
    where: { campaignId, status: { in: ['FAILED', 'CLAIMED'] } },
    data: {
      status: 'CANCELLED',
      nextRetryAt: null,
      error: 'Administrator paused or cancelled this schedule.'
    }
  });
}
export async function campaignDeliveryCancelled(
  tx: Prisma.TransactionClient,
  campaignId: string,
  createdAt: Date
) {
  const control = await tx.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: 'telegram-campaign:control', chatId: campaignId } }
  });
  const payload = control?.payload as { cancelBefore?: string } | null;
  return Boolean(payload?.cancelBefore && createdAt.getTime() <= Date.parse(payload.cancelBefore));
}
export function telegramDeliveryUncertain(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'TELEGRAM_DELIVERY_UNCERTAIN'
  );
}
