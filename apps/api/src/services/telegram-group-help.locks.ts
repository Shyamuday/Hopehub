import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { containsLink, isForward } from './telegram-group-help.config.js';

export const GROUP_HELP_LOCK_TYPES = [
  'links',
  'media',
  'forwards',
  'commands',
  'stickers'
] as const;

export type GroupHelpLockType = (typeof GROUP_HELP_LOCK_TYPES)[number];

export function configuredGroupHelpLocks(value: string | undefined) {
  const allowed = new Set<string>(GROUP_HELP_LOCK_TYPES);
  return [...new Set((value || '').split(/[\s,\n]+/).map((item) => item.toLowerCase().trim()))]
    .filter((item): item is GroupHelpLockType => allowed.has(item))
    .sort();
}

export function updateGroupHelpLocks(
  current: string | undefined,
  requested: readonly string[],
  enable: boolean
) {
  const normalized = requested.map((item) => item.toLowerCase().trim()).filter(Boolean);
  if (!normalized.length) return null;
  if (
    normalized.some(
      (item) => item !== 'all' && !GROUP_HELP_LOCK_TYPES.includes(item as GroupHelpLockType)
    )
  ) {
    return null;
  }
  const targets = normalized.includes('all')
    ? [...GROUP_HELP_LOCK_TYPES]
    : (normalized as GroupHelpLockType[]);
  const active = new Set(configuredGroupHelpLocks(current));
  for (const target of targets) {
    if (enable) active.add(target);
    else active.delete(target);
  }
  return [...active].sort().join('\n');
}

export function matchedGroupHelpLock(
  message: CommunityTelegramMessage,
  configured: string | undefined
): GroupHelpLockType | null {
  const active = new Set(configuredGroupHelpLocks(configured));
  const text = `${message.text || ''}\n${message.caption || ''}`.trim();
  if (active.has('commands') && (message.text || '').trim().startsWith('/')) return 'commands';
  if (active.has('links') && containsLink(text)) return 'links';
  if (active.has('forwards') && isForward(message)) return 'forwards';
  if (active.has('stickers') && message.sticker) return 'stickers';
  if (
    active.has('media') &&
    Boolean(
      message.photo?.length ||
      message.video ||
      message.video_note ||
      message.animation ||
      message.document ||
      message.audio ||
      message.voice
    )
  )
    return 'media';
  return null;
}
