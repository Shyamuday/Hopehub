export const EPHEMERAL_CONFESSION_CAMPAIGN_ID = 'seed_telegram_confession_reply_loop';

export function shouldApplyTelegramSmartSchedule(campaignId: string) {
  // Editorial seed campaigns may adapt to chat activity. Explicit admin
  // schedules must honor their interval even when several posts are due.
  return campaignId.startsWith('seed_telegram_') && campaignId !== EPHEMERAL_CONFESSION_CAMPAIGN_ID;
}

export function telegramCampaignDeleteAfter(now: Date, deleteAfterMinutes: number | null) {
  if (!deleteAfterMinutes || !Number.isInteger(deleteAfterMinutes) || deleteAfterMinutes < 1) {
    return null;
  }
  return new Date(now.getTime() + deleteAfterMinutes * 60_000);
}
