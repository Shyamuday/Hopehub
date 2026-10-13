import { getSiteConfigMap } from './site-config.service.js';

export function scheduledPostTargetAllowed(chatId: string, staffGroupId?: string) {
  return Boolean(chatId.trim()) && chatId.trim() !== staffGroupId?.trim();
}

export async function assertScheduledPostTarget(chatId: string) {
  const values = await getSiteConfigMap(['telegramGroupHelpStaffGroupId']);
  if (!scheduledPostTargetAllowed(chatId, values.telegramGroupHelpStaffGroupId)) {
    throw new Error(
      'Scheduled posts are available in user groups only. Use /schedule in the user group.'
    );
  }
}
