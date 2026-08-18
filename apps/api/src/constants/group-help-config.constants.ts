import { TELEGRAM_BOT_URLS } from './telegram-community-bot.constants.js';

export type GroupHelpConfigFieldType = 'text' | 'textarea' | 'number' | 'select';

export const LEGACY_HOPEHUB_COMMUNITY_WELCOME_MESSAGE = `Hi {mention} 👋 {id}

💙 Welcome to HopeHub!

India's Trusted Emotional Support & Peer Support Community.

HopeHub is a safe and supportive space where you can express yourself freely, connect with compassionate people, and take small steps toward healing and personal growth.

💬 Vent without fear of judgment
🤝 Connect with kind & supportive people
🎙️ Join daily voice chats & support discussions
🫂 Receive peer support & emotional guidance
❤️ Find support for stress, anxiety, depression, breakups & loneliness
🧠 Access counselling, mental health resources & wellness tools
🌱 Learn, heal & grow—one step at a time

Please remember:
✅ Be kind & respectful – Follow the group rules.
✅ Respect everyone's privacy.
✅ No bullying, hate, spam or unwanted DMs.

💙 Every conversation matters. Every person matters. You matter.`;

export const HOPEHUB_COMMUNITY_WELCOME_MESSAGE = `Hi {mention} 👋 {id}

💙 Welcome to HopeHub!

India's Trusted Emotional Support & Peer Support Community.

HopeHub is a safe and supportive space where you can express yourself freely, connect with compassionate people, and take small steps toward healing and personal growth.

💬 Vent without fear of judgment
🤝 Connect with kind & supportive people
🎙️ Join daily voice chats & support discussions
🫂 Receive peer support & emotional guidance
❤️ Find support for stress, anxiety, depression, breakups & loneliness
🧠 Access counselling, mental health resources & wellness tools
🌱 Learn, heal & grow—one step at a time

Please remember:
✅ Be kind & respectful – Follow the group rules.
✅ Respect everyone's privacy.
✅ No bullying, hate, spam or unwanted DMs.

💙 Every conversation matters. Every person matters. You matter.`;

export const HOPEHUB_COMMUNITY_WELCOME_MEDIA_URL = '';

export const HOPEHUB_COMMUNITY_WELCOME_BUTTONS = `Support | https://hopehub.in/#live-connect | success && Confess | ${TELEGRAM_BOT_URLS.CONFESSION} | danger && Rules | ${TELEGRAM_BOT_URLS.RULES} | primary`;

export type GroupHelpConfigField = {
  key: string;
  label: string;
  description: string;
  section:
    | 'connection'
    | 'messages'
    | 'onboarding'
    | 'moderation'
    | 'content'
    | 'people'
    | 'operations'
    | 'commands';
  type: GroupHelpConfigFieldType;
  maxLength: number;
  placeholder?: string;
  options?: string[];
  defaultValue: string;
};

export type GroupHelpAction = {
  id: string;
  title: string;
  description: string;
  valueKey: string;
  imageUrlKey?: string;
  templateKey: string;
  placeholder: 'message' | 'value' | 'lines';
  applyMode: 'TELEGRAM_ADMIN_CONFIRMATION' | 'DIRECT_PIN';
};

const GROUP_HELP_CORE_ACTIONS: GroupHelpAction[] = [
  {
    id: 'welcome',
    title: 'Welcome message',
    description: 'Apply the message shown when a member joins.',
    valueKey: 'telegramGroupHelpWelcomeMessage',
    imageUrlKey: 'telegramGroupHelpWelcomeImageUrl',
    templateKey: 'telegramGroupHelpWelcomeCommandTemplate',
    placeholder: 'message',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'rules',
    title: 'Group rules',
    description: 'Apply the safety and conduct rules.',
    valueKey: 'telegramGroupHelpRulesMessage',
    imageUrlKey: 'telegramGroupHelpRulesImageUrl',
    templateKey: 'telegramGroupHelpRulesCommandTemplate',
    placeholder: 'message',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'support',
    title: 'Support reply',
    description: 'Apply the private-support command response.',
    valueKey: 'telegramGroupHelpSupportMessage',
    imageUrlKey: 'telegramGroupHelpSupportImageUrl',
    templateKey: 'telegramGroupHelpSupportCommandTemplate',
    placeholder: 'message',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'pinned',
    title: 'Pinned introduction',
    description: 'Post and pin the current introduction directly in the configured group.',
    valueKey: 'telegramGroupHelpPinnedMessage',
    imageUrlKey: 'telegramGroupHelpPinnedImageUrl',
    templateKey: 'telegramGroupHelpPinnedCommandTemplate',
    placeholder: 'message',
    applyMode: 'DIRECT_PIN'
  },
  {
    id: 'recurring',
    title: 'Recurring reminder',
    description: 'Apply the recurring community reminder.',
    valueKey: 'telegramGroupHelpRecurringMessage',
    imageUrlKey: 'telegramGroupHelpRecurringImageUrl',
    templateKey: 'telegramGroupHelpRecurringCommandTemplate',
    placeholder: 'message',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'captcha',
    title: 'Join captcha',
    description: 'Apply the selected captcha level.',
    valueKey: 'telegramGroupHelpCaptchaMode',
    templateKey: 'telegramGroupHelpCaptchaCommandTemplate',
    placeholder: 'value',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'warn-limit',
    title: 'Warning limit',
    description: 'Apply the number of warnings before moderator action.',
    valueKey: 'telegramGroupHelpWarnLimit',
    templateKey: 'telegramGroupHelpWarnLimitCommandTemplate',
    placeholder: 'value',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'links',
    title: 'Link policy',
    description: 'Apply how links are handled in the group.',
    valueKey: 'telegramGroupHelpLinkPolicy',
    templateKey: 'telegramGroupHelpLinkPolicyCommandTemplate',
    placeholder: 'value',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  },
  {
    id: 'banned-words',
    title: 'Word filters',
    description: 'Apply the configured blocked words and phrases.',
    valueKey: 'telegramGroupHelpBannedWords',
    templateKey: 'telegramGroupHelpBannedWordsCommandTemplate',
    placeholder: 'lines',
    applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
  }
];

const GROUP_HELP_ADVANCED_ACTIONS: GroupHelpAction[] = [
  [
    'anti-flood',
    'Anti-flood action',
    'Apply rapid-message protection.',
    'telegramGroupHelpAntiFloodAction',
    'telegramGroupHelpAntiFloodCommandTemplate'
  ],
  [
    'anti-flood-limit',
    'Anti-flood sensitivity',
    'Apply message-count and time-window thresholds.',
    'telegramGroupHelpAntiFloodLimit',
    'telegramGroupHelpAntiFloodLimitCommandTemplate'
  ],
  [
    'anti-spam',
    'Anti-spam action',
    'Apply the preferred spam response.',
    'telegramGroupHelpAntiSpamAction',
    'telegramGroupHelpAntiSpamCommandTemplate'
  ],
  [
    'anti-porn',
    'NSFW protection',
    'Open/apply explicit-media protection.',
    'telegramGroupHelpAntiPornAction',
    'telegramGroupHelpAntiPornCommandTemplate'
  ],
  [
    'join-protection',
    'Join protection',
    'Open/apply new-member protection.',
    'telegramGroupHelpJoinProtection',
    'telegramGroupHelpJoinProtectionCommandTemplate'
  ],
  [
    'join-leave',
    'Join and leave notices',
    'Open/apply member event messages.',
    'telegramGroupHelpJoinLeaveMessages',
    'telegramGroupHelpJoinLeaveCommandTemplate'
  ],
  [
    'media',
    'Media permissions',
    'Open/apply the saved media policy.',
    'telegramGroupHelpMediaPolicy',
    'telegramGroupHelpMediaCommandTemplate'
  ],
  [
    'forwards',
    'Forwarded messages',
    'Open/apply forwarded-message protection.',
    'telegramGroupHelpForwardPolicy',
    'telegramGroupHelpForwardCommandTemplate'
  ],
  [
    'auto-delete',
    'Scheduled deletion',
    'Open/apply automatic message deletion.',
    'telegramGroupHelpAutoDeleteSeconds',
    'telegramGroupHelpAutoDeleteCommandTemplate'
  ],
  [
    'night-mode',
    'Night mode',
    'Open/apply quiet-hour restrictions.',
    'telegramGroupHelpNightMode',
    'telegramGroupHelpNightModeCommandTemplate'
  ],
  [
    'language',
    'Bot language',
    'Apply the Group Help interface language.',
    'telegramGroupHelpLanguage',
    'telegramGroupHelpLanguageCommandTemplate'
  ],
  [
    'log-channel',
    'Log channel',
    'Open/apply moderation event logging.',
    'telegramGroupHelpLogChannelId',
    'telegramGroupHelpLogChannelCommandTemplate'
  ],
  [
    'staff-group',
    'Staff group',
    'Open/apply the connected staff group.',
    'telegramGroupHelpStaffGroupId',
    'telegramGroupHelpStaffGroupCommandTemplate'
  ],
  [
    'reports',
    'Member reports',
    'Open/apply member reporting behavior.',
    'telegramGroupHelpReportsMode',
    'telegramGroupHelpReportsCommandTemplate'
  ],
  [
    'custom-replies',
    'Custom replies',
    'Open/apply saved automatic replies.',
    'telegramGroupHelpCustomReplies',
    'telegramGroupHelpCustomRepliesCommandTemplate'
  ],
  [
    'inactive-members',
    'Inactive members',
    'Request the inactive-member review list.',
    'telegramGroupHelpInactiveDays',
    'telegramGroupHelpInactiveCommandTemplate'
  ],
  [
    'backup',
    'Settings backup',
    'Request a Group Help settings backup.',
    'telegramGroupHelpBackupRequest',
    'telegramGroupHelpBackupCommandTemplate'
  ],
  [
    'reload-admins',
    'Reload administrators',
    'Refresh Group Help administrator permissions.',
    'telegramGroupHelpReloadRequest',
    'telegramGroupHelpReloadCommandTemplate'
  ]
].map(
  ([id, title, description, valueKey, templateKey]) =>
    ({
      id,
      title,
      description,
      valueKey,
      templateKey,
      placeholder: valueKey === 'telegramGroupHelpCustomReplies' ? 'lines' : 'value',
      applyMode: 'TELEGRAM_ADMIN_CONFIRMATION'
    }) as GroupHelpAction
);

export const GROUP_HELP_ACTIONS: GroupHelpAction[] = [
  ...GROUP_HELP_CORE_ACTIONS,
  ...GROUP_HELP_ADVANCED_ACTIONS
];

export const GROUP_HELP_CAPABILITY_GROUPS = [
  {
    title: 'Member onboarding',
    options: ['Welcome message and media', 'Captcha', 'New-member checks', 'Join/leave controls']
  },
  {
    title: 'Moderation',
    options: [
      'Warnings',
      'Ban, kick and mute',
      'Link policy',
      'Word filters',
      'Flood and spam controls'
    ]
  },
  {
    title: 'Content controls',
    options: [
      'Media permissions',
      'Forwarded-message rules',
      'Scheduled deletion',
      'Pins and recurring messages'
    ]
  },
  {
    title: 'People and staff',
    options: [
      'Admins and moderators',
      'Staff group',
      'Custom replies',
      'Reports and user information'
    ]
  },
  {
    title: 'Operations',
    options: ['Log channel', 'Night mode', 'Activity statistics', 'Language', 'Security helpers']
  }
] as const;

const GROUP_HELP_CORE_CONFIG_FIELDS: GroupHelpConfigField[] = [
  {
    key: 'telegramGroupHelpBotUsername',
    label: 'Group Help bot username',
    description: 'Username of the Hope Hub community bot. Keep @Hopehubbot here.',
    section: 'connection',
    type: 'text',
    maxLength: 80,
    defaultValue: 'Hopehubbot'
  },
  {
    key: 'telegramGroupModerationRuntime',
    label: 'Active moderation bot',
    description:
      'Hope Hub bot owns welcomes, safety rules, moderation, polls, and scheduled posts.',
    section: 'connection',
    type: 'select',
    maxLength: 30,
    options: ['Hope Hub bot', 'Rose'],
    defaultValue: 'Hope Hub bot'
  },
  {
    key: 'telegramGroupHelpGroupChatId',
    label: 'Main Telegram group ID',
    description:
      'Numeric Telegram group/supergroup chat ID used only for direct announcements and pinning.',
    section: 'connection',
    type: 'text',
    maxLength: 80,
    placeholder: '-1001234567890',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpTestGroupChatId',
    label: 'Test Telegram group ID',
    description:
      'Test group handle or numeric ID used for previews before publishing to the main group.',
    section: 'connection',
    type: 'text',
    maxLength: 80,
    placeholder: '@hopehubtalks or -1001234567890',
    defaultValue: '@hopehubtalks'
  },
  {
    key: 'telegramLiveChatBridgeEnabled',
    label: 'Website live-chat bridge',
    description:
      'Mirror the configured Telegram group into the signed-in Hope Hub live chat using the Hope Hub bot.',
    section: 'connection',
    type: 'select',
    maxLength: 20,
    options: ['Enabled', 'Disabled'],
    defaultValue: 'Enabled'
  },
  {
    key: 'telegramLiveChatGroupSlug',
    label: 'Website live-chat room slug',
    description: 'Stable Hope Hub live-chat room used for the Telegram bridge.',
    section: 'connection',
    type: 'text',
    maxLength: 160,
    placeholder: 'telegram-community',
    defaultValue: 'telegram-community'
  },
  {
    key: 'telegramCommunityWelcomeEnabled',
    label: 'Welcome new group members',
    description: 'Let the Community bot greet new members with privacy and support links.',
    section: 'onboarding',
    type: 'select',
    maxLength: 20,
    options: ['Enabled', 'Disabled'],
    defaultValue: 'Enabled'
  },
  {
    key: 'telegramCommunitySupportUrl',
    label: 'Private support link',
    description: 'Link used by check-in follow-ups and member onboarding.',
    section: 'onboarding',
    type: 'text',
    maxLength: 500,
    placeholder: 'https://hopehub.in/#live-connect',
    defaultValue: 'https://hopehub.in/#live-connect'
  },
  {
    key: 'telegramCommunityDefaultTopicId',
    label: 'Default discussion topic ID',
    description: 'Optional Telegram forum topic for scheduled prompts and community posts.',
    section: 'content',
    type: 'number',
    maxLength: 12,
    placeholder: 'Leave empty for the main group',
    defaultValue: ''
  },
  {
    key: 'telegramCommunitySmartScheduleEnabled',
    label: 'Smart community schedule',
    description:
      'Post rotating community content only during active hours and pause when members are already talking.',
    section: 'content',
    type: 'select',
    maxLength: 20,
    options: ['Enabled', 'Disabled'],
    defaultValue: 'Enabled'
  },
  {
    key: 'telegramCommunityScheduleStart',
    label: 'Community posts start',
    description: 'Earliest local group time for automated community posts, in HH:MM format.',
    section: 'content',
    type: 'text',
    maxLength: 5,
    placeholder: '09:00',
    defaultValue: '09:00'
  },
  {
    key: 'telegramCommunityScheduleEnd',
    label: 'Community posts end',
    description: 'Latest local group time for automated community posts, in HH:MM format.',
    section: 'content',
    type: 'text',
    maxLength: 5,
    placeholder: '22:00',
    defaultValue: '22:00'
  },
  {
    key: 'telegramCommunityMaxPostsPerDay',
    label: 'Maximum automated posts per day',
    description: 'Safety limit across check-ins, polls, reminders, and rotating engagement posts.',
    section: 'content',
    type: 'number',
    maxLength: 2,
    defaultValue: '14'
  },
  {
    key: 'telegramCommunityEngagementPostsPerDay',
    label: 'Rotating engagement posts per day',
    description:
      'Maximum quotes, prompts, exercises, and polls posted from the engagement pool each day.',
    section: 'content',
    type: 'number',
    maxLength: 2,
    defaultValue: '3'
  },
  {
    key: 'telegramCommunityPromotionPostsPerDay',
    label: 'Daily community-link posts',
    description:
      'Maximum campaign posts that share the community post, earning registration, and Hope Hub website.',
    section: 'content',
    type: 'number',
    maxLength: 2,
    defaultValue: '6'
  },
  {
    key: 'telegramCommunityActiveChatPauseMinutes',
    label: 'Pause when members are chatting',
    description: 'Wait this many minutes after a genuine member message before posting automation.',
    section: 'content',
    type: 'number',
    maxLength: 4,
    defaultValue: '30'
  },
  {
    key: 'telegramCommunityMinimumPostGapMinutes',
    label: 'Minimum automated post gap',
    description: 'Minimum quiet time between any two automated community posts.',
    section: 'content',
    type: 'number',
    maxLength: 4,
    defaultValue: '45'
  },
  {
    key: 'telegramCommunityContentRepeatDays',
    label: 'Do not repeat content for',
    description: 'Number of days before the same rotating engagement item may appear again.',
    section: 'content',
    type: 'number',
    maxLength: 3,
    defaultValue: '30'
  },
  {
    key: 'telegramCommunityConfessionsInGroup',
    label: 'Publish approved confessions in group',
    description: 'Allow admin-approved anonymous confessions to appear in the community group.',
    section: 'content',
    type: 'select',
    maxLength: 20,
    options: ['Enabled', 'Disabled'],
    defaultValue: 'Enabled'
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
    defaultValue: HOPEHUB_COMMUNITY_WELCOME_MESSAGE
  },
  {
    key: 'telegramGroupHelpWelcomeImageUrl',
    label: 'Welcome media URL',
    description: 'Optional public image, GIF, or MP4 shown before the welcome message.',
    section: 'messages',
    type: 'text',
    maxLength: 1000,
    placeholder: 'https://...',
    defaultValue: HOPEHUB_COMMUNITY_WELCOME_MEDIA_URL
  },
  {
    key: 'telegramGroupHelpWelcomeButtons',
    label: 'Welcome buttons',
    description:
      'Label | https://link | primary, success, or danger. Use && between buttons on the same row, then start a new line for the next row. Existing one-button-per-line entries remain two per row.',
    section: 'messages',
    type: 'textarea',
    maxLength: 4000,
    placeholder: 'Button label | https://example.com | primary',
    defaultValue: HOPEHUB_COMMUNITY_WELCOME_BUTTONS
  },
  {
    key: 'telegramGroupHelpGoodbyeMessage',
    label: 'Goodbye message',
    description: 'Optional short farewell when a member leaves. Use {mention} or {id} if helpful.',
    section: 'messages',
    type: 'textarea',
    maxLength: 1000,
    defaultValue:
      'Take gentle care, {mention}. You are welcome back whenever you need a calm space. 💙'
  },
  {
    key: 'telegramRoseBotStatus',
    label: 'Rose handover status',
    description: 'Shows whether the legacy Rose bot was removed after the Hope Hub bot took over.',
    section: 'connection',
    type: 'text',
    maxLength: 500,
    defaultValue: 'Handover not checked yet.'
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
      'The Hope Hub bot runs from the Hope Hub API. Keep it as a group admin with delete, restrict, ban, and pin permissions. Rose should remain removed to avoid duplicate moderation.'
  },
  {
    key: 'telegramGroupHelpAdminWhitelist',
    label: 'Moderation bypass list',
    description:
      'Optional Telegram user IDs or @usernames, one per line. Group owners and administrators are always bypassed automatically.',
    section: 'people',
    type: 'textarea',
    maxLength: 4000,
    placeholder: '7217536617\n@trustedmoderator',
    defaultValue: ''
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

const GROUP_HELP_ADVANCED_CONFIG_FIELDS: GroupHelpConfigField[] = [
  {
    key: 'telegramGroupHelpWelcomeCleanup',
    label: 'Remove previous welcome message',
    description: 'Desired cleanup behavior when the next member joins.',
    section: 'onboarding',
    type: 'select',
    options: ['off', 'on'],
    maxLength: 10,
    defaultValue: 'on'
  },
  {
    key: 'telegramGroupHelpJoinProtection',
    label: 'Join protection',
    description: 'Desired new-member verification mode.',
    section: 'onboarding',
    type: 'select',
    options: ['off', 'captcha', 'strict'],
    maxLength: 20,
    defaultValue: 'captcha'
  },
  {
    key: 'telegramGroupHelpJoinLeaveMessages',
    label: 'Join and leave messages',
    description: 'Show or suppress member join/leave notices.',
    section: 'onboarding',
    type: 'select',
    options: ['off', 'join only', 'join and leave'],
    maxLength: 30,
    defaultValue: 'join only'
  },
  {
    key: 'telegramGroupHelpFirstMessageReview',
    label: 'Review new-member messages',
    description:
      'Choose how many early messages to review for a new member. Reviewed messages are removed and sent to the moderation queue. Approval trusts the next message; Telegram cannot restore the removed message automatically.',
    section: 'onboarding',
    type: 'select',
    options: ['off', '1', '2', '3'],
    maxLength: 10,
    defaultValue: 'off'
  },
  {
    key: 'telegramGroupHelpNewMemberAction',
    label: 'Failed verification action',
    description: 'Preferred action when a new member fails verification.',
    section: 'onboarding',
    type: 'select',
    options: ['kick', 'ban', 'mute'],
    maxLength: 10,
    defaultValue: 'kick'
  },
  {
    key: 'telegramGroupHelpAntiFloodAction',
    label: 'Anti-flood action',
    description: 'Action for rapid repeated messages.',
    section: 'moderation',
    type: 'select',
    options: ['off', 'warn', 'mute', 'kick', 'ban'],
    maxLength: 10,
    defaultValue: 'mute'
  },
  {
    key: 'telegramGroupHelpAntiFloodLimit',
    label: 'Anti-flood threshold',
    description: 'Messages and seconds in “count seconds” format, for example “5 2”.',
    section: 'moderation',
    type: 'text',
    maxLength: 20,
    placeholder: '5 2',
    defaultValue: '5 2'
  },
  {
    key: 'telegramGroupHelpAntiSpamAction',
    label: 'Anti-spam action',
    description: 'Desired action for detected spam.',
    section: 'moderation',
    type: 'select',
    options: ['off', 'warn', 'mute', 'kick', 'ban'],
    maxLength: 10,
    defaultValue: 'warn'
  },
  {
    key: 'telegramGroupHelpAntiPornAction',
    label: 'NSFW protection',
    description:
      'Telegram does not provide reliable NSFW classification. Review queues media for staff; use the media policy to block media completely.',
    section: 'moderation',
    type: 'select',
    options: ['off', 'review'],
    maxLength: 10,
    defaultValue: 'off'
  },
  {
    key: 'telegramGroupHelpMuteMinutes',
    label: 'Default temporary restriction',
    description: 'How long an automatic or staff mute should last.',
    section: 'moderation',
    type: 'select',
    options: ['15', '60', '240', '1440'],
    maxLength: 10,
    defaultValue: '60'
  },
  {
    key: 'telegramGroupHelpChannelSenderPolicy',
    label: 'Messages sent as channels',
    description: 'How anonymous/channel-sender messages should be handled.',
    section: 'moderation',
    type: 'select',
    options: ['allow', 'delete', 'warn', 'mute'],
    maxLength: 10,
    defaultValue: 'delete'
  },
  {
    key: 'telegramGroupHelpWarnAction',
    label: 'Warning-limit action',
    description: 'Action after a member reaches the warning limit.',
    section: 'moderation',
    type: 'select',
    options: ['mute', 'kick', 'ban'],
    maxLength: 10,
    defaultValue: 'mute'
  },
  {
    key: 'telegramGroupHelpMediaPolicy',
    label: 'Media policy',
    description: 'Overall media setting; refine individual types in Telegram settings.',
    section: 'content',
    type: 'select',
    options: ['allow', 'admins only', 'delete', 'warn'],
    maxLength: 20,
    defaultValue: 'allow'
  },
  {
    key: 'telegramGroupHelpAllowedMedia',
    label: 'Allowed media types',
    description:
      'One allowed type per line: photo, video, audio, voice, GIF, sticker, document, poll.',
    section: 'content',
    type: 'textarea',
    maxLength: 1000,
    defaultValue: 'photo\nvideo\naudio\nvoice\nGIF\nsticker\ndocument\npoll'
  },
  {
    key: 'telegramGroupHelpForwardPolicy',
    label: 'Forwarded-message policy',
    description: 'How forwarded messages should be handled.',
    section: 'content',
    type: 'select',
    options: ['allow', 'delete', 'warn', 'mute'],
    maxLength: 10,
    defaultValue: 'warn'
  },
  {
    key: 'telegramGroupHelpQuotePolicy',
    label: 'External quote policy',
    description: 'How quoted content from outside the group should be handled.',
    section: 'content',
    type: 'select',
    options: ['allow', 'delete', 'warn'],
    maxLength: 10,
    defaultValue: 'warn'
  },
  {
    key: 'telegramGroupHelpAutoDeleteSeconds',
    label: 'Automatic deletion',
    description: 'How long temporary bot messages stay visible, in seconds. Use 0 to keep them.',
    section: 'content',
    type: 'number',
    maxLength: 8,
    defaultValue: '300'
  },
  {
    key: 'telegramGroupHelpMaxMessageLength',
    label: 'Maximum message length',
    description: 'Desired maximum characters per member message; use 0 for no limit.',
    section: 'content',
    type: 'number',
    maxLength: 8,
    defaultValue: '0'
  },
  {
    key: 'telegramGroupHelpReportsMode',
    label: 'Member reports',
    description: 'How member reports should be delivered.',
    section: 'people',
    type: 'select',
    options: ['off', 'admins', 'staff group'],
    maxLength: 20,
    defaultValue: 'admins'
  },
  {
    key: 'telegramGroupHelpStaffGroupId',
    label: 'Staff group ID',
    description: 'Optional private staff group used by Group Help.',
    section: 'people',
    type: 'text',
    maxLength: 80,
    placeholder: '-1001234567890',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpCustomReplies',
    label: 'Custom replies',
    description: 'One “trigger => response” definition per line.',
    section: 'people',
    type: 'textarea',
    maxLength: 4000,
    placeholder: 'support => Visit https://hopehub.in',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpStaffNotes',
    label: 'Staff and role notes',
    description: 'Track intended founders, admins, moderators, muters, cleaners, and helpers.',
    section: 'people',
    type: 'textarea',
    maxLength: 4000,
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpCommandPermissions',
    label: 'Staff command permissions',
    description:
      'One command per line: /command = HELPER or MODERATOR. Telegram admins always retain access.',
    section: 'people',
    type: 'textarea',
    maxLength: 2000,
    placeholder: '/warn = HELPER\n/mute = MODERATOR',
    defaultValue:
      '/warn = HELPER\n/delete = HELPER\n/mute = MODERATOR\n/unmute = MODERATOR\n/ban = MODERATOR\n/unban = MODERATOR\n/kick = MODERATOR\n/info = HELPER\n/member = HELPER\n/warnings = HELPER\n/clearwarnings = MODERATOR\n/stats = MODERATOR\n/staff = HELPER'
  },
  {
    key: 'telegramGroupHelpLanguage',
    label: 'Bot language',
    description: 'Preferred Group Help interface language.',
    section: 'operations',
    type: 'select',
    options: ['English', 'Hindi', 'Italian', 'Spanish', 'Portuguese', 'German', 'French'],
    maxLength: 30,
    defaultValue: 'English'
  },
  {
    key: 'telegramGroupHelpTimezone',
    label: 'Group time zone',
    description: 'Used for quiet hours and time-based group rules.',
    section: 'operations',
    type: 'select',
    options: ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Europe/London', 'America/New_York'],
    maxLength: 40,
    defaultValue: 'Asia/Kolkata'
  },
  {
    key: 'telegramGroupHelpLogChannelId',
    label: 'Log channel ID',
    description: 'Channel/group where moderation events should be logged.',
    section: 'operations',
    type: 'text',
    maxLength: 80,
    placeholder: '-1001234567890',
    defaultValue: ''
  },
  {
    key: 'telegramGroupHelpNightMode',
    label: 'Night mode',
    description: 'Desired quiet-hours behavior.',
    section: 'operations',
    type: 'select',
    options: ['off', 'mute all', 'delete media', 'delete all'],
    maxLength: 20,
    defaultValue: 'off'
  },
  {
    key: 'telegramGroupHelpNightStart',
    label: 'Night mode starts',
    description: 'Local group time in HH:MM format.',
    section: 'operations',
    type: 'text',
    maxLength: 5,
    placeholder: '22:00',
    defaultValue: '22:00'
  },
  {
    key: 'telegramGroupHelpNightEnd',
    label: 'Night mode ends',
    description: 'Local group time in HH:MM format.',
    section: 'operations',
    type: 'text',
    maxLength: 5,
    placeholder: '07:00',
    defaultValue: '07:00'
  },
  {
    key: 'telegramGroupHelpInactiveDays',
    label: 'Inactive-member window',
    description: 'Days without messages before a member appears in inactive review.',
    section: 'operations',
    type: 'number',
    maxLength: 5,
    defaultValue: '60'
  },
  {
    key: 'telegramGroupHelpStatisticsMode',
    label: 'Activity statistics',
    description: 'Desired member and growth statistics behavior.',
    section: 'operations',
    type: 'select',
    options: ['off', 'on', 'admins only'],
    maxLength: 20,
    defaultValue: 'admins only'
  },
  {
    key: 'telegramGroupHelpBackupRequest',
    label: 'Settings backup',
    description: 'Keep enabled to expose the backup command action.',
    section: 'operations',
    type: 'select',
    options: ['enabled', 'disabled'],
    maxLength: 10,
    defaultValue: 'enabled'
  },
  {
    key: 'telegramGroupHelpReloadRequest',
    label: 'Administrator refresh',
    description: 'Keep enabled to expose the admin reload action.',
    section: 'operations',
    type: 'select',
    options: ['enabled', 'disabled'],
    maxLength: 10,
    defaultValue: 'enabled'
  },
  ...[
    ['telegramGroupHelpAntiFloodCommandTemplate', 'Anti-flood action', '/antiflood {value}'],
    [
      'telegramGroupHelpAntiFloodLimitCommandTemplate',
      'Anti-flood sensitivity',
      '/setantiflood {value}'
    ],
    ['telegramGroupHelpAntiSpamCommandTemplate', 'Anti-spam', '/settings'],
    ['telegramGroupHelpAntiPornCommandTemplate', 'NSFW protection', '/settings'],
    ['telegramGroupHelpJoinProtectionCommandTemplate', 'Join protection', '/settings'],
    ['telegramGroupHelpJoinLeaveCommandTemplate', 'Join/leave messages', '/settings'],
    ['telegramGroupHelpMediaCommandTemplate', 'Media permissions', '/settings'],
    ['telegramGroupHelpForwardCommandTemplate', 'Forwarded messages', '/settings'],
    ['telegramGroupHelpAutoDeleteCommandTemplate', 'Scheduled deletion', '/settings'],
    ['telegramGroupHelpNightModeCommandTemplate', 'Night mode', '/settings'],
    ['telegramGroupHelpLanguageCommandTemplate', 'Language', '/language {value}'],
    ['telegramGroupHelpLogChannelCommandTemplate', 'Log channel', '/settings'],
    ['telegramGroupHelpStaffGroupCommandTemplate', 'Staff group', '/settings'],
    ['telegramGroupHelpReportsCommandTemplate', 'Member reports', '/settings'],
    ['telegramGroupHelpCustomRepliesCommandTemplate', 'Custom replies', '/settings'],
    ['telegramGroupHelpInactiveCommandTemplate', 'Inactive members', '/inactives {value}'],
    ['telegramGroupHelpBackupCommandTemplate', 'Settings backup', '/backup'],
    ['telegramGroupHelpReloadCommandTemplate', 'Reload administrators', '/reload']
  ].map(([key, label, defaultValue]) => ({
    key,
    label: `${label} command template`,
    description:
      'Editable command sent by a Telegram group administrator. /settings opens Group Help options that have no stable direct command.',
    section: 'commands' as const,
    type: 'text' as const,
    maxLength: 500,
    defaultValue
  }))
];

export const GROUP_HELP_CONFIG_FIELDS: GroupHelpConfigField[] = [
  ...GROUP_HELP_CORE_CONFIG_FIELDS,
  ...GROUP_HELP_ADVANCED_CONFIG_FIELDS
];

export const GROUP_HELP_CONFIG_KEYS = GROUP_HELP_CONFIG_FIELDS.map((field) => field.key);

export const GROUP_HELP_CONFIG_DEFAULTS = Object.fromEntries(
  GROUP_HELP_CONFIG_FIELDS.map((field) => [field.key, field.defaultValue])
) as Record<string, string>;

export const GROUP_HELP_CONFIG_META = Object.fromEntries(
  GROUP_HELP_CONFIG_FIELDS.map((field) => [field.key, field])
) as Record<string, GroupHelpConfigField>;
