import { parseGroupHelpModerationDuration } from './telegram-group-help.moderation-command.js';

export type GroupHelpWarnMode = {
  action: 'ban' | 'kick' | 'mute';
  durationSeconds?: number;
  value: string;
};

export function parseGroupHelpWarnMode(value: string | undefined): GroupHelpWarnMode | undefined {
  const parts = (value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 1 && ['ban', 'kick', 'mute'].includes(parts[0])) {
    return { action: parts[0] as GroupHelpWarnMode['action'], value: parts[0] };
  }
  if (parts.length !== 2 || !['tban', 'tmute'].includes(parts[0])) return undefined;
  const duration = parseGroupHelpModerationDuration(parts[1]);
  if (!duration) return undefined;
  return {
    action: parts[0] === 'tban' ? 'ban' : 'mute',
    durationSeconds: duration.seconds,
    value: `${parts[0]} ${duration.input}`
  };
}

export function effectiveGroupHelpWarnMode(value: string | undefined): GroupHelpWarnMode {
  return parseGroupHelpWarnMode(value) || { action: 'mute', value: 'mute' };
}

export function parseGroupHelpWarnTime(value: string | undefined) {
  const normalized = (value || 'off').trim().toLowerCase();
  if (normalized === 'off') return { value: 'off', seconds: undefined };
  const duration = parseGroupHelpModerationDuration(normalized);
  return duration ? { value: duration.input, seconds: duration.seconds } : undefined;
}

export function groupHelpWarnPolicySummary(values: Record<string, string>) {
  const limit = Math.max(1, Math.min(100, Number(values.telegramGroupHelpWarnLimit) || 3));
  const mode = effectiveGroupHelpWarnMode(values.telegramGroupHelpWarnAction);
  const expiry = parseGroupHelpWarnTime(values.telegramGroupHelpWarnTime);
  return {
    limit,
    mode,
    expiry: expiry || { value: 'off', seconds: undefined }
  };
}
