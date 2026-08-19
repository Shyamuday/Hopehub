import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  handleTelegramCommunityEventCallback,
  handleTelegramCommunityJoinVerificationCallback
} from './telegram-community-campaigns.js';
import {
  answerCommunityCallback,
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { telegramGroupWarningCount } from './telegram-community-bots.store.js';
import {
  groupHelpMainMenuKeyboard,
  groupHelpPrivateSettingsKeyboard,
  groupHelpSettingsHomeKeyboard
} from './telegram-group-help.menu.js';
import { handleGroupHelpBotSettingsCallback } from './telegram-group-help.bot-settings.js';
import { handleGroupHelpModerationActionCallback } from './telegram-group-help.actions.js';
import type { CommunityTelegramUpdate } from './telegram-community-bots.types.js';

export async function handleGroupHelpCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data) return false;
  let moderationAction: Awaited<ReturnType<typeof handleGroupHelpModerationActionCallback>>;
  try {
    moderationAction = await handleGroupHelpModerationActionCallback(update);
  } catch (error) {
    console.error('[telegram-group-help] Moderation action failed.', error);
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Could not complete this action. Check the bot permissions and try again.'
    ).catch(() => null);
    return true;
  }
  if (moderationAction) {
    const notice =
      moderationAction === 'denied'
        ? 'Only an administrator of the original group can use this action.'
        : moderationAction === 'expired'
          ? 'This action is no longer available.'
          : moderationAction === 'repost'
            ? 'Message reposted in the group.'
            : moderationAction === 'allowphrase'
              ? 'Phrase allowed in this group going forward.'
              : moderationAction === 'blockphrase'
                ? 'Phrase will be blocked in this group going forward.'
                : `${moderationAction[0].toUpperCase()}${moderationAction.slice(1)} completed.`;
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, notice);
    return true;
  }
  const joinVerification = await handleTelegramCommunityJoinVerificationCallback(update);
  if (joinVerification) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      joinVerification === 'verified'
        ? 'You’re all set. Welcome to Hope Hub.'
        : joinVerification === 'incorrect'
          ? 'That answer is not correct. Please try again.'
          : joinVerification === 'review'
            ? 'Your request was sent to the community team for review.'
            : joinVerification === 'approved'
              ? 'Member approved and unlocked.'
              : joinVerification === 'denied'
                ? 'Only an administrator of that community can approve this member.'
                : 'Verification was not completed. Please ask an admin for help.'
    );
    return true;
  }
  if (await handleTelegramCommunityEventCallback(update)) {
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'You’re on the list 💙');
    return true;
  }
  if (await handleGroupHelpBotSettingsCallback(update)) return true;
  const chatId = String(callback.message.chat.id);
  if (callback.data === 'hh_menu_home') {
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, 'Choose what you need.', {
      reply_markup: groupHelpMainMenuKeyboard(
        ['group', 'supergroup'].includes(callback.message.chat.type || '') ? chatId : undefined
      )
    });
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
    return true;
  }
  if (callback.data === 'hh_menu_settings') {
    if (!['group', 'supergroup'].includes(callback.message.chat.type || '')) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'Open Admin settings from the community group.'
      );
      return true;
    }
    const membership = await callCommunityTelegramApi<{ status?: string }>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: chatId, user_id: callback.from.id }
    ).catch(() => null);
    if (!membership || !['creator', 'administrator'].includes(membership.status || '')) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'Only group admins can open settings.'
      );
      return true;
    }
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      'Open the group editor privately. Your access is checked before every change.',
      { reply_markup: groupHelpPrivateSettingsKeyboard(chatId) }
    );
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
    return true;
  }
  if (callback.data.startsWith('hh_menu_') && callback.data !== 'hh_menu_settings') {
    const values = await groupHelpConfig(chatId);
    const action = callback.data.slice('hh_menu_'.length);
    const warningCount =
      action === 'warnings' ? await telegramGroupWarningCount(chatId, String(callback.from.id)) : 0;
    const text =
      action === 'rules'
        ? values.telegramGroupHelpRulesMessage
        : action === 'support'
          ? values.telegramGroupHelpSupportMessage
          : action === 'warnings'
            ? `You currently have ${warningCount} warning${warningCount === 1 ? '' : 's'}.`
            : action === 'report'
              ? 'To report a group message, reply to it and send /report followed by a short reason. For immediate danger, contact local emergency services now.'
              : 'Use the menu for common actions. You can also send /help to see the complete command guide.';
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text, {
      reply_markup: { inline_keyboard: [[{ text: 'Main menu', callback_data: 'hh_menu_home' }]] }
    });
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
    return true;
  }
  if (!callback.data.startsWith('hh_settings_') && callback.data !== 'hh_menu_settings') {
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
    return true;
  }
  if (!['group', 'supergroup'].includes(callback.message.chat.type || '')) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Open Admin settings from the community group.'
    );
    return true;
  }
  const membership = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    {
      chat_id: chatId,
      user_id: callback.from.id
    }
  ).catch(() => null);
  if (!membership || !['creator', 'administrator'].includes(membership.status || '')) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Only group admins can open settings.'
    );
    return true;
  }
  const values = await groupHelpConfig(chatId);
  const page =
    callback.data === 'hh_menu_settings' ? 'home' : callback.data.slice('hh_settings_'.length);
  const isHome = page === 'home';
  const text = isHome
    ? '⚙️ *Hope Hub group settings*\n\nChoose what you want to review.'
    : page === 'messages'
      ? `💬 *Messages*\n\nWelcome: ${values.telegramGroupHelpWelcomeMessage ? 'set' : 'not set'}\nRules: ${values.telegramGroupHelpRulesMessage ? 'set' : 'not set'}\nTemporary replies: ${values.telegramGroupHelpAutoDeleteSeconds || '0'} seconds`
      : page === 'safety'
        ? `🛡 *Safety*\n\nFlood: ${values.telegramGroupHelpAntiFloodAction}\nLinks: ${values.telegramGroupHelpLinkPolicy}\nMedia: ${values.telegramGroupHelpMediaPolicy}\nWarning action: ${values.telegramGroupHelpWarnAction}`
        : page === 'operations'
          ? `🔧 *Operations*\n\nLog group: ${values.telegramGroupHelpLogChannelId ? 'connected' : 'not connected'}\nStaff group: ${values.telegramGroupHelpStaffGroupId ? 'connected' : 'not connected'}\nUse /lockdown 30 or /unlock for chat access.`
          : '❓ *Help*\n\nUse /rules, /support, /warnings, /report, /settings, /lockdown, and /unlock. Manage full policy values from Hope Hub Admin.';
  await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: isHome
      ? groupHelpSettingsHomeKeyboard()
      : { inline_keyboard: [[{ text: '← Back to settings', callback_data: 'hh_settings_home' }]] }
  });
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
  return true;
}
