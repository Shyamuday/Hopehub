import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  checkTelegramGroupFlood,
  checkTelegramGroupRepeatedSpam,
  scheduleCommunityMessageCleanup
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
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  bannedPhrases,
  containsLink,
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
  registerGroupHelpOffTopicGroup as registerOffTopicGroup
} from './telegram-group-help.registration.js';
import { handleGroupHelpCallback } from './telegram-group-help.callbacks.js';
import {
  GROUP_HELP_DEFAULT_STAFF_COMMANDS,
  groupHelpCommandDefinition,
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
  claimTelegramIdentityPublicAlert,
  getTelegramCommunityMemberIdentityHistory,
  observeTelegramCommunityMember,
  releaseTelegramIdentityPublicAlert
} from './telegram-community-member-identity.js';
import { publicIdentityChangeAlert } from './telegram-group-help.identity-alert.js';
import { notifyTelegramBotFailure } from './telegram-bot-failure-alerts.js';
import {
  forwardGroupHelpAdminMention,
  hasGroupHelpAdminMention
} from './telegram-group-help.admin-mentions.js';
import { handleGroupHelpReportCommand } from './telegram-group-help.reports.js';
import {
  groupHelpFilterCooldownSeconds,
  matchingGroupHelpFilter,
  renderGroupHelpFilterHtml
} from './telegram-group-help.filters.js';
import { formatGroupHelpMessage } from './telegram-group-help.formatting.js';
import { openGroupHelpNote } from './telegram-group-help.note-actions.js';
import { groupHelpNoteRequestedByText } from './telegram-group-help.notes.js';
import {
  groupCommandDeleteDelaySeconds,
  shouldAutoDeleteGroupCommand
} from './telegram-group-help.command-cleanup.js';
import {
  GROUP_HELP_CLEAN_COMMAND_TYPES,
  GROUP_HELP_CLEAN_MESSAGE_TYPES,
  GROUP_HELP_CLEAN_SERVICE_TYPES,
  groupHelpServiceMessageType,
  shouldCleanGroupHelpType
} from './telegram-group-help.cleaning.js';
import { matchedGroupHelpLock } from './telegram-group-help.locks.js';
import {
  isGroupHelpRulesRequest,
  sendGroupHelpRulesMessage
} from './telegram-group-help.rules-message.js';
import {
  claimTelegramOperation,
  releaseTelegramOperation
} from './telegram-community-operation-claims.js';
import { handleGroupHelpFilterBuilderInput } from './telegram-group-help.filter-builder.js';

const BOT = GROUP_HELP_BOT_SLUG;

async function sendMatchingGroupHelpFilter(
  message: CommunityTelegramMessage,
  values: Record<string, string>,
  senderIsAdmin: boolean,
  category?: 'crisis' | 'wellbeing'
) {
  const filter = matchingGroupHelpFilter({
    text: `${message.text || ''}\n${message.caption || ''}`.trim(),
    definitions: values.telegramGroupHelpCustomReplies || '',
    senderIsBot: Boolean(message.from?.is_bot),
    senderIsAdmin,
    category
  });
  if (!filter) return false;
  const chatId = String(message.chat.id);
  // Crisis language must always receive the safety response. Older database
  // copies may still contain the former 30-minute cooldown, so ignore it at
  // runtime rather than waiting for every per-group policy to be rewritten.
  const cooldownSeconds = groupHelpFilterCooldownSeconds(filter);
  const cooldownClaim =
    filter.id && cooldownSeconds && message.from
      ? {
          operation: `${BOT}:filter-response:${filter.id}`,
          key: `${chatId}:${message.from.id}`
        }
      : undefined;
  if (filter.id && cooldownSeconds && message.from) {
    const claimed = await claimTelegramOperation({
      operation: `${BOT}:filter-response:${filter.id}`,
      key: `${chatId}:${message.from.id}`,
      expiresAt: new Date(Date.now() + cooldownSeconds * 1000)
    }).catch(() => true);
    // Treat a cooling-down support phrase as handled so it cannot accidentally
    // fall through into ordinary word moderation.
    if (!claimed) return true;
  }
  const releaseCooldownAfterFailure = async (error: unknown): Promise<never> => {
    if (cooldownClaim) await releaseTelegramOperation(cooldownClaim).catch(() => undefined);
    throw error;
  };
  const formatted = formatGroupHelpMessage(filter.text || '');
  const text = renderGroupHelpFilterHtml(formatted.text, message);
  const generatedRows = formatted.replyMarkup?.inline_keyboard || [];
  const replyMarkup =
    filter.button || generatedRows.length
      ? {
          inline_keyboard: [
            ...generatedRows,
            ...(filter.button ? [[{ text: filter.button.text, url: filter.button.url }]] : [])
          ]
        }
      : undefined;
  const replyMessageId =
    /\{replytag\}/i.test(filter.text || '') && message.reply_to_message
      ? message.reply_to_message.message_id
      : message.message_id;
  const base = {
    chat_id: chatId,
    reply_to_message_id: replyMessageId,
    ...(message.message_thread_id ? { message_thread_id: message.message_thread_id } : {})
  };
  if (!filter.media) {
    await sendTemporaryMessage(
      chatId,
      text,
      values,
      {
        reply_to_message_id: replyMessageId,
        message_thread_id: message.message_thread_id,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        disable_notification: formatted.disableNotification,
        protect_content: formatted.protectContent,
        link_preview_options: { is_disabled: !formatted.showLinkPreview }
      },
      'filter'
    ).catch(releaseCooldownAfterFailure);
    if (filter.notifyStaff) {
      await sendGroupHelpActivityLog(values, 'Immediate-support response sent', [
        `Member: ${message.from?.first_name || 'Telegram member'} (${message.from?.id || 'unknown'})`,
        `Group: ${message.chat.title || chatId} (${chatId})`,
        `Response: ${filter.id || filter.category || 'custom filter'}`
      ]);
    }
    return true;
  }
  const methodByType = {
    sticker: 'sendSticker',
    photo: 'sendPhoto',
    animation: 'sendAnimation',
    video: 'sendVideo',
    video_note: 'sendVideoNote',
    document: 'sendDocument',
    audio: 'sendAudio',
    voice: 'sendVoice'
  } as const;
  const payload = {
    ...base,
    [filter.media.type]: filter.media.fileId,
    ...(text && filter.media.type !== 'sticker' && filter.media.type !== 'video_note'
      ? { caption: text, parse_mode: 'HTML' }
      : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    disable_notification: formatted.disableNotification,
    protect_content: formatted.protectContent,
    ...(formatted.mediaSpoiler && ['photo', 'video', 'animation'].includes(filter.media.type)
      ? { has_spoiler: true }
      : {})
  };
  const sent = await callCommunityTelegramApi<{ message_id: number }>(
    BOT,
    methodByType[filter.media.type],
    payload
  ).catch(releaseCooldownAfterFailure);
  const delaySeconds = shouldCleanGroupHelpType(
    values.telegramGroupHelpCleanMessageTypes,
    'filter',
    GROUP_HELP_CLEAN_MESSAGE_TYPES,
    true
  )
    ? 60
    : 0;
  if (delaySeconds > 0) {
    await scheduleCommunityMessageCleanup({
      bot: BOT,
      chatId,
      messageId: sent.message_id,
      kind: 'transient',
      deleteAfter: new Date(Date.now() + delaySeconds * 1000)
    });
  }
  if (text && (filter.media.type === 'sticker' || filter.media.type === 'video_note')) {
    await sendTemporaryMessage(
      chatId,
      text,
      values,
      {
        reply_to_message_id: replyMessageId,
        message_thread_id: message.message_thread_id,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        disable_notification: formatted.disableNotification,
        protect_content: formatted.protectContent,
        link_preview_options: { is_disabled: !formatted.showLinkPreview }
      },
      'filter'
    );
  }
  if (filter.notifyStaff) {
    await sendGroupHelpActivityLog(values, 'Immediate-support response sent', [
      `Member: ${message.from?.first_name || 'Telegram member'} (${message.from?.id || 'unknown'})`,
      `Group: ${message.chat.title || chatId} (${chatId})`,
      `Response: ${filter.id || filter.category || 'custom filter'}`
    ]);
  }
  return true;
}

/**
 * A request to talk to someone is a care-seeking message, not a moderation
 * problem. Keep this deliberately narrow so ordinary messages are never
 * redirected unexpectedly.
 */
function isLiveConnectRequest(text: string, configuredPhrases = '') {
  const normalized = text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const asksForSomeone = /\b(?:any\s*one|nayone)\b/.test(normalized);
  const asksToTalk = /\b(?:for|to|foe)\s+(?:talk|chat|speak)\b/.test(normalized);
  if (asksForSomeone && asksToTalk) return true;
  return Boolean(matchedBannedPhrase(text, bannedPhrases(configuredPhrases)));
}

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

async function handleCommand(message: CommunityTelegramMessage, values: Record<string, string>) {
  const chatId = String(message.chat.id);
  if (message.chat.type === 'private') message._groupHelpPrivateControl = true;
  try {
    const handled = await handleGroupHelpCommand(message, values);
    if (!handled) {
      const membership = message.from
        ? await callCommunityTelegramApi<{ status?: string }>(BOT, 'getChatMember', {
            chat_id: chatId,
            user_id: message.from.id
          }).catch(() => null)
        : null;
      const senderIsAdmin = ['creator', 'administrator', 'owner'].includes(
        membership?.status || ''
      );
      if (await sendMatchingGroupHelpFilter(message, values, senderIsAdmin)) return true;
      await sendTemporaryMessage(
        chatId,
        'This command is not available. Send /help to see the commands you can use.',
        { ...values, telegramGroupHelpAutoDeleteSeconds: '60' }
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
    const auditValues = context.targetChatId
      ? await config(context.targetChatId).catch(() => values)
      : values;
    await recordGroupHelpCommandAudit({
      message,
      targetChatId: context.targetChatId || undefined,
      status: 'FAILED',
      detail: error instanceof Error ? error.message : String(error),
      logChatId: auditValues.telegramGroupHelpLogChannelId
    }).catch(() => null);
    await sendTemporaryMessage(chatId, groupHelpCommandFailureMessage(error), {
      ...values,
      telegramGroupHelpAutoDeleteSeconds: '60'
    }).catch(() => null);
    return true;
  } finally {
    const context = groupHelpCommandContextFromConfig(chatId, values);
    const delaySeconds = groupCommandDeleteDelaySeconds(
      values.telegramGroupHelpCommandDeleteSeconds
    );
    const commandName = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
    const definition = groupHelpCommandDefinition(commandName);
    const commandType: (typeof GROUP_HELP_CLEAN_COMMAND_TYPES)[number] = definition
      ? definition.minimumRole === 'MEMBER'
        ? 'user'
        : 'admin'
      : 'other';
    if (
      !message._groupHelpSkipCommandCleanup &&
      shouldAutoDeleteGroupCommand({
        chatType: message.chat.type,
        isControlGroup: context.isControlGroup,
        delaySeconds,
        commandType,
        configuredTypes: values.telegramGroupHelpCleanCommandTypes
      })
    ) {
      // Do not delay Telegram's webhook acknowledgement while the short
      // privacy timer runs. A failed cleanup is non-fatal; the command audit
      // remains available in the private moderation log.
      setTimeout(() => {
        void deleteMessage(chatId, message.message_id).catch((error) => {
          console.warn('[telegram-group-help] Could not remove group command.', {
            chatId,
            messageId: message.message_id,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }, delaySeconds * 1000).unref();
    }
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
  if (message && (await registerOffTopicGroup(message))) return;
  if (message && (await registerLogGroup(message))) return;
  const chatId = String(chat.id);
  const values = await config(chatId);
  if (message?.chat.type === 'private') {
    if (await handleGroupHelpPrivateSettingsStart(message)) return;
    if (await handleGroupHelpFilterBuilderInput(message)) return;
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
    const targetValues = commandContext.targetChatId
      ? await config(commandContext.targetChatId).catch(() => values)
      : values;
    await recordGroupHelpStaffGroupMember(
      update,
      targetValues.telegramGroupHelpStaffGroupId || '',
      commandContext.targetChatId || '',
      GROUP_HELP_DEFAULT_STAFF_COMMANDS,
      targetValues.telegramGroupHelpLogChannelId || ''
    );
    if (message && (await handleGroupHelpFilterBuilderInput(message))) return;
    if (commandContext.configurationError) {
      if (message?.text?.startsWith('/')) {
        await sendTemporaryMessage(chatId, commandContext.configurationError, {
          ...values,
          telegramGroupHelpAutoDeleteSeconds: '60'
        });
      }
      return;
    }
    if (message?.text?.startsWith('/')) await handleCommand(message, values);
    return;
  }
  const serviceType = message ? groupHelpServiceMessageType(message) : undefined;
  if (
    message &&
    serviceType &&
    shouldCleanGroupHelpType(
      values.telegramGroupHelpCleanServiceTypes,
      serviceType,
      GROUP_HELP_CLEAN_SERVICE_TYPES
    )
  ) {
    await deleteMessage(chatId, message.message_id).catch(() => null);
  }
  if (await recordTelegramCommunityDeparture(update)) return;
  if (await welcomeTelegramCommunityMembers(update)) return;
  if (!message) return;
  if (await handleGroupHelpFilterBuilderInput(message)) return;
  // Crisis replies are time-sensitive and do not depend on identity-history
  // writes or other moderation bookkeeping succeeding first.
  if (
    !message.text?.startsWith('/') &&
    (await sendMatchingGroupHelpFilter(message, values, false, 'crisis'))
  )
    return;
  if (message.from && !message.from.is_bot) {
    const identity = await observeTelegramCommunityMember({
      chatId,
      member: message.from,
      source: 'MESSAGE'
    }).catch((error) => {
      console.warn(
        '[telegram-group-help] Identity observation failed; continuing message handling.',
        {
          chatId,
          telegramUserId: message.from?.id,
          error
        }
      );
      return null;
    });
    if (identity?.changed) {
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
      if (
        (alertMode === 'public summary' || alertMode === 'public full history') &&
        (await claimTelegramIdentityPublicAlert({
          chatId,
          telegramUserId: message.from.id
        }))
      ) {
        const history = await getTelegramCommunityMemberIdentityHistory(chatId, message.from.id);
        const previousNames = distinctNonEmpty(history.map((entry) => entry.previousDisplayName));
        const previousUsernames = distinctNonEmpty(
          history.map((entry) => (entry.previousUsername ? `@${entry.previousUsername}` : null))
        );
        const publicMessage =
          alertMode === 'public full history'
            ? publicIdentityChangeAlert({
                telegramUserId: message.from.id,
                displayName: identity.displayName,
                changedFields: identity.changedFields,
                previousDisplayName: identity.previousDisplayName,
                previousUsername: identity.previousUsername,
                username: identity.username,
                previousNames,
                previousUsernames,
                nameChangeCount: identity.nameChangeCount
              })
            : [
                'Profile updated',
                '',
                `Member: ${identity.displayName || 'Telegram member'}`,
                `Telegram ID: ${message.from.id}`,
                '',
                'Previous details are available to the moderation team.'
              ].join('\n');
        const publicAlert = await sendCommunityMessage(BOT, chatId, publicMessage).catch(
          () => null
        );
        if (!publicAlert) {
          await releaseTelegramIdentityPublicAlert({
            chatId,
            telegramUserId: message.from.id
          }).catch(() => null);
        }
        const identityAlertHours = Math.max(
          0,
          Math.min(720, Number(values.telegramGroupHelpIdentityAlertDeleteHours || 24))
        );
        if (publicAlert && identityAlertHours > 0) {
          await scheduleCommunityMessageCleanup({
            bot: BOT,
            chatId,
            messageId: publicAlert.message_id,
            kind: 'identity-alert',
            deleteAfter: new Date(Date.now() + identityAlertHours * 60 * 60_000)
          });
        }
      }
    }
  }
  if (await handleTelegramCommunityVoiceChatStarted(message)) return;
  if (await handleTelegramCommunityVoiceChatEnded(message)) return;
  if (message.text?.startsWith('/')) {
    if (
      matchedGroupHelpLock(message, values.telegramGroupHelpLockedTypes) === 'commands' &&
      !(await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || ''))
    ) {
      await moderate(message, 'Commands are currently locked', 'delete', 1, 'mute');
      return;
    }
    await handleCommand(message, values);
    return;
  }
  if (await handleGroupHelpBotSettingsInput(message)) return;
  // Telegram represents an anonymous group administrator as the group itself
  // in sender_chat. That is an admin message, not an external channel post,
  // and must never be caught by the channel-sender moderation rule.
  if (
    message.sender_chat &&
    !anonymousAdminMessage &&
    values.telegramGroupHelpChannelSenderPolicy !== 'allow'
  ) {
    await deleteMessage(chatId, message.message_id).catch(() => null);
    await sendModerationLog(values, message, 'Message sent as a channel', 'delete');
    return;
  }
  if (!message.from) return;
  if (isGroupHelpRulesRequest(message.text)) {
    await sendGroupHelpRulesMessage({
      chatId,
      values,
      replyToMessageId: message.message_id,
      messageThreadId: message.message_thread_id
    });
    return;
  }
  const requestedNote = groupHelpNoteRequestedByText(message.text);
  if (requestedNote) {
    const result = await openGroupHelpNote({
      message,
      sourceChatId: chatId,
      noteName: requestedNote,
      values
    });
    if (result === 'missing')
      await sendTemporaryMessage(chatId, `No note named #${requestedNote} exists.`, values);
    else if (result === 'denied')
      await sendTemporaryMessage(chatId, 'That note is restricted to administrators.', values);
    return;
  }
  if (hasGroupHelpAdminMention(message.text || '') && !message.reply_to_message) {
    const senderIsAdmin = await isModerationExempt(
      message,
      values.telegramGroupHelpAdminWhitelist || ''
    );
    if (!senderIsAdmin) await forwardGroupHelpAdminMention(message, values);
    await sendGroupHelpRulesMessage({
      chatId,
      values,
      replyToMessageId: message.message_id,
      messageThreadId: message.message_thread_id
    });
    return;
  }
  if (await handleGroupHelpReportCommand(message, values)) return;
  if (await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || '')) {
    await sendMatchingGroupHelpFilter(message, values, true);
    await recordTelegramCommunityActivity(
      chatId,
      message.date ? new Date(message.date * 1000) : undefined
    );
    await ingestTelegramLiveChatMessage(message);
    return;
  }

  const lockedType = matchedGroupHelpLock(message, values.telegramGroupHelpLockedTypes);
  if (lockedType) {
    await moderate(
      message,
      `${lockedType[0].toUpperCase()}${lockedType.slice(1)} are currently locked`,
      'delete',
      1,
      'mute'
    );
    return;
  }

  if (await forwardGroupHelpAdminMention(message, values)) {
    await sendGroupHelpRulesMessage({
      chatId,
      values,
      replyToMessageId: message.message_id,
      messageThreadId: message.message_thread_id
    });
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
  if (await sendMatchingGroupHelpFilter(message, values, false)) {
    await recordTelegramCommunityActivity(
      chatId,
      message.date ? new Date(message.date * 1000) : undefined
    );
    await ingestTelegramLiveChatMessage(message);
    return;
  }
  const blockedPhrase = matchedBannedPhrase(
    text,
    bannedPhrases(values.telegramGroupHelpBannedWords)
  );
  if (isLiveConnectRequest(text, values.telegramGroupHelpSupportRedirectPhrases)) {
    const liveConnectUrl = values.telegramCommunitySupportUrl?.trim();
    await sendTemporaryMessage(
      chatId,
      'If you would like to talk privately, Hope Hub Live can help you find support.',
      values,
      {
        reply_to_message_id: message.message_id,
        message_thread_id: message.message_thread_id,
        ...(liveConnectUrl && /^https:\/\//i.test(liveConnectUrl)
          ? {
              reply_markup: {
                inline_keyboard: [[{ text: 'Talk live', url: liveConnectUrl }]]
              }
            }
          : {})
      }
    );
    return;
  }
  const reviewPhrase = matchedBannedPhrase(
    text,
    bannedPhrases(values.telegramGroupHelpReviewPhrases)
  );
  if (reviewPhrase) {
    await deleteMessage(chatId, message.message_id);
    await sendModerationLog(values, message, `Privacy review phrase: “${reviewPhrase}”`, 'delete');
    const liveConnectUrl = values.telegramCommunitySupportUrl?.trim();
    await sendTemporaryMessage(
      chatId,
      'For everyone’s privacy, direct contact requests are not posted in the group. You can use Hope Hub Live when you would like private support.',
      values,
      {
        message_thread_id: message.message_thread_id,
        ...(liveConnectUrl && /^https:\/\//i.test(liveConnectUrl)
          ? {
              reply_markup: {
                inline_keyboard: [[{ text: 'Talk live', url: liveConnectUrl }]]
              }
            }
          : {})
      }
    );
    return;
  }
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
  await recordTelegramCommunityActivity(
    chatId,
    message.date ? new Date(message.date * 1000) : undefined
  );
  await ingestTelegramLiveChatMessage(message);
}
