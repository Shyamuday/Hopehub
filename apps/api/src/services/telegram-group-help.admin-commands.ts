import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  endTelegramCommunityLockdown,
  startTelegramCommunityLockdown
} from './telegram-community-group-policy.js';
import {
  sendGroupHelpActivityLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { isModerationExempt } from './telegram-group-help.permissions.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { groupHelpSettingsHomeKeyboard } from './telegram-group-help.menu.js';

export async function handleGroupHelpAdminCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (!['/settings', '/lockdown', '/unlock'].includes(command)) return false;
  if (
    !message.from ||
    !(await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || ''))
  )
    return true;
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);
  if (command === '/settings') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      '⚙️ *Hope Hub group settings*\n\nChoose what you want to review.',
      {
        parse_mode: 'Markdown',
        reply_markup: groupHelpSettingsHomeKeyboard()
      }
    );
    return true;
  }
  if (command === '/lockdown') {
    const minutes = Math.max(1, Math.min(720, Number(parts[1]) || 30));
    const chat = await callCommunityTelegramApi<{ permissions?: Record<string, boolean> }>(
      GROUP_HELP_BOT_SLUG,
      'getChat',
      { chat_id: chatId }
    );
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatPermissions', {
      chat_id: chatId,
      permissions: { can_send_messages: false }
    });
    await startTelegramCommunityLockdown({
      chatId,
      minutes,
      originalPermissions: chat.permissions || { can_send_messages: true }
    });
    await sendTemporaryGroupHelpMessage(chatId, `🔒 Chat locked for ${minutes} minutes.`, values);
    await sendGroupHelpActivityLog(values, 'Chat locked', [
      `Group: ${message.chat.title || chatId}`,
      `Duration: ${minutes} minutes`,
      `By: ${message.from.first_name || 'Administrator'} (${message.from.id})`
    ]);
    return true;
  }
  const policy = await prisma.telegramCommunityGroupPolicy.findUnique({ where: { chatId } });
  const saved =
    policy && typeof policy.settings === 'object' && !Array.isArray(policy.settings)
      ? (policy.settings as Record<string, unknown>).__lockdownPermissions
      : null;
  const permissions = typeof saved === 'string' ? JSON.parse(saved) : { can_send_messages: true };
  await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatPermissions', {
    chat_id: chatId,
    permissions
  });
  await endTelegramCommunityLockdown(chatId).catch(() => null);
  await sendTemporaryGroupHelpMessage(chatId, '🔓 Chat unlocked.', values);
  await sendGroupHelpActivityLog(values, 'Chat unlocked', [
    `Group: ${message.chat.title || chatId}`,
    `By: ${message.from.first_name || 'Administrator'} (${message.from.id})`
  ]);
  return true;
}
