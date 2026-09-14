import {
  addTelegramGroupWarning,
  clearTelegramGroupWarnings
} from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import {
  applyGroupHelpMemberAction,
  applyGroupHelpWarningLimitAction,
  deleteGroupHelpMessage,
  sendModerationLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import { groupHelpWarnPolicySummary } from './telegram-group-help.warning-policy.js';

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
  const warningPolicy = groupHelpWarnPolicySummary({
    ...values,
    telegramGroupHelpWarnLimit: String(warnLimit),
    telegramGroupHelpWarnAction: warnAction
  });
  const warnings = await addTelegramGroupWarning({
    chatId,
    telegramUserId: String(message.from.id),
    reason,
    warningExpirySeconds: warningPolicy.expiry.seconds
  });
  let finalAction = action;
  let finalReason = reason;
  let warningLimitApplied = false;
  if (warnings >= warningPolicy.limit) {
    const mode = await applyGroupHelpWarningLimitAction(
      chatId,
      message.from.id,
      warningPolicy.mode.value,
      Number(values.telegramGroupHelpMuteMinutes || 60)
    ).catch(() => null);
    if (mode) {
      finalAction = mode.action;
      finalReason = `${reason} (warning-limit action: ${mode.value})`;
      await clearTelegramGroupWarnings(chatId, String(message.from.id));
      warningLimitApplied = true;
    }
  } else if (['mute', 'kick', 'ban'].includes(finalAction)) {
    await applyGroupHelpMemberAction(
      chatId,
      message.from.id,
      finalAction,
      Number(values.telegramGroupHelpMuteMinutes || 60)
    ).catch(() => null);
  }
  await sendModerationLog(values, message, finalReason, finalAction);
  await sendTemporaryGroupHelpMessage(
    chatId,
    warningLimitApplied
      ? `Community safety action applied after ${warnings} warnings. Warnings were reset.`
      : `Please follow the community rules. Warning ${warnings}/${warningPolicy.limit}.`,
    values,
    { reply_to_message_id: message.message_id, message_thread_id: message.message_thread_id }
  ).catch(() => null);
  return true;
}
