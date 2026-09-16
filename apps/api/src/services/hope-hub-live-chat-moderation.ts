import { prisma } from '../db.js';
import {
  checkTelegramGroupFlood,
  checkTelegramGroupRepeatedSpam
} from './telegram-community-bots.store.js';
import {
  bannedPhrases,
  containsLink,
  floodThreshold,
  groupHelpConfig,
  matchedBannedPhrase
} from './telegram-group-help.config.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';

export type WebsiteLiveChatRuleViolation = {
  action: string;
  reason: string;
};

export type WebsiteLiveChatModerationResult =
  | { allowed: true }
  | {
      allowed: false;
      action: string;
      reason: string;
      warningCount: number | null;
      warningLimit: number;
      message: string;
    };

/** Applies the text-only subset of Group Help rules before a website message is stored. */
export function websiteLiveChatRuleViolation(
  text: string,
  values: Record<string, string>
): WebsiteLiveChatRuleViolation | null {
  const rawMaxLength = Number(values.telegramGroupHelpMaxMessageLength);
  const maxLength = rawMaxLength > 0 ? Math.max(100, rawMaxLength) : 4000;
  if (text.length > maxLength) {
    return {
      action: 'warn',
      reason: `Message too long (${text.length} characters; maximum ${maxLength})`
    };
  }

  const blockedPhrase = matchedBannedPhrase(
    text,
    bannedPhrases(values.telegramGroupHelpBannedWords || '')
  );
  if (blockedPhrase) {
    return { action: 'warn', reason: `Blocked phrase: “${blockedPhrase}”` };
  }

  const linkPolicy = values.telegramGroupHelpLinkPolicy || 'allow';
  if (containsLink(text) && linkPolicy !== 'allow') {
    return { action: linkPolicy, reason: 'Unapproved link' };
  }
  return null;
}

export async function moderateWebsiteLiveChatMessage(input: {
  groupId: string;
  groupTitle: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
}): Promise<WebsiteLiveChatModerationResult> {
  const baseValues = await groupHelpConfig();
  const telegramChatId = baseValues.telegramGroupHelpGroupChatId?.trim() || '';
  const values = telegramChatId ? await groupHelpConfig(telegramChatId) : baseValues;
  const linkedTelegram = await prisma.telegramBotSession.findFirst({
    where: { linkedUserId: input.userId, telegramUserId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { telegramUserId: true, username: true, firstName: true, lastName: true }
  });
  const moderationIdentity = linkedTelegram?.telegramUserId || `website:${input.userId}`;
  let violation = websiteLiveChatRuleViolation(input.text, values);

  if (!violation) {
    const antiSpamAction = values.telegramGroupHelpAntiSpamAction || 'off';
    if (antiSpamAction !== 'off' && input.text.length >= 8) {
      const repeated = await checkTelegramGroupRepeatedSpam({
        chatId: telegramChatId || `website:${input.groupId}`,
        telegramUserId: moderationIdentity,
        text: input.text
      });
      if (repeated.repeated) {
        violation = { action: antiSpamAction, reason: 'Repeated message spam' };
      }
    }
  }

  if (!violation) {
    const threshold = floodThreshold(values.telegramGroupHelpAntiFloodLimit || '6 10');
    const flood = await checkTelegramGroupFlood({
      chatId: telegramChatId || `website:${input.groupId}`,
      telegramUserId: moderationIdentity,
      limit: threshold.limit,
      windowSeconds: threshold.seconds
    });
    if (flood.exceeded) {
      violation = {
        action: values.telegramGroupHelpAntiFloodAction || 'mute',
        reason: 'Rapid messages'
      };
    }
  }

  if (!violation || ['allow', 'off'].includes(violation.action)) return { allowed: true };

  const compactText = input.text.replace(/\s+/g, ' ').trim();
  const preview = compactText.length > 700 ? `${compactText.slice(0, 700)}…` : compactText;
  await sendGroupHelpActivityLog(values, 'Website group message needs staff review', [
    `Policy suggestion: ${violation.action.toUpperCase()} (not applied)`,
    'Outcome: message withheld; no warning, mute, kick or ban was applied',
    `Rule / reason: ${violation.reason}`,
    `Website room: ${input.groupTitle} (${input.groupId})`,
    `Website member: ${input.userName} (${input.userId}) · role ${input.userRole}`,
    linkedTelegram?.telegramUserId
      ? `Linked Telegram: ${[linkedTelegram.firstName, linkedTelegram.lastName].filter(Boolean).join(' ') || 'Unknown'}${linkedTelegram.username ? ` (@${linkedTelegram.username})` : ''} (${linkedTelegram.telegramUserId})`
      : 'Linked Telegram: not connected',
    `Content: ${input.text.length} characters`,
    `Text: ${preview}`
  ]);

  return {
    allowed: false,
    action: 'review',
    reason: violation.reason,
    warningCount: null,
    warningLimit: 0,
    message: `This message was held for staff review. No restriction was applied. Reason: ${violation.reason}`
  };
}
