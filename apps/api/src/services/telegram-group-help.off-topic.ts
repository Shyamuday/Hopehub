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

Welcome to *HopeHub Chit-Chat* — a relaxed off-topic place to talk and have fun.

You can share everyday updates, hobbies, jokes, memes, photos, videos, GIFs, stickers, music and voice notes.

Just keep it friendly:
• Be kind and respect people’s privacy.
• No adult/graphic content, bullying, hate, scams or repeated spam.
• Ask before sending someone a private message.
• Use /report if something feels unsafe.

For private emotional support, use HopeHub Live through the button below.`,
  telegramGroupHelpAboutMessage: `*About HopeHub Chit-Chat*

This is Hope Hub’s community room for friendly, informal and off-topic conversation.

You can use it to:
• Meet and talk with community members.
• Share everyday moments, interests and positive updates.
• Join light conversations without turning every discussion into a support session.
• Find the official Hope Hub routes when you need a listener or professional care.

This group is managed by the Hope Hub bot for safety. It is not therapy, medical care or an emergency service.`,
  telegramGroupHelpRulesMessage: `*HopeHub Chit-Chat — simple rules*

1. Be kind. No bullying, hate, threats or harassment.
2. Photos, videos, GIFs, stickers, music, documents and voice notes are welcome.
3. Keep media safe: no adult, graphic, illegal or privacy-breaking content.
4. No scams, repeated spam or unwanted promotion.
5. Ask before privately messaging another member.
6. Reply with /report when moderator help is needed.

That’s it — relax, talk and enjoy the community.`,
  telegramGroupHelpSupportMessage:
    'For private emotional support, visit https://hopehub.in/#live-connect. You can choose chat, voice or video based on provider availability. This group is not an emergency service.',
  telegramGroupHelpPinnedMessage: `*Welcome to HopeHub Chit-Chat*

Chat freely and share safe photos, videos, GIFs, stickers, music and voice notes. Be kind, avoid unwanted DMs and use /report if something feels unsafe.

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
  telegramGroupHelpAllowedMedia: 'photo\nvideo\naudio\nvoice\nGIF\nsticker\ndocument\npoll',
  telegramGroupHelpForwardPolicy: 'allow',
  telegramGroupHelpQuotePolicy: 'allow',
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
