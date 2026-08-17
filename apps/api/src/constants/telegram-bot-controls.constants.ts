export type TelegramBotControlType = 'boolean' | 'number' | 'text' | 'textarea';

export type TelegramBotControlMeta = {
  label: string;
  description: string;
  group: 'Protection' | 'Shared links' | 'Confession bot' | 'Contact bot' | 'Rules bot';
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
  telegramSubmissionRetentionDays: '180',
  telegramEngagementRetentionDays: '90',
  telegramDeliveryRetentionDays: '180',
  telegramConfessionDailyLimit: '5',
  telegramContactDailyLimit: '10',
  telegramConfessionMinCharacters: '5',
  telegramConfessionMaxCharacters: '4000',
  telegramContactMinCharacters: '5',
  telegramContactMaxCharacters: '4000',
  telegramConfessionSafetyScreeningEnabled: 'true',
  telegramConfessionWelcomeText:
    '💙 Welcome to Hope Hub Anonymous Confessions. Share what is on your mind without publishing your Telegram identity.',
  telegramConfessionAdminChatId: '',
  telegramConfessionApprovalGroupId: '',
  telegramConfessionChannelId: '',
  telegramConfessionChannelName: 'Hope Hub Anonymous Confessions',
  telegramConfessionStartNumber: '1000',
  telegramConfessionMenuLinks:
    '💙 HopeHub | https://hopehub.in | primary\n🆘 Get Help | https://hopehub.in/contact | danger',
  telegramConfessionSafetyMessage:
    'Your message may describe immediate danger. This bot cannot provide emergency help. If you may act now or cannot stay safe, contact local emergency services or a trusted person who can stay with you. Your confession can still be reviewed anonymously below.',
  telegramContactWelcomeText:
    '👋 Welcome to Hope Hub Support. Choose a category and our team will respond as soon as possible.',
  telegramContactSupportGroupId: '',
  telegramContactMenuLinks:
    '🩷 Confession Bot | https://t.me/Hopehubconfessionbot | danger\n💙 HopeHub | https://hopehub.in | primary',
  telegramContactUnavailableMessage:
    'We could not send your message because the support inbox is unavailable. Your draft is safe—please try again shortly.',
  telegramRulesWelcomeText:
    '💙 Hope Hub Rules & Guidelines. Choose a topic below to understand the community.',
  telegramRulesAboutText:
    '🌐 *About HopeHub Community*\n\nHopeHub is a safe, non-judgmental space to share mental-health struggles and connect with people who understand. We encourage professional help, a listening ear, kindness, and anonymous participation.\n\n💙 *You are not alone.*',
  telegramRulesRulesText:
    '📋 *HopeHub Community Rules*\n\n*1. Be kind and respectful.* No hate, discrimination, bullying, or harassment.\n\n*2. No unsolicited professional advice.* Share experience, but do not diagnose or prescribe.\n\n*3. Keep it anonymous.* Do not request or share identifying information.\n\n*4. No promotion or spam* without admin approval.\n\n*5. Media and links require approval.*\n\n*6. No DMs without consent.*\n\n*7. Handle sensitive topics with care* and recommend professional or emergency help where appropriate.\n\n*8. Report violations; do not argue.*\n\n*9. Seek approval before sharing resources.*\n\n*10. Respect admin decisions.*',
  telegramRulesDisclaimerText:
    '⚠️ *HopeHub Disclaimer*\n\nHopeHub is a wellbeing support community, not a medical, psychiatric, legal, or emergency service. Community content is not diagnosis or treatment. Always consult a qualified professional for medical concerns and contact emergency services in a crisis.\n\nHopeHub cannot guarantee confidentiality in group chats and does not moderate private conversations between members. External resources are independent of HopeHub.',
  telegramRulesPrivacyText:
    '🔒 *Privacy Guide — Stay Safe on Telegram*\n\nSet your phone number and calls to “My Contacts” or “Nobody”; restrict who can add you to groups; review active sessions; enable two-step verification and a passcode; and avoid sharing personal details.\n\nBlock unwanted private messages and report concerns through @Contacthopehubbot.',
  telegramRulesReportText:
    '🚨 *How to Report a Rule Violation*\n\nSend @Contacthopehubbot a screenshot, message link, and short description. Wait for admins to investigate. Do not confront the person, publish accusations, or privately message admins.',
  telegramRulesHelplineText:
    '📞 *Mental Health Helplines*\n\nIf you are in immediate danger, contact local emergency services.\n\n*India:*\n• iCall: 9152987821\n• Vandrevala Foundation: 1860-2662-345\n• NIMHANS: 080-46110007\n\n*International:*\n• Samaritans (UK): 116 123\n• Lifeline (Australia): 13 11 14\n• Find local crisis support: https://www.iasp.info/resources/Crisis_Centres/\n\nThese services are independent of HopeHub.',
  telegramRulesMenuLinks:
    '🩷 Confession Bot | https://t.me/Hopehubconfessionbot | danger\n📬 Contact Us | https://t.me/Contacthopehubbot | success\n💙 HopeHub Website | https://hopehub.in | primary',
  telegramCampaignContactUrl: 'https://t.me/Contacthopehubbot'
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
  telegramSubmissionRetentionDays: {
    label: 'Ticket and confession retention',
    description: 'Days to retain completed contact tickets and confession records.',
    group: 'Protection',
    type: 'number',
    min: 30,
    max: 730,
    maxLength: 3
  },
  telegramEngagementRetentionDays: {
    label: 'Engagement-data retention',
    description: 'Days to retain poll votes, reactions, and departed-member records.',
    group: 'Protection',
    type: 'number',
    min: 30,
    max: 730,
    maxLength: 3
  },
  telegramDeliveryRetentionDays: {
    label: 'Campaign-delivery retention',
    description: 'Days to retain sent, closed, and failed campaign-delivery diagnostics.',
    group: 'Protection',
    type: 'number',
    min: 30,
    max: 730,
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
  telegramConfessionAdminChatId: {
    label: 'Fallback reviewer chat ID',
    description: 'Private admin chat used only when no approval group is configured.',
    group: 'Confession bot',
    type: 'text',
    maxLength: 64
  },
  telegramConfessionApprovalGroupId: {
    label: 'Approval group ID',
    description: 'Private Telegram group where confessions are reviewed.',
    group: 'Confession bot',
    type: 'text',
    maxLength: 64
  },
  telegramConfessionChannelId: {
    label: 'Publishing channel ID',
    description: 'Telegram channel ID or @username where approved confessions are published.',
    group: 'Confession bot',
    type: 'text',
    maxLength: 64
  },
  telegramConfessionChannelName: {
    label: 'Publishing channel name',
    description: 'Fallback channel name appended to every published confession.',
    group: 'Confession bot',
    type: 'text',
    maxLength: 120
  },
  telegramConfessionStartNumber: {
    label: 'Starting confession number',
    description: 'Number added to the internal submission sequence for public numbering.',
    group: 'Confession bot',
    type: 'number',
    min: 0,
    max: 10000000,
    maxLength: 8
  },
  telegramConfessionMenuLinks: {
    label: 'Menu links',
    description: 'One per line: Label | https://link | primary, success, or danger.',
    group: 'Confession bot',
    type: 'textarea',
    maxLength: 2000
  },
  telegramConfessionSafetyMessage: {
    label: 'Immediate-safety message',
    description: 'Guidance shown when a confession may describe immediate danger.',
    group: 'Confession bot',
    type: 'textarea',
    maxLength: 2000
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
  telegramContactSupportGroupId: {
    label: 'Support inbox group ID',
    description: 'Private Telegram group that receives contact requests.',
    group: 'Contact bot',
    type: 'text',
    maxLength: 64
  },
  telegramContactMenuLinks: {
    label: 'Menu links',
    description: 'One per line: Label | https://link | primary, success, or danger.',
    group: 'Contact bot',
    type: 'textarea',
    maxLength: 2000
  },
  telegramContactUnavailableMessage: {
    label: 'Support unavailable message',
    description: 'Message shown when the support inbox is not configured or reachable.',
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
  },
  telegramRulesAboutText: {
    label: 'About HopeHub',
    description: 'Content opened from About Us.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesRulesText: {
    label: 'Community rules',
    description: 'Complete rules shown inside the Rules bot.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesDisclaimerText: {
    label: 'Disclaimer',
    description: 'Community and professional-support disclaimer.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesPrivacyText: {
    label: 'Privacy guide',
    description: 'Telegram privacy and account-safety guidance.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesReportText: {
    label: 'Reporting guide',
    description: 'Instructions for reporting a community concern.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesHelplineText: {
    label: 'Helplines',
    description: 'Emergency and mental-health support resources.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 4000
  },
  telegramRulesMenuLinks: {
    label: 'Menu links',
    description: 'One per line: Label | https://link | primary, success, or danger.',
    group: 'Rules bot',
    type: 'textarea',
    maxLength: 2000
  },
  telegramCampaignContactUrl: {
    label: 'Campaign contact link',
    description: 'Button destination used when a campaign response offers private contact.',
    group: 'Shared links',
    type: 'text',
    maxLength: 500
  }
};

export const TELEGRAM_BOT_CONTROL_KEYS = Object.keys(
  TELEGRAM_BOT_CONTROL_DEFAULTS
) as TelegramBotControlKey[];
