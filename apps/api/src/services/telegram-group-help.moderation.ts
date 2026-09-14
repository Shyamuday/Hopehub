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
import {
  groupHelpMemberModerationNotice,
  groupHelpModerationUntilLabel
} from './telegram-group-help.moderation-command.js';

function moderationMemberLabel(message: CommunityTelegramMessage) {
  return [
    message.from?.first_name || 'Telegram member',
    message.from?.username ? `(@${message.from.username})` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

async function sendClearAutomaticModerationNotice(input: {
  message: CommunityTelegramMessage;
  values: Record<string, string>;
  action: string;
  duration: string;
  until?: string;
  reason: string;
  warningStatus?: string;
}) {
  if (!input.message.from) return;
  const notice = groupHelpMemberModerationNotice({
    member: moderationMemberLabel(input.message),
    action: input.action,
    duration: input.duration,
    reason: input.reason,
    ...(input.until ? { until: input.until } : {}),
    ...(input.warningStatus ? { warningStatus: input.warningStatus } : {})
  });
  await sendTemporaryGroupHelpMessage(
    String(input.message.chat.id),
    notice,
    { ...input.values, telegramGroupHelpAutoDeleteSeconds: '60' },
    input.message.message_thread_id
      ? { message_thread_id: input.message.message_thread_id }
      : undefined
  ).catch(() => null);
}

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
    await sendClearAutomaticModerationNotice({
      message,
      values,
      action: 'Message removed',
      duration: 'Immediate',
      reason
    });
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
  const actionLabels: Record<string, string> = {
    warn: 'Warned',
    mute: 'Muted',
    ban: 'Banned',
    kick: 'Removed from group'
  };
  const configuredMuteSeconds =
    Math.max(1, Math.min(10_080, Number(values.telegramGroupHelpMuteMinutes || 60))) * 60;
  const durationSeconds = warningLimitApplied
    ? warningPolicy.mode.durationSeconds
    : finalAction === 'mute'
      ? configuredMuteSeconds
      : finalAction === 'warn'
        ? warningPolicy.expiry.seconds
        : undefined;
  const permanent =
    !durationSeconds && ['mute', 'ban'].includes(finalAction) ? 'Removed by an administrator' : '';
  await sendClearAutomaticModerationNotice({
    message,
    values,
    action: actionLabels[finalAction] || finalAction,
    duration: durationSeconds
      ? `${Math.ceil(durationSeconds / 60)}m`
      : finalAction === 'warn'
        ? 'Until removed by an administrator'
        : permanent
          ? 'Permanent'
          : 'Immediate',
    ...(durationSeconds
      ? { until: groupHelpModerationUntilLabel(durationSeconds) }
      : permanent
        ? { until: permanent }
        : {}),
    reason,
    warningStatus: warningLimitApplied
      ? `${warnings}/${warningPolicy.limit}; limit reached and warnings reset`
      : `${warnings}/${warningPolicy.limit}`
  });
  return true;
}
