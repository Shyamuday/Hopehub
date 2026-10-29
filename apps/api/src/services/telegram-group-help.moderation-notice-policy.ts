import {
  GROUP_HELP_MODERATION_NOTICE_SECONDS,
  GROUP_HELP_MODERATION_FEEDBACK_NOTICE
} from '../constants/group-help-moderation-notice.constants.js';
import { TELEGRAM_BOT_USERNAMES } from '../constants/telegram-community-bot.constants.js';
export { GROUP_HELP_MODERATION_NOTICE_SECONDS, GROUP_HELP_MODERATION_FEEDBACK_NOTICE };

export function groupHelpModerationNoticePolicy(values: Record<string, string> = {}) {
  const enabled = (key: string) => values[key] !== 'Disabled';
  const seconds = (key: string) => {
    const raw = values[key];
    const number = Number(raw);
    return raw?.trim() && Number.isInteger(number) && number >= 0 && number <= 86400
      ? number
      : GROUP_HELP_MODERATION_NOTICE_SECONDS;
  };
  const actions = (values.telegramGroupHelpModNoticeActions || 'ban mute warn')
    .split(/\s+/)
    .filter(isGroupHelpRetainedModerationAction);
  return {
    enabled: enabled('telegramGroupHelpModNoticeEnabled'),
    actions: new Set(actions.length ? actions : ['ban', 'mute', 'warn']),
    footerEnabled: enabled('telegramGroupHelpModFooterEnabled'),
    footer: (values.telegramGroupHelpModFooter?.trim() || GROUP_HELP_MODERATION_FEEDBACK_NOTICE)
      .replace(/@Contacthopehubb\b/gi, TELEGRAM_BOT_USERNAMES.CONTACT)
      .slice(0, 1500),
    seconds: seconds('telegramGroupHelpModNoticeSeconds'),
    commandSeconds: seconds('telegramGroupHelpModCommandSeconds'),
    silent: enabled('telegramGroupHelpModNoticeSilent'),
    rules: enabled('telegramGroupHelpModNoticeRules'),
    staffCopy: enabled('telegramGroupHelpModNoticeStaffCopy')
  };
}

export function shouldShowGroupHelpModerationNotice(
  action: string,
  values: Record<string, string> = {}
) {
  const policy = groupHelpModerationNoticePolicy(values);
  return policy.enabled && policy.actions.has(action);
}

export function validateGroupHelpModerationNoticeSetting(key: string, value: string) {
  if (
    ['telegramGroupHelpModNoticeSeconds', 'telegramGroupHelpModCommandSeconds'].includes(key) &&
    (!/^\d+$/.test(value) || Number(value) > 86400)
  ) {
    throw new Error('Retention must be a whole number from 0 to 86400 seconds; 0 keeps messages.');
  }
  if (key === 'telegramGroupHelpModFooter' && !value.trim()) {
    throw new Error('Enter notice text, or disable Feedback notice enabled to hide it.');
  }
}

export function isGroupHelpRetainedModerationAction(action: string) {
  return ['ban', 'mute', 'warn'].includes(action);
}

export function groupHelpModerationNoticeText(
  text: string,
  action: string,
  values: Record<string, string> = {}
) {
  const policy = groupHelpModerationNoticePolicy(values);
  const footer =
    isGroupHelpRetainedModerationAction(action) && policy.footerEnabled
      ? `\n\n${policy.footer}`
      : '';
  const available = 4096 - footer.length;
  // Keep the contact/feedback wording intact if an unusually long reason
  // would otherwise make Telegram reject the entire notice.
  const body =
    text.length > available
      ? `${text.slice(0, available - 1).replace(/[\uD800-\uDBFF]$/, '')}…`
      : text;
  return body + footer;
}
