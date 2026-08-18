import { GROUP_HELP_CONFIG_DEFAULTS } from '../constants/group-help-config.constants.js';
import { getTelegramCommunityGroupPolicy } from './telegram-community-group-policy.js';
import { getSiteConfigMap } from './site-config.service.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export const GROUP_HELP_CONFIG_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramGroupHelpTestGroupChatId',
  'telegramGroupHelpRulesMessage',
  'telegramGroupHelpSupportMessage',
  'telegramGroupHelpBannedWords',
  'telegramGroupHelpLinkPolicy',
  'telegramGroupHelpAntiFloodAction',
  'telegramGroupHelpAntiFloodLimit',
  'telegramGroupHelpWarnLimit',
  'telegramGroupHelpWarnAction',
  'telegramGroupHelpForwardPolicy',
  'telegramGroupHelpMediaPolicy',
  'telegramGroupHelpAllowedMedia',
  'telegramGroupHelpChannelSenderPolicy',
  'telegramGroupHelpQuotePolicy',
  'telegramGroupHelpAntiSpamAction',
  'telegramGroupHelpAutoDeleteSeconds',
  'telegramGroupHelpMaxMessageLength',
  'telegramGroupHelpAdminWhitelist',
  'telegramGroupHelpReportsMode',
  'telegramGroupHelpStaffGroupId',
  'telegramGroupHelpLogChannelId',
  'telegramGroupHelpCustomReplies',
  'telegramGroupHelpCommandPermissions',
  'telegramGroupHelpNightMode',
  'telegramGroupHelpNightStart',
  'telegramGroupHelpNightEnd'
] as const;

export async function groupHelpConfig(chatId?: string) {
  const stored = await getSiteConfigMap(GROUP_HELP_CONFIG_KEYS);
  const policy = chatId ? await getTelegramCommunityGroupPolicy(chatId) : {};
  return { ...GROUP_HELP_CONFIG_DEFAULTS, ...stored, ...policy };
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
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
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
