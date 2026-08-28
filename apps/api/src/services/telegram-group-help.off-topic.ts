import {
  getTelegramCommunityGroupPolicy,
  saveTelegramCommunityGroupPolicy
} from './telegram-community-group-policy.js';
import { TELEGRAM_BOT_URLS } from '../constants/telegram-community-bot.constants.js';

export const HOPE_HUB_OFF_TOPIC_GROUP_TITLE = 'HopeHub Chit-Chat';
export const HOPE_HUB_OFF_TOPIC_GROUP_DESCRIPTION =
  'Hope Hub’s friendly off-topic community for everyday conversation, connection and safe chit-chat. Managed by HopeHubAI.';

export const HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS = `Talk privately | https://hopehub.in/#live-connect | success && Share anonymously | ${TELEGRAM_BOT_URLS.CONFESSION} | success
Group rules | ${TELEGRAM_BOT_URLS.RULES} | success && HopeHub website | https://hopehub.in/ | success`;

export const HOPE_HUB_OFF_TOPIC_GROUP_POLICY: Record<string, string> = {
  telegramGroupHelpGroupTitle: HOPE_HUB_OFF_TOPIC_GROUP_TITLE,
  telegramGroupHelpWelcomeButtons: HOPE_HUB_OFF_TOPIC_WELCOME_BUTTONS,
  telegramGroupHelpWelcomeMessage: `Hi {mention} 👋

Welcome to *HopeHub Chit-Chat* — Hope Hub’s relaxed, off-topic community space.

Use this group for friendly conversations, everyday updates, hobbies, humour and healthy connection. You can speak freely, but please protect your privacy and be considerate of people who may be having a difficult day.

• Be respectful and inclusive.
• Do not send unwanted private messages.
• No harassment, sexual content, hate, scams, spam or promotions.
• Do not present yourself as a therapist or offer unsafe medical advice.
• Report concerning behaviour to the admins.

For private emotional support, use HopeHub Live through the button below.`,
  telegramGroupHelpAboutMessage: `*About HopeHub Chit-Chat*

This is Hope Hub’s community room for friendly, informal and off-topic conversation.

You can use it to:
• Meet and talk with community members.
• Share everyday moments, interests and positive updates.
• Join light conversations without turning every discussion into a support session.
• Find the official Hope Hub routes when you need a listener or professional care.

This group is managed by the Hope Hub bot for safety. It is not therapy, medical care or an emergency service.`,
  telegramGroupHelpRulesMessage: `*HopeHub Chit-Chat rules*

1. Treat every member with respect.
2. Protect privacy; do not repost messages or personal information.
3. No bullying, hate, sexual content, threats or harassment.
4. No spam, scams, unsolicited promotions or repeated links.
5. Do not send unwanted private messages or pressure people to talk privately.
6. Do not impersonate professionals or give unsafe medical advice.
7. Use /report on a message when moderator help is needed.
8. For urgent danger, contact local emergency services; this group is not emergency care.`,
  telegramGroupHelpSupportMessage:
    'For private emotional support, visit https://hopehub.in/#live-connect. You can choose chat, voice or video based on provider availability. This group is not an emergency service.',
  telegramGroupHelpPinnedMessage: `*Welcome to HopeHub Chit-Chat*

Friendly off-topic conversation is welcome here. Keep it respectful, protect privacy, avoid unsolicited DMs and use /report if something feels unsafe.

Private support: https://hopehub.in/#live-connect`,
  telegramGroupHelpRecurringMessage:
    'Community reminder: keep conversations respectful, protect personal details, avoid unsolicited DMs and report unsafe behaviour to the admins.',
  telegramGroupHelpJoinProtection: 'captcha',
  telegramGroupHelpCaptchaMode: 'on',
  telegramGroupHelpJoinLeaveMessages: 'join only',
  telegramGroupHelpWelcomeCleanup: 'on',
  telegramGroupHelpFirstMessageReview: 'off',
  telegramGroupHelpNewMemberAction: 'staff review',
  telegramGroupHelpAntiFloodAction: 'mute',
  telegramGroupHelpAntiFloodLimit: '5 2',
  telegramGroupHelpAntiSpamAction: 'warn',
  telegramGroupHelpAntiPornAction: 'review',
  telegramGroupHelpLinkPolicy: 'warn',
  telegramGroupHelpMediaPolicy: 'allow',
  telegramGroupHelpForwardPolicy: 'warn',
  telegramGroupHelpChannelSenderPolicy: 'delete',
  telegramGroupHelpReportsMode: 'staff group',
  telegramGroupHelpLogChannelId: '',
  telegramGroupHelpStaffGroupId: '',
  telegramGroupHelpIdentityChangeAlerts: 'staff only',
  telegramGroupHelpNightMode: 'off',
  telegramGroupHelpStatisticsMode: 'admins only',
  telegramGroupHelpTimezone: 'Asia/Kolkata'
};

/**
 * Creates the independent policy once, while preserving later changes made by
 * this group's administrators through /settings.
 */
export async function ensureHopeHubOffTopicGroupPolicy(chatId: string) {
  const existing = await getTelegramCommunityGroupPolicy(chatId);
  return saveTelegramCommunityGroupPolicy(chatId, {
    ...HOPE_HUB_OFF_TOPIC_GROUP_POLICY,
    ...existing
  });
}

export function offTopicPolicyWithPrivateModeration(
  policy: Record<string, string>,
  privateGroupId: string
) {
  return {
    ...policy,
    telegramGroupHelpLogChannelId: privateGroupId,
    telegramGroupHelpStaffGroupId: privateGroupId,
    telegramGroupHelpReportsMode: 'staff group'
  };
}

export async function connectHopeHubOffTopicModerationGroup(
  offTopicChatId: string,
  privateGroupId: string
) {
  const existing = await getTelegramCommunityGroupPolicy(offTopicChatId);
  return saveTelegramCommunityGroupPolicy(
    offTopicChatId,
    offTopicPolicyWithPrivateModeration(existing, privateGroupId)
  );
}
