import { prisma } from '../db.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  checkTelegramGroupFlood,
  checkTelegramGroupRepeatedSpam
} from './telegram-community-bots.store.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate
} from './telegram-community-bots.types.js';
import {
  recordTelegramCommunityActivity,
  recordTelegramCampaignPollUpdate,
  recordTelegramCommunityReaction,
  recordTelegramCommunityDeparture,
  welcomeTelegramCommunityMembers,
  handleTelegramCommunityVoiceChatStarted,
  handleTelegramCommunityVoiceChatEnded
} from './telegram-community-campaigns.js';
import { ingestTelegramLiveChatMessage } from './telegram-live-chat-bridge.js';
import {
  endTelegramCommunityLockdown,
  startTelegramCommunityLockdown
} from './telegram-community-group-policy.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  bannedPhrases,
  containsLink,
  customReply,
  floodThreshold,
  groupHelpConfig as config,
  hasMedia,
  isForward,
  isWithinQuietHours,
  matchedBannedPhrase,
  mediaKinds
} from './telegram-group-help.config.js';
import { isModerationExempt } from './telegram-group-help.permissions.js';
import {
  deleteGroupHelpMessage as deleteMessage,
  sendGroupHelpActivityLog,
  sendModerationLog,
  sendTemporaryGroupHelpMessage as sendTemporaryMessage
} from './telegram-group-help.actions.js';
import { moderateGroupHelpMessage as moderate } from './telegram-group-help.moderation.js';
import {
  registerGroupHelpLogGroup as registerLogGroup,
  registerGroupHelpTestGroup as registerTestGroup
} from './telegram-group-help.registration.js';
import { handleGroupHelpCallback } from './telegram-group-help.callbacks.js';
import {
  GROUP_HELP_DEFAULT_STAFF_COMMANDS,
  handleGroupHelpCommand
} from './telegram-group-help.commands.js';
import {
  configuredGroupHelpChatIds,
  groupHelpCommandContextFromConfig,
  groupHelpCommandFailureMessage
} from './telegram-group-help.command-context.js';
import { queueGroupHelpMessageReview } from './telegram-group-help.approval.js';
import {
  handleGroupHelpBotSettingsInput,
  handleGroupHelpPrivateSettingsStart
} from './telegram-group-help.bot-settings.js';
import { handleGroupHelpCommandConfirmationCallback } from './telegram-group-help.command-confirmation.js';
import { recordGroupHelpCommandAudit } from './telegram-group-help.command-audit.js';
import { recordGroupHelpStaffGroupMember } from './telegram-group-help.staff-members.js';
import {
  getTelegramCommunityMemberIdentityHistory,
  observeTelegramCommunityMember
} from './telegram-community-member-identity.js';
import { notifyTelegramBotFailure } from './telegram-bot-failure-alerts.js';

const BOT = GROUP_HELP_BOT_SLUG;

function forwardedTelegramUserId(message: CommunityTelegramMessage) {
  if (message.forward_from?.id) return message.forward_from.id;
  const origin = message.forward_origin;
  if (!origin || typeof origin !== 'object') return 0;
  const value = origin as {
    type?: string;
    sender_user?: { id?: number | string };
    user?: { id?: number | string };
  };
  if (value.type !== 'user') return 0;
  const id = value.sender_user?.id ?? value.user?.id;
  return typeof id === 'number' || typeof id === 'string' ? Number(id) : 0;
}

function distinctNonEmpty(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))
    )
  ];
}

function truncateIdentityAliases(values: string[], maximum = 24) {
  const limited = values.slice(-maximum);
  const suffix =
    values.length > limited.length ? ` (+${values.length - limited.length} older)` : '';
  return `${limited.join(' • ')}${suffix}` || 'None recorded';
}

async function handleCommand(message: CommunityTelegramMessage, values: Record<string, string>) {
  const chatId = String(message.chat.id);
  try {
    const handled = await handleGroupHelpCommand(message, values);
    if (!handled) {
      await sendCommunityMessage(
        BOT,
        chatId,
        'This command is not available. Send /help to see the commands you can use.'
      );
    }
    return true;
  } catch (error) {
    console.error('[telegram-group-help] Command failed.', {
      command: message.text?.trim().split(/\s+/)[0],
      chatId,
      userId: message.from?.id,
      error
    });
    void notifyTelegramBotFailure({
      bot: BOT,
      area: 'group command',
      error,
      chatId,
      updateId: message.message_id
    });
    const context = groupHelpCommandContextFromConfig(chatId, values);
    await recordGroupHelpCommandAudit({
      message,
      targetChatId: context.targetChatId || undefined,
      status: 'FAILED',
      detail: error instanceof Error ? error.message : String(error),
      logChatId: values.telegramGroupHelpLogChannelId
    }).catch(() => null);
    await sendCommunityMessage(BOT, chatId, groupHelpCommandFailureMessage(error)).catch(
      () => null
    );
    return true;
  }
}

export async function handleHopeHubAiBotUpdate(update: CommunityTelegramUpdate) {
  if (update.message_reaction) {
    await recordTelegramCommunityReaction(update);
    return;
  }
  if (update.poll || update.poll_answer) {
    await recordTelegramCampaignPollUpdate(update);
    return;
  }
  if (
    await handleGroupHelpCommandConfirmationCallback(update, async (confirmedMessage) => {
      const confirmedValues = await config(String(confirmedMessage.chat.id));
      await handleCommand(confirmedMessage, confirmedValues);
    })
  )
    return;
  if (await handleGroupHelpCallback(update)) return;
  const message = update.message || update.channel_post;
  const membership = update.chat_member;
  const chat = message?.chat || membership?.chat;
  if (!chat) return;
  const anonymousAdminMessage = Boolean(
    message?.sender_chat && String(message.sender_chat.id) === String(message.chat.id)
  );
  if (message && message.from?.is_bot && !anonymousAdminMessage) return;
  if (message && (await registerTestGroup(message))) return;
  if (message && (await registerLogGroup(message))) return;
  const chatId = String(chat.id);
  const values = await config(chatId);
  if (message?.chat.type === 'private') {
    if (await handleGroupHelpPrivateSettingsStart(message)) return;
    if (await handleGroupHelpBotSettingsInput(message)) return;
    if (message.text?.startsWith('/')) {
      await handleCommand(message, values);
      return;
    }
    const forwardedUserId = forwardedTelegramUserId(message);
    if (forwardedUserId) {
      await handleCommand({ ...message, text: `/history ${forwardedUserId}` }, values);
      return;
    }
    await sendCommunityMessage(BOT, chatId, values.telegramGroupHelpSupportMessage);
    return;
  }
  const allowedGroups = configuredGroupHelpChatIds(values);
  const chatUsername = chat.username ? `@${chat.username.toLowerCase()}` : '';
  if (
    !allowedGroups.length ||
    (!allowedGroups.includes(chatId.toLowerCase()) &&
      (!chatUsername || !allowedGroups.includes(chatUsername)))
  ) {
    return;
  }
  const commandContext = groupHelpCommandContextFromConfig(chatId, values);
  if (commandContext.isControlGroup) {
    await recordGroupHelpStaffGroupMember(
      update,
      values.telegramGroupHelpStaffGroupId || '',
      values.telegramGroupHelpGroupChatId || '',
      GROUP_HELP_DEFAULT_STAFF_COMMANDS,
      values.telegramGroupHelpLogChannelId || ''
    );
    if (commandContext.configurationError) {
      if (message?.text?.startsWith('/')) {
        await sendCommunityMessage(BOT, chatId, commandContext.configurationError);
      }
      return;
    }
    if (message?.text?.startsWith('/')) await handleCommand(message, values);
    return;
  }
  if (await recordTelegramCommunityDeparture(update)) return;
  if (await welcomeTelegramCommunityMembers(update)) return;
  if (!message) return;
  if (message.from && !message.from.is_bot) {
    const identity = await observeTelegramCommunityMember({
      chatId,
      member: message.from,
      source: 'MESSAGE'
    });
    if (identity.changed) {
      const alertMode = values.telegramGroupHelpIdentityChangeAlerts || 'public full history';
      if (alertMode !== 'off') {
        await sendGroupHelpActivityLog(values, 'Member identity changed', [
          `Group: ${message.chat.title || message.chat.id} (${message.chat.id})`,
          `Member ID: ${message.from.id}`,
          `Changed: ${identity.changedFields.join(', ')}`,
          identity.changedFields.includes('name')
            ? `Name: ${identity.previousDisplayName || 'no public name'} → ${identity.displayName || 'no public name'}`
            : null,
          identity.changedFields.includes('username')
            ? `Username: ${identity.previousUsername ? `@${identity.previousUsername}` : 'not set'} → ${identity.username ? `@${identity.username}` : 'not set'}`
            : null,
          `Observed name changes: ${identity.nameChangeCount}`
        ]);
      }
      if (alertMode === 'public summary' || alertMode === 'public full history') {
        const history = await getTelegramCommunityMemberIdentityHistory(chatId, message.from.id);
        const previousNames = distinctNonEmpty(history.map((entry) => entry.previousDisplayName));
        const previousUsernames = distinctNonEmpty(
          history.map((entry) => entry.previousUsername).map((username) => `@${username}`)
        );
        const publicDetails =
          alertMode === 'public full history'
            ? [
                `Previous names: ${truncateIdentityAliases(previousNames)}`,
                `Previous usernames: ${truncateIdentityAliases(previousUsernames)}`,
                `Name changes recorded: ${identity.nameChangeCount}`
              ]
            : ['Previous details are available to the moderation team.'];
        await sendCommunityMessage(
          BOT,
          chatId,
          [
            'Profile updated',
            `Member: ${identity.displayName || 'Telegram member'} (${message.from.id})`,
            `Changed: ${identity.changedFields.join(' and ')}`,
            ...publicDetails
          ].join('\n')
        ).catch(() => null);
      }
    }
  }
  if (await handleTelegramCommunityVoiceChatStarted(message)) return;
  if (await handleTelegramCommunityVoiceChatEnded(message)) return;
  if (message.text?.startsWith('/')) {
    await handleCommand(message, values);
    return;
  }
  if (await handleGroupHelpBotSettingsInput(message)) return;
  if (message.sender_chat && values.telegramGroupHelpChannelSenderPolicy !== 'allow') {
    await deleteMessage(chatId, message.message_id).catch(() => null);
    await sendModerationLog(values, message, 'Message sent as a channel', 'delete');
    return;
  }
  if (!message.from) return;
  if (await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || '')) {
    await recordTelegramCommunityActivity(
      chatId,
      message.date ? new Date(message.date * 1000) : undefined
    );
    await ingestTelegramLiveChatMessage(message);
    return;
  }

  const warnLimit = Math.max(1, Number(values.telegramGroupHelpWarnLimit || 3));
  const warnAction = values.telegramGroupHelpWarnAction || 'mute';
  const text = `${message.text || ''}\n${message.caption || ''}`.trim();
  // Admin configuration uses off / 1 / 2 / 3. The older "on" check meant
  // first-message review was silently disabled even when an admin selected it.
  if (
    values.telegramGroupHelpFirstMessageReview !== 'off' &&
    Number(values.telegramGroupHelpFirstMessageReview || 0) > 0 &&
    (await queueGroupHelpMessageReview(message, values, 'FIRST_MESSAGE_REVIEW'))
  ) {
    return;
  }
  if (
    values.telegramGroupHelpAntiPornAction === 'review' &&
    hasMedia(message) &&
    (await queueGroupHelpMessageReview(message, values, 'MEDIA_REVIEW'))
  ) {
    return;
  }
  const quietMode = values.telegramGroupHelpNightMode || 'off';
  if (
    isWithinQuietHours(values) &&
    (quietMode === 'delete all' || (quietMode === 'delete media' && hasMedia(message)))
  ) {
    await moderate(message, 'Quiet hours', 'delete', warnLimit, warnAction);
    return;
  }
  const rawMaxLength = Number(values.telegramGroupHelpMaxMessageLength);
  const maxLength = rawMaxLength > 0 ? Math.max(100, rawMaxLength) : 4000;
  if (text.length > maxLength) {
    await moderate(
      message,
      `Message too long (${text.length} characters; maximum ${maxLength})`,
      'warn',
      warnLimit,
      warnAction
    );
    return;
  }
  const blockedPhrase = matchedBannedPhrase(
    text,
    bannedPhrases(values.telegramGroupHelpBannedWords)
  );
  if (blockedPhrase) {
    await moderate(message, `Blocked phrase: “${blockedPhrase}”`, 'warn', warnLimit, warnAction);
    return;
  }
  if (containsLink(text) && values.telegramGroupHelpLinkPolicy !== 'allow') {
    await moderate(
      message,
      'Unapproved link',
      values.telegramGroupHelpLinkPolicy,
      warnLimit,
      warnAction
    );
    return;
  }
  if (isForward(message) && values.telegramGroupHelpForwardPolicy !== 'allow') {
    await moderate(
      message,
      'Forwarded message',
      values.telegramGroupHelpForwardPolicy,
      warnLimit,
      warnAction
    );
    return;
  }
  if (hasMedia(message) && ['delete', 'warn'].includes(values.telegramGroupHelpMediaPolicy)) {
    await moderate(
      message,
      'Media policy',
      values.telegramGroupHelpMediaPolicy,
      warnLimit,
      warnAction
    );
    return;
  }
  const allowedMedia = new Set(
    (values.telegramGroupHelpAllowedMedia || '')
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
  if (
    hasMedia(message) &&
    allowedMedia.size &&
    mediaKinds(message).some((kind) => !allowedMedia.has(kind))
  ) {
    await moderate(message, 'Media type is not allowed', 'delete', warnLimit, warnAction);
    return;
  }

  const antiSpamAction = values.telegramGroupHelpAntiSpamAction || 'off';
  if (antiSpamAction !== 'off' && text.length >= 8) {
    const repeated = await checkTelegramGroupRepeatedSpam({
      chatId,
      telegramUserId: String(message.from.id),
      text
    });
    if (repeated.repeated) {
      await moderate(message, 'Repeated message spam', antiSpamAction, warnLimit, warnAction);
      return;
    }
  }

  const threshold = floodThreshold(values.telegramGroupHelpAntiFloodLimit || '6 10');
  const flood = await checkTelegramGroupFlood({
    chatId,
    telegramUserId: String(message.from.id),
    limit: threshold.limit,
    windowSeconds: threshold.seconds
  });
  if (flood.exceeded) {
    await moderate(
      message,
      'Rapid messages',
      values.telegramGroupHelpAntiFloodAction || 'mute',
      warnLimit,
      warnAction
    );
    return;
  }
  const reply = text ? customReply(text, values.telegramGroupHelpCustomReplies || '') : '';
  if (reply) {
    await sendTemporaryMessage(chatId, reply, values, {
      reply_to_message_id: message.message_id,
      message_thread_id: message.message_thread_id
    });
  }
  await recordTelegramCommunityActivity(
    chatId,
    message.date ? new Date(message.date * 1000) : undefined
  );
  await ingestTelegramLiveChatMessage(message);
}
