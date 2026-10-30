import type { GroupHelpConfigField } from './group-help-config.constants.js';
import { TELEGRAM_BOT_USERNAMES } from './telegram-community-bot.constants.js';

export const GROUP_HELP_MODERATION_NOTICE_SECONDS = 24 * 60 * 60;
export const GROUP_HELP_MODERATION_FEEDBACK_NOTICE = [
  '❌ DO NOT REPLY, COMMENT, OR REACT to this message or any admin action.',
  'All feedback or complaints must be sent ONLY via the official Contact Bot, never in GC or VC.',
  'Violations may result in immediate further action against you.',
  `📩 CONTACT ADMIN: ${TELEGRAM_BOT_USERNAMES.CONTACT}`
].join('\n');

const toggle = (key: string, label: string, description: string): GroupHelpConfigField => ({
  key,
  label,
  description,
  section: 'notices',
  type: 'select',
  options: ['Enabled', 'Disabled'],
  maxLength: 8,
  defaultValue: 'Enabled'
});
const retention = (key: string, label: string, description: string): GroupHelpConfigField => ({
  key,
  label,
  description: `${description} Seconds from 0 to 86400; 0 keeps messages. 3600 = 1h, 21600 = 6h, 86400 = 24h. Changes apply to future messages.`,
  section: 'notices',
  type: 'number',
  maxLength: 5,
  defaultValue: '86400'
});

export const GROUP_HELP_MOD_NOTICE_FIELDS: GroupHelpConfigField[] = [
  toggle(
    'telegramGroupHelpModNoticeEnabled',
    'Public moderation notices',
    'Show public notices after successful ban, mute, and warn actions. Disabling notices does not disable moderation or private audit logs.'
  ),
  {
    key: 'telegramGroupHelpModNoticeActions',
    label: 'Actions with notices',
    description:
      'Choose which successful actions show a public notice. Timed and delete variants follow their base action.',
    section: 'notices',
    type: 'select',
    maxLength: 20,
    defaultValue: 'ban mute warn',
    options: ['ban mute warn', 'ban', 'mute', 'warn', 'ban mute', 'ban warn', 'mute warn']
  },
  toggle(
    'telegramGroupHelpModFooterEnabled',
    'Feedback notice enabled',
    'Append the editable feedback/contact message below the member, action, reason, and duration.'
  ),
  {
    key: 'telegramGroupHelpModFooter',
    label: 'Feedback notice text',
    description:
      'Plain-text message appended to moderation notices. Edit the wording and Contact Bot handle here. Disable the feedback notice to hide it.',
    section: 'notices',
    type: 'textarea',
    maxLength: 1500,
    defaultValue: GROUP_HELP_MODERATION_FEEDBACK_NOTICE
  },
  retention(
    'telegramGroupHelpModNoticeSeconds',
    'Notice retention',
    'How long bot moderation notices stay visible.'
  ),
  {
    key: 'telegramGroupHelpModCommandSeconds',
    label: 'Public moderation command cleanup',
    description:
      'Delete public ban, mute, and warn commands after 1 to 60 seconds (default 3). Only bot notices use the longer notice retention. Private staff commands remain retained.',
    section: 'notices',
    type: 'number',
    maxLength: 2,
    defaultValue: '3'
  },
  toggle(
    'telegramGroupHelpModNoticeSilent',
    'Notice for silent commands',
    'Show notices for /sban, /smute, and /swarn too. Disable to honor silent aliases. Command retention remains independent.'
  ),
  toggle(
    'telegramGroupHelpModNoticeRules',
    'Rules after moderation',
    'Send the existing rules reminder after a typed moderation command that shows a public notice.'
  ),
  toggle(
    'telegramGroupHelpModNoticeStaffCopy',
    'Staff confirmation copy',
    'Copy the moderation notice to the private control chat when an administrator acts on another group. Private audit logs remain independent.'
  )
];

export const GROUP_HELP_MOD_NOTICE_KEYS = new Set(
  GROUP_HELP_MOD_NOTICE_FIELDS.map((field) => field.key)
);
