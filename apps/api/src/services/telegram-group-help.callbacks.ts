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
import type { CommunityTelegramUpdate } from './telegram-community-bots.types.js';

function settingsHomeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '💬 Messages', callback_data: 'hh_settings_messages' },
        { text: '🛡 Safety', callback_data: 'hh_settings_safety' }
      ],
      [
        { text: '🔧 Operations', callback_data: 'hh_settings_operations' },
        { text: '❓ Help', callback_data: 'hh_settings_help' }
      ]
    ]
  };
}

export async function handleGroupHelpCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data) return false;
  if (await handleTelegramCommunityJoinVerificationCallback(update)) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'You’re all set. Welcome to Hope Hub 💙'
    );
    return true;
  }
  if (await handleTelegramCommunityEventCallback(update)) {
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'You’re on the list 💙');
    return true;
  }
  if (!callback.data.startsWith('hh_settings_')) {
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
    return true;
  }
  const chatId = String(callback.message.chat.id);
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
  const page = callback.data.slice('hh_settings_'.length);
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
      ? settingsHomeKeyboard()
      : { inline_keyboard: [[{ text: '← Back to settings', callback_data: 'hh_settings_home' }]] }
  });
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
  return true;
}
