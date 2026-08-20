import { getTelegramCommunityGroupPolicy } from './telegram-community-group-policy.js';
import { getSiteConfigMap } from './site-config.service.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export const GROUP_HELP_CONFIG_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramGroupHelpTestGroupChatId',
  'telegramGroupHelpWelcomeMessage',
  'telegramGroupHelpRulesMessage',
  'telegramGroupHelpSupportMessage',
  'telegramGroupHelpFirstMessageReview',
  'telegramGroupHelpCaptchaPendingMinutes',
  'telegramGroupHelpCaptchaSuccessCleanupMinutes',
  'telegramGroupHelpBannedWords',
  'telegramGroupHelpLinkPolicy',
  'telegramGroupHelpAntiFloodAction',
  'telegramGroupHelpAntiFloodLimit',
  'telegramGroupHelpWarnLimit',
  'telegramGroupHelpWarnAction',
  'telegramGroupHelpMuteMinutes',
  'telegramGroupHelpForwardPolicy',
  'telegramGroupHelpMediaPolicy',
  'telegramGroupHelpAllowedMedia',
  'telegramGroupHelpChannelSenderPolicy',
  'telegramGroupHelpQuotePolicy',
  'telegramGroupHelpAntiSpamAction',
  'telegramGroupHelpAntiPornAction',
  'telegramGroupHelpAutoDeleteSeconds',
  'telegramGroupHelpMaxMessageLength',
  'telegramGroupHelpAdminWhitelist',
  'telegramGroupHelpReportsMode',
  'telegramGroupHelpStaffGroupId',
  'telegramGroupHelpMemberDirectorySync',
  'telegramGroupHelpMemberSyncHours',
  'telegramGroupHelpLogChannelId',
  'telegramGroupHelpCustomReplies',
  'telegramGroupHelpCommandPermissions',
  'telegramGroupHelpNightMode',
  'telegramGroupHelpNightStart',
  'telegramGroupHelpNightEnd',
  'telegramGroupHelpTimezone',
  'telegramCommunityDefaultTopicId'
] as const;

export async function groupHelpConfig(chatId?: string) {
  const stored = await getSiteConfigMap(GROUP_HELP_CONFIG_KEYS);
  const policy = chatId ? await getTelegramCommunityGroupPolicy(chatId) : {};
  // SiteConfig is the single runtime source of truth. New environments must be
  // initialized through the explicit Telegram community seed, never silently
  // changed by application startup.
  return { ...stored, ...policy };
}

export function floodThreshold(value: string) {
  const [limit, seconds] = value.trim().split(/\s+/).map(Number);
  return {
    limit: Number.isFinite(limit) ? Math.max(2, limit) : 6,
    seconds: Number.isFinite(seconds) ? Math.max(2, seconds) : 10
  };
}

export function bannedPhrases(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesBannedPhrase(text: string, phrases: readonly string[]) {
  return Boolean(matchedBannedPhrase(text, phrases));
}

/** Returns the configured phrase that triggered moderation, if any. */
export function matchedBannedPhrase(text: string, phrases: readonly string[]) {
  const normalized = text.normalize('NFKC').toLocaleLowerCase();
  for (const phrase of phrases) {
    const candidate = phrase.normalize('NFKC').toLocaleLowerCase().trim();
    if (!candidate) continue;
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Boundaries prevent a short word from matching inside an innocent larger word.
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(normalized)) {
      return phrase.trim();
    }
  }
  return null;
}

export function containsLink(text: string) {
  return /(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(?:com|in|org|net|io)\b)/i.test(
    text
  );
}

export function hasMedia(message: CommunityTelegramMessage) {
  return Boolean(
    message.photo?.length ||
    message.video ||
    message.animation ||
    message.document ||
    message.audio ||
    message.voice ||
    message.sticker
  );
}

export function mediaKinds(message: CommunityTelegramMessage) {
  return [
    message.photo?.length ? 'photo' : '',
    message.video ? 'video' : '',
    message.audio ? 'audio' : '',
    message.voice ? 'voice' : '',
    message.animation ? 'gif' : '',
    message.sticker ? 'sticker' : '',
    message.document ? 'document' : ''
  ].filter(Boolean);
}

export function isForward(message: CommunityTelegramMessage) {
  return Boolean(message.forward_origin || message.forward_from || message.forward_from_chat);
}

export function isWithinQuietHours(values: Record<string, string>) {
  const mode = values.telegramGroupHelpNightMode || 'off';
  if (mode === 'off') return false;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
  };
  const start = toMinutes(values.telegramGroupHelpNightStart || '22:00');
  const end = toMinutes(values.telegramGroupHelpNightEnd || '07:00');
  if (start === null || end === null) return false;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: values.telegramGroupHelpTimezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
  }
  const current =
    Number(parts.find((part) => part.type === 'hour')?.value || 0) * 60 +
    Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

export function customReply(text: string, definitions: string) {
  const normalized = text.trim().toLowerCase();
  for (const line of definitions.split(/\r?\n/)) {
    const [trigger, ...response] = line.split('=>');
    if (trigger?.trim().toLowerCase() === normalized && response.join('=>').trim()) {
      return response.join('=>').trim();
    }
  }
  return '';
}
