import {
  GROUP_HELP_CLEAN_COMMAND_TYPES,
  shouldCleanGroupHelpType
} from './telegram-group-help.cleaning.js';

/**
 * Staff commands sent in a public group reveal who performed an action. Keep
 * the public group clean while deliberately retaining commands in the private
 * staff/log groups, where they form part of the moderation trail.
 */
export const DEFAULT_GROUP_COMMAND_DELETE_SECONDS = 3;

export function groupCommandDeleteDelaySeconds(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_GROUP_COMMAND_DELETE_SECONDS;
  return Math.max(0, Math.min(60, Math.floor(parsed)));
}

export function shouldAutoDeleteGroupCommand(input: {
  chatType?: string;
  isControlGroup: boolean;
  delaySeconds: number;
  commandType?: (typeof GROUP_HELP_CLEAN_COMMAND_TYPES)[number];
  configuredTypes?: string;
}) {
  return (
    input.chatType !== 'private' &&
    !input.isControlGroup &&
    input.delaySeconds > 0 &&
    shouldCleanGroupHelpType(
      input.configuredTypes,
      input.commandType || 'user',
      GROUP_HELP_CLEAN_COMMAND_TYPES,
      true
    )
  );
}

/**
 * Deleting member content must be an explicit staff choice. Plain warn/mute/
 * ban commands affect only the member record; /delete, /d..., /s..., and
 * legacy /del... variants may additionally remove the replied message.
 */
export function shouldDeleteModerationTarget(commandName: string) {
  return [
    'delete',
    'del',
    'delwarn',
    'dwarn',
    'swarn',
    'delmute',
    'delban',
    'delkick',
    'dmute',
    'dban',
    'dkick',
    'smute',
    'sban',
    'skick'
  ].includes(commandName.toLowerCase());
}
