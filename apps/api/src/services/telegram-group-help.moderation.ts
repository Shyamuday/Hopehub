import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { addTelegramGroupWarning } from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import {
  applyGroupHelpMemberAction,
  deleteGroupHelpMessage,
  sendModerationLog
} from './telegram-group-help.actions.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';

export async function moderateGroupHelpMessage(
  message: CommunityTelegramMessage,
  reason: string,
  action: string,
  warnLimit: number,
  warnAction: string
) {
  const chatId = String(message.chat.id);
  const values = await groupHelpConfig(chatId);
  if (action === 'off' || !message.from) return false;

  const text = `${message.text || message.caption || ''}`.trim();
  const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
  console.log(
    `[group-moderation] DELETE | reason="${reason}" action="${action}" ` +
      `user=${message.from.id} (${message.from.first_name || 'unknown'}) ` +
      `chat=${message.chat.id} (${message.chat.title || 'private'}) ` +
      `msgId=${message.message_id} len=${text.length} ` +
      `preview="${preview.replace(/\n/g, ' ')}"`
  );

  await deleteGroupHelpMessage(chatId, message.message_id).catch(() => null);
  if (action === 'delete') {
    await sendModerationLog(values, message, reason, 'delete');
    return true;
  }
  const warnings = await addTelegramGroupWarning({
    chatId,
    telegramUserId: String(message.from.id),
    reason
  });
  const finalAction = warnings >= warnLimit ? warnAction : action;
  if (['mute', 'kick', 'ban'].includes(finalAction)) {
    await applyGroupHelpMemberAction(
      chatId,
      message.from.id,
      finalAction,
      Number(values.telegramGroupHelpMuteMinutes || 60)
    ).catch(() => null);
  }
  await sendModerationLog(values, message, reason, finalAction);
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    chatId,
    warnings >= warnLimit
      ? `Community safety action applied after ${warnings} warnings.`
      : `Please follow the community rules. Warning ${warnings}/${warnLimit}.`,
    { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
  ).catch(() => null);
  return true;
}
