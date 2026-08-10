export type GroupHelpConfigFieldType = 'text' | 'textarea' | 'number' | 'select';

export type GroupHelpConfigField = {
  key: string;
  label: string;
  description: string;
  section: 'connection' | 'messages' | 'moderation' | 'commands';
  type: GroupHelpConfigFieldType;
  maxLength: number;
  placeholder?: string;
  options?: string[];
  defaultValue: string;
};

export const GROUP_HELP_CONFIG_FIELDS: GroupHelpConfigField[] = [
  {
    key: 'telegramGroupHelpBotUsername',
    label: 'Group Help bot username',
    description: 'Username of the GroupHelp-powered bot. Keep @Hopehubbot here.',
    section: 'connection',
    type: 'text',
    maxLength: 80,
    defaultValue: 'Hopehubbot'
  },
  {
    key: 'telegramGroupHelpGroupChatId',
    label: 'Telegram group chat ID',
    description:
      'Numeric Telegram group/supergroup chat ID used only for direct announcements and pinning.',
    section: 'connection',
    type: 'text',
    maxLength: 80,
    placeholder: '-1001234567890',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpGroupTitle',
    label: 'Group title',
    description: 'Friendly name shown in admin for this Group Help managed community.',
    section: 'connection',
    type: 'text',
    maxLength: 140,
    defaultValue: 'Hope Hub Group Help'
  },
  {
    key: 'telegramGroupHelpWelcomeMessage',
    label: 'Welcome message',
    description: 'Message new members should see after joining the Telegram group.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'Welcome to Hope Hub. This is a safe, respectful space for emotional support. Please read the rules, protect privacy, and avoid sharing emergency situations here.'
  },
  {
    key: 'telegramGroupHelpWelcomeImageUrl',
    label: 'Welcome image URL',
    description: 'Optional public S3/image URL attached to the welcome message or command.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpRulesMessage',
    label: 'Rules message',
    description: 'Core rules for safety, privacy, respectful conduct, and moderation.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'Group rules:\\n1. Be kind and respectful.\\n2. Do not share anyone’s private information.\\n3. No diagnosis, medical claims, spam, promotions, or harassment.\\n4. If you are in immediate danger, contact local emergency services.'
  },
  {
    key: 'telegramGroupHelpRulesImageUrl',
    label: 'Rules image URL',
    description: 'Optional public S3/image URL attached to the rules message or command.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpSupportMessage',
    label: 'Support message',
    description: 'Message used when members ask how to get Hope Hub support.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'If you need one-to-one support, visit https://hopehub.in or use the Hope Hub web bot. For emergencies, please contact local emergency services or a crisis helpline.'
  },
  {
    key: 'telegramGroupHelpSupportImageUrl',
    label: 'Support image URL',
    description: 'Optional public S3/image URL attached to the support message or command.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpPinnedMessage',
    label: 'Pinned intro message',
    description: 'Message admins can send and pin at the top of the group.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'Hope Hub group guide: keep conversations gentle, anonymous-friendly, and respectful. For private support, use https://hopehub.in.'
  },
  {
    key: 'telegramGroupHelpPinnedImageUrl',
    label: 'Pinned intro image URL',
    description: 'Optional public S3/image URL attached to the pinned intro.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpRecurringMessage',
    label: 'Recurring reminder message',
    description: 'Reminder text for daily/weekly recurring Group Help messages.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'Gentle reminder: this group is for peer support and community care. Please keep details private and reach out for professional help when needed.'
  },
  {
    key: 'telegramGroupHelpRecurringImageUrl',
    label: 'Recurring reminder image URL',
    description: 'Optional public S3/image URL attached to the recurring reminder.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpCrisisMessage',
    label: 'Crisis escalation message',
    description: 'Safety message shown when someone may need urgent help.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'If you may hurt yourself or someone else, please contact local emergency services now. Hope Hub group chat is not an emergency service.'
  },
  {
    key: 'telegramGroupHelpCaptchaMode',
    label: 'Captcha mode',
    description: 'Desired Group Help captcha setting. Command syntax can be adjusted below.',
    section: 'moderation',
    type: 'select',
    options: ['off', 'on', 'strict'],
    maxLength: 20,
    defaultValue: 'on'
  },
  {
    key: 'telegramGroupHelpWarnLimit',
    label: 'Warning limit',
    description: 'Number of warnings before moderator action.',
    section: 'moderation',
    type: 'number',
    maxLength: 4,
    defaultValue: '3'
  },
  {
    key: 'telegramGroupHelpLinkPolicy',
    label: 'Link policy',
    description: 'Desired link moderation policy.',
    section: 'moderation',
    type: 'select',
    options: ['allow', 'delete', 'warn', 'mute'],
    maxLength: 20,
    defaultValue: 'warn'
  },
  {
    key: 'telegramGroupHelpBannedWords',
    label: 'Banned words / phrases',
    description: 'One word or phrase per line. Use command template to apply in Group Help.',
    section: 'moderation',
    type: 'textarea',
    maxLength: 4000,
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpAdminNotes',
    label: 'Admin notes',
    description: 'Private notes for admins about how Group Help is configured.',
    section: 'moderation',
    type: 'textarea',
    maxLength: 4000,
    defaultValue:
      'GroupHelp controls the bot runtime. Do not set HopeHub API webhook for @Hopehubbot.'
  },
  {
    key: 'telegramGroupHelpWelcomeCommandTemplate',
    label: 'Welcome command template',
    description: 'Command copied into Telegram. Use {message} and optional {imageUrl}.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/welcome {message}'
  },
  {
    key: 'telegramGroupHelpRulesCommandTemplate',
    label: 'Rules command template',
    description: 'Command copied into Telegram. Use {message} and optional {imageUrl}.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/rules {message}'
  },
  {
    key: 'telegramGroupHelpSupportCommandTemplate',
    label: 'Support command template',
    description: 'Command copied into Telegram. Use {message} and optional {imageUrl}.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/setcmd support {message}'
  },
  {
    key: 'telegramGroupHelpPinnedCommandTemplate',
    label: 'Pinned intro command template',
    description: 'Command copied into Telegram. Use {message} and optional {imageUrl}.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/pin {message}'
  },
  {
    key: 'telegramGroupHelpRecurringCommandTemplate',
    label: 'Recurring reminder command template',
    description: 'Command copied into Telegram. Use {message} and optional {imageUrl}.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/recurring {message}'
  },
  {
    key: 'telegramGroupHelpCaptchaCommandTemplate',
    label: 'Captcha command template',
    description: 'Command copied into Telegram. Use {value} as placeholder.',
    section: 'commands',
    type: 'text',
    maxLength: 300,
    defaultValue: '/captcha {value}'
  },
  {
    key: 'telegramGroupHelpWarnLimitCommandTemplate',
    label: 'Warning limit command template',
    description: 'Command copied into Telegram. Use {value} as placeholder.',
    section: 'commands',
    type: 'text',
    maxLength: 300,
    defaultValue: '/warnlimit {value}'
  },
  {
    key: 'telegramGroupHelpLinkPolicyCommandTemplate',
    label: 'Link policy command template',
    description: 'Command copied into Telegram. Use {value} as placeholder.',
    section: 'commands',
    type: 'text',
    maxLength: 300,
    defaultValue: '/links {value}'
  },
  {
    key: 'telegramGroupHelpBannedWordsCommandTemplate',
    label: 'Banned words command template',
    description: 'Command copied into Telegram. Use {lines} as placeholder.',
    section: 'commands',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: '/filter {lines}'
  }
];

export const GROUP_HELP_CONFIG_KEYS = GROUP_HELP_CONFIG_FIELDS.map((field) => field.key);

export const GROUP_HELP_CONFIG_DEFAULTS = Object.fromEntries(
  GROUP_HELP_CONFIG_FIELDS.map((field) => [field.key, field.defaultValue])
) as Record<string, string>;

export const GROUP_HELP_CONFIG_META = Object.fromEntries(
  GROUP_HELP_CONFIG_FIELDS.map((field) => [field.key, field])
) as Record<string, GroupHelpConfigField>;
