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
  matchesBannedPhrase,
  mediaKinds
} from './telegram-group-help.config.js';
import { isModerationExempt } from './telegram-group-help.permissions.js';
import {
  deleteGroupHelpMessage as deleteMessage,
  sendModerationLog,
  sendTemporaryGroupHelpMessage as sendTemporaryMessage
} from './telegram-group-help.actions.js';
import { moderateGroupHelpMessage as moderate } from './telegram-group-help.moderation.js';
import {
  registerGroupHelpLogGroup as registerLogGroup,
  registerGroupHelpTestGroup as registerTestGroup
} from './telegram-group-help.registration.js';
import { handleGroupHelpCallback } from './telegram-group-help.callbacks.js';
import { handleGroupHelpCommand } from './telegram-group-help.commands.js';
import { queueGroupHelpMessageReview } from './telegram-group-help.approval.js';
import { handleGroupHelpBotSettingsInput } from './telegram-group-help.bot-settings.js';

const BOT = GROUP_HELP_BOT_SLUG;

async function handleCommand(message: CommunityTelegramMessage, values: Record<string, string>) {
  return handleGroupHelpCommand(message, values);
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
  if (await handleGroupHelpCallback(update)) return;
  const message = update.message;
  const membership = update.chat_member;
  const chat = message?.chat || membership?.chat;
  if (!chat) return;
  if (message && message.from?.is_bot) return;
  if (message && (await registerTestGroup(message))) return;
  if (message && (await registerLogGroup(message))) return;
  const chatId = String(chat.id);
  const values = await config(chatId);
  if (message?.chat.type === 'private') {
    if (message.text?.startsWith('/') && (await handleCommand(message, values))) return;
    await sendCommunityMessage(BOT, chatId, values.telegramGroupHelpSupportMessage);
    return;
  }
  const allowedGroups = [
    values.telegramGroupHelpGroupChatId,
    values.telegramGroupHelpTestGroupChatId
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  const chatUsername = chat.username ? `@${chat.username.toLowerCase()}` : '';
  if (
    allowedGroups.length &&
    !allowedGroups.includes(chatId.toLowerCase()) &&
    (!chatUsername || !allowedGroups.includes(chatUsername))
  )
    return;
  if (await recordTelegramCommunityDeparture(update)) return;
  if (await welcomeTelegramCommunityMembers(update)) return;
  if (!message) return;
  if (await handleTelegramCommunityVoiceChatEnded(message)) return;
  if (message.text?.startsWith('/') && (await handleCommand(message, values))) return;
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
  if (
    values.telegramGroupHelpFirstMessageReview === 'on' &&
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
  const maxLength = Math.max(100, Number(values.telegramGroupHelpMaxMessageLength || 4000));
  if (text.length > maxLength) {
    await moderate(message, 'Message too long', 'warn', warnLimit, warnAction);
    return;
  }
  if (matchesBannedPhrase(text, bannedPhrases(values.telegramGroupHelpBannedWords))) {
    await moderate(message, 'Blocked phrase', 'warn', warnLimit, warnAction);
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
