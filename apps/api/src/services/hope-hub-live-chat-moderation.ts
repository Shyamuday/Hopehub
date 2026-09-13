import { prisma } from '../db.js';
import {
  addTelegramGroupWarning,
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
import {
  applyGroupHelpMemberAction,
  sendGroupHelpActivityLog
} from './telegram-group-help.actions.js';

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

  const reviewPhrase = matchedBannedPhrase(
    text,
    bannedPhrases(values.telegramGroupHelpReviewPhrases || '')
  );
  if (reviewPhrase) {
    return { action: 'delete', reason: `Privacy review phrase: “${reviewPhrase}”` };
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

function resultMessage(input: {
  action: string;
  reason: string;
  warningCount: number | null;
  warningLimit: number;
  muteMinutes: number;
}) {
  if (input.action === 'ban') {
    return `This message was not posted and your account was blocked from this room. Reason: ${input.reason}`;
  }
  if (input.action === 'kick') {
    return `This message was not posted and your access was temporarily restricted. Reason: ${input.reason}`;
  }
  if (input.action === 'mute') {
    return `This message was not posted and you were muted for ${input.muteMinutes} minutes. Reason: ${input.reason}`;
  }
  if (input.warningCount !== null) {
    return `This message was not posted. Warning ${input.warningCount}/${input.warningLimit}: ${input.reason}`;
  }
  return `This message was not posted. Reason: ${input.reason}`;
}

async function applyWebsiteMemberAction(input: {
  groupId: string;
  userId: string;
  displayName: string;
  role: string;
  action: string;
  reason: string;
  muteMinutes: number;
}) {
  if (!['mute', 'kick', 'ban'].includes(input.action)) return;
  const now = new Date();
  const mutedUntil = new Date(now.getTime() + input.muteMinutes * 60_000);
  await prisma.hopeHubLiveGroupMemberModeration.upsert({
    where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
    create: {
      groupId: input.groupId,
      userId: input.userId,
      displayName: input.displayName,
      role: input.role,
      isMuted: input.action === 'mute' || input.action === 'kick',
      mutedUntil: input.action === 'mute' || input.action === 'kick' ? mutedUntil : null,
      isBanned: input.action === 'ban',
      bannedAt: input.action === 'ban' ? now : null,
      removedAt: input.action === 'kick' ? now : null,
      reason: input.reason,
      moderatedByUserId: null
    },
    update: {
      displayName: input.displayName,
      role: input.role,
      ...(input.action === 'mute' || input.action === 'kick' ? { isMuted: true, mutedUntil } : {}),
      ...(input.action === 'ban' ? { isBanned: true, bannedAt: now } : {}),
      ...(input.action === 'kick' ? { removedAt: now } : {}),
      reason: input.reason,
      moderatedByUserId: null
    }
  });
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
  const warningIdentity = linkedTelegram?.telegramUserId || `website:${input.userId}`;
  let violation = websiteLiveChatRuleViolation(input.text, values);

  if (!violation) {
    const antiSpamAction = values.telegramGroupHelpAntiSpamAction || 'off';
    if (antiSpamAction !== 'off' && input.text.length >= 8) {
      const repeated = await checkTelegramGroupRepeatedSpam({
        chatId: telegramChatId || `website:${input.groupId}`,
        telegramUserId: warningIdentity,
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
      telegramUserId: warningIdentity,
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

  const warningLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
  const muteMinutes = Math.max(1, Number(values.telegramGroupHelpMuteMinutes || 60));
  const warningCount =
    violation.action === 'delete'
      ? null
      : await addTelegramGroupWarning({
          chatId: telegramChatId || `website:${input.groupId}`,
          telegramUserId: warningIdentity,
          reason: `Website chat: ${violation.reason}`
        });
  const action =
    warningCount !== null && warningCount >= warningLimit
      ? values.telegramGroupHelpWarnAction || 'mute'
      : violation.action;

  await applyWebsiteMemberAction({
    groupId: input.groupId,
    userId: input.userId,
    displayName: input.userName,
    role: input.userRole,
    action,
    reason: violation.reason,
    muteMinutes
  });

  let telegramActionError = '';
  const linkedTelegramId = Number(linkedTelegram?.telegramUserId || '');
  if (
    telegramChatId &&
    Number.isSafeInteger(linkedTelegramId) &&
    linkedTelegramId > 0 &&
    ['mute', 'kick', 'ban'].includes(action)
  ) {
    try {
      await applyGroupHelpMemberAction(telegramChatId, linkedTelegramId, action, muteMinutes);
    } catch (error) {
      telegramActionError = error instanceof Error ? error.message : String(error);
    }
  }

  const compactText = input.text.replace(/\s+/g, ' ').trim();
  const preview = compactText.length > 700 ? `${compactText.slice(0, 700)}…` : compactText;
  await sendGroupHelpActivityLog(values, 'Website group message moderated', [
    `Action: ${action.toUpperCase()}`,
    `Rule / reason: ${violation.reason}`,
    warningCount === null ? 'Warnings: not added' : `Warnings: ${warningCount}/${warningLimit}`,
    `Website room: ${input.groupTitle} (${input.groupId})`,
    `Website member: ${input.userName} (${input.userId}) · role ${input.userRole}`,
    linkedTelegram?.telegramUserId
      ? `Linked Telegram: ${[linkedTelegram.firstName, linkedTelegram.lastName].filter(Boolean).join(' ') || 'Unknown'}${linkedTelegram.username ? ` (@${linkedTelegram.username})` : ''} (${linkedTelegram.telegramUserId})`
      : 'Linked Telegram: not connected',
    `Content: ${input.text.length} characters`,
    `Text: ${preview}`,
    telegramActionError ? `Telegram enforcement failed: ${telegramActionError}` : null
  ]);

  return {
    allowed: false,
    action,
    reason: violation.reason,
    warningCount,
    warningLimit,
    message: resultMessage({
      action,
      reason: violation.reason,
      warningCount,
      warningLimit,
      muteMinutes
    })
  };
}
