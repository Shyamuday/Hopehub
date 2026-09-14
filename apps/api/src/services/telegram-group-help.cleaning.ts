import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export const GROUP_HELP_CLEAN_COMMAND_TYPES = ['admin', 'user', 'other'] as const;
export const GROUP_HELP_CLEAN_MESSAGE_TYPES = ['action', 'filter', 'note'] as const;
export const GROUP_HELP_CLEAN_SERVICE_TYPES = [
  'join',
  'leave',
  'other',
  'photo',
  'pin',
  'title',
  'videochat'
] as const;

type CleaningType = string;

export function configuredCleaningTypes(
  value: string | undefined,
  allowed: readonly CleaningType[],
  defaultToAll = false
) {
  const entries = (value || '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (!entries.length) return defaultToAll ? ['all'] : [];
  if (entries.includes('none')) return [];
  if (entries.includes('all')) return ['all'];
  return [...new Set(entries.filter((entry) => allowed.includes(entry)))];
}

export function updatedCleaningTypes(input: {
  current: string | undefined;
  requested: string[];
  allowed: readonly CleaningType[];
  enable: boolean;
  defaultToAll?: boolean;
}) {
  const requested = input.requested.map((item) => item.toLowerCase());
  if (
    !requested.length ||
    requested.some((item) => item !== 'all' && !input.allowed.includes(item))
  )
    return undefined;
  if (requested.includes('all')) return input.enable ? 'all' : 'none';

  const current = configuredCleaningTypes(input.current, input.allowed, input.defaultToAll);
  const active = new Set(current.includes('all') ? input.allowed : current);
  for (const type of requested) {
    if (input.enable) active.add(type);
    else active.delete(type);
  }
  if (active.size === input.allowed.length) return 'all';
  return active.size ? [...active].join('\n') : 'none';
}

export function shouldCleanGroupHelpType(
  value: string | undefined,
  type: string,
  allowed: readonly CleaningType[],
  defaultToAll = false
) {
  const configured = configuredCleaningTypes(value, allowed, defaultToAll);
  return configured.includes('all') || configured.includes(type);
}

export function groupHelpServiceMessageType(
  message: CommunityTelegramMessage
): (typeof GROUP_HELP_CLEAN_SERVICE_TYPES)[number] | undefined {
  if (message.new_chat_members?.length) return 'join';
  if (message.left_chat_member) return 'leave';
  if (message.new_chat_photo?.length || message.delete_chat_photo) return 'photo';
  if (message.pinned_message) return 'pin';
  if (message.new_chat_title) return 'title';
  if (
    message.video_chat_started ||
    message.video_chat_ended ||
    message.video_chat_scheduled ||
    message.video_chat_participants_invited
  )
    return 'videochat';
  if (
    message.successful_payment ||
    message.proximity_alert_triggered ||
    message.message_auto_delete_timer_changed ||
    message.web_app_data ||
    message.forum_topic_created ||
    message.forum_topic_closed ||
    message.forum_topic_reopened ||
    message.general_forum_topic_hidden ||
    message.general_forum_topic_unhidden
  )
    return 'other';
  return undefined;
}
