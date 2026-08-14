export type TelegramBotControlType = 'boolean' | 'number' | 'textarea';

export type TelegramBotControlMeta = {
  label: string;
  description: string;
  group: 'Protection' | 'Confession bot' | 'Contact bot' | 'Rules bot';
  type: TelegramBotControlType;
  min?: number;
  max?: number;
  maxLength: number;
};

export const TELEGRAM_BOT_CONTROL_DEFAULTS = {
  telegramProtectionEnabled: 'true',
  telegramRateLimitPerMinute: '15',
  telegramRateLimitBlockMinutes: '5',
  telegramCommunityStateTtlHours: '24',
  telegramConfessionDailyLimit: '5',
  telegramContactDailyLimit: '10',
  telegramConfessionMinCharacters: '5',
  telegramConfessionMaxCharacters: '4000',
  telegramContactMinCharacters: '5',
  telegramContactMaxCharacters: '4000',
  telegramConfessionSafetyScreeningEnabled: 'true',
  telegramConfessionWelcomeText:
    '💙 Welcome to Hope Hub Anonymous Confessions. Share what is on your mind without publishing your Telegram identity.',
  telegramContactWelcomeText:
    '👋 Welcome to Hope Hub Support. Choose a category and our team will respond as soon as possible.',
  telegramRulesWelcomeText:
    '💙 Hope Hub Rules & Guidelines. Choose a topic below to understand the community.'
} as const;

export type TelegramBotControlKey = keyof typeof TELEGRAM_BOT_CONTROL_DEFAULTS;

export const TELEGRAM_BOT_CONTROL_META: Record<TelegramBotControlKey, TelegramBotControlMeta> = {
  telegramProtectionEnabled: {
    label: 'Enable bot protection',
    description: 'Apply shared private-chat throttling to all Hope Hub API bots.',
    group: 'Protection',
    type: 'boolean',
    maxLength: 5
  },
  telegramRateLimitPerMinute: {
    label: 'Actions allowed per minute',
    description: 'Maximum private messages accepted from one Telegram account per minute.',
    group: 'Protection',
    type: 'number',
    min: 3,
    max: 100,
    maxLength: 3
  },
  telegramRateLimitBlockMinutes: {
    label: 'Temporary block duration',
    description: 'Minutes a user waits after exceeding the action limit.',
    group: 'Protection',
    type: 'number',
    min: 1,
    max: 1440,
    maxLength: 4
  },
  telegramCommunityStateTtlHours: {
    label: 'Unfinished form expiry',
    description: 'Hours before an abandoned confession or contact flow is cleared.',
    group: 'Protection',
    type: 'number',
    min: 1,
    max: 168,
    maxLength: 3
  },
  telegramConfessionDailyLimit: {
    label: 'Confessions per 24 hours',
    description: 'Maximum final confession submissions from one Telegram account.',
    group: 'Confession bot',
    type: 'number',
    min: 1,
    max: 100,
    maxLength: 3
  },
  telegramConfessionMinCharacters: {
    label: 'Minimum confession length',
    description: 'Minimum characters required before preview.',
    group: 'Confession bot',
    type: 'number',
    min: 1,
    max: 500,
    maxLength: 3
  },
  telegramConfessionMaxCharacters: {
    label: 'Maximum confession length',
    description: 'Maximum characters accepted by the confession bot.',
    group: 'Confession bot',
    type: 'number',
    min: 100,
    max: 4000,
    maxLength: 4
  },
  telegramConfessionSafetyScreeningEnabled: {
    label: 'Safety screening',
    description:
      'Show urgent-support guidance and flag possible immediate-risk submissions for review.',
    group: 'Confession bot',
    type: 'boolean',
    maxLength: 5
  },
  telegramConfessionWelcomeText: {
    label: 'Welcome text',
    description: 'Plain text shown when someone opens the confession bot.',
    group: 'Confession bot',
    type: 'textarea',
    maxLength: 1200
  },
  telegramContactDailyLimit: {
    label: 'Contact tickets per 24 hours',
    description: 'Maximum final support tickets from one Telegram account.',
    group: 'Contact bot',
    type: 'number',
    min: 1,
    max: 100,
    maxLength: 3
  },
  telegramContactMinCharacters: {
    label: 'Minimum message length',
    description: 'Minimum characters required before ticket preview.',
    group: 'Contact bot',
    type: 'number',
    min: 1,
    max: 500,
    maxLength: 3
  },
  telegramContactMaxCharacters: {
    label: 'Maximum message length',
    description: 'Maximum characters accepted by the contact bot.',
    group: 'Contact bot',
    type: 'number',
    min: 100,
    max: 4000,
    maxLength: 4
  },
  telegramContactWelcomeText: {
    label: 'Welcome text',
    description: 'Plain text shown when someone opens the contact bot.',
    group: 'Contact bot',
    type: 'textarea',
    maxLength: 1200
  },
  telegramRulesWelcomeText: {
    label: 'Welcome text',
    description: 'Plain text shown above the Rules bot menu.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 1200
  }
};

export const TELEGRAM_BOT_CONTROL_KEYS = Object.keys(
  TELEGRAM_BOT_CONTROL_DEFAULTS
) as TelegramBotControlKey[];
