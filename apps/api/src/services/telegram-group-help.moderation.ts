import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { sendModerationLog } from './telegram-group-help.actions.js';

/**
 * Automatic moderation is advisory only. Detection may flag a message for the
 * private staff group, but only an authorised human can delete content or
 * restrict a member through the alert controls or explicit staff commands.
 */
export async function moderateGroupHelpMessage(
  message: CommunityTelegramMessage,
  reason: string,
  action: string,
  _warnLimit: number,
  _warnAction: string
) {
  if (action === 'off' || !message.from) return false;
  const values = await groupHelpConfig(String(message.chat.id));
  const text = `${message.text || message.caption || ''}`.trim();
  const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
  console.log(
    `[group-moderation] REVIEW | reason="${reason}" suggestedAction="${action}" ` +
      `user=${message.from.id} (${message.from.first_name || 'unknown'}) ` +
      `chat=${message.chat.id} (${message.chat.title || 'private'}) ` +
      `msgId=${message.message_id} len=${text.length} ` +
      `preview="${preview.replace(/\n/g, ' ')}"`
  );
  await sendModerationLog(values, message, reason, 'review', { suggestedAction: action });
  return true;
}
