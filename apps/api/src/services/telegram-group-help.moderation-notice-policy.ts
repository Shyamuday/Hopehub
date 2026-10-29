export const GROUP_HELP_MODERATION_NOTICE_SECONDS = 24 * 60 * 60;

export const GROUP_HELP_MODERATION_FEEDBACK_NOTICE = [
  '❌ DO NOT REPLY, COMMENT, OR REACT to this message or any admin action.',
  'All feedback or complaints must be sent ONLY via the official Contact Bot, never in GC or VC.',
  'Violations may result in immediate further action against you.',
  '📩 CONTACT ADMIN: @Contacthopehubb'
].join('\n');

export function isGroupHelpRetainedModerationAction(action: string) {
  return ['ban', 'mute', 'warn'].includes(action);
}

export function groupHelpModerationNoticeText(text: string, action: string) {
  return isGroupHelpRetainedModerationAction(action)
    ? `${text}\n\n${GROUP_HELP_MODERATION_FEEDBACK_NOTICE}`
    : text;
}
