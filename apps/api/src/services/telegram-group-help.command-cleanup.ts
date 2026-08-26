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
}) {
  return input.chatType !== 'private' && !input.isControlGroup && input.delaySeconds > 0;
}

/**
 * Deleting member content must be an explicit staff choice. Plain warn/mute/
 * ban commands affect only the member record; /delete and /del... variants
 * additionally remove the replied message.
 */
export function shouldDeleteModerationTarget(commandName: string) {
  return ['delete', 'del', 'delwarn', 'delmute', 'delban', 'delkick'].includes(
    commandName.toLowerCase()
  );
}
