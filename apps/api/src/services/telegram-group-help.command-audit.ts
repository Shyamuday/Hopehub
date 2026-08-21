import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';

export function recordGroupHelpCommandAudit(input: {
  message: CommunityTelegramMessage;
  targetChatId?: string;
  status: 'HANDLED' | 'DENIED' | 'FAILED' | 'CANCELLED';
  detail?: string;
  logChatId?: string;
}) {
  const sourceChatId = input.message._groupHelpControlSourceChatId || String(input.message.chat.id);
  const command = (input.message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const actorName = [input.message.from?.first_name, input.message.from?.last_name]
    .filter(Boolean)
    .join(' ');
  const actorUsername = input.message.from?.username || null;
  const write = prisma.telegramGroupHelpCommandAudit.create({
    data: {
      sourceChatId,
      targetChatId: input.targetChatId,
      actorUserId: input.message.from ? String(input.message.from.id) : null,
      actorUsername,
      actorName: actorName || null,
      sourceMessageId: input.message.message_id || null,
      command: command || 'unknown',
      status: input.status,
      detail: input.detail?.slice(0, 1000)
    }
  });
  const logChatId = input.logChatId?.trim();
  if (!logChatId) return write;
  return Promise.all([
    write,
    sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      logChatId,
      [
        'Command activity',
        `Status: ${input.status}`,
        `Command: ${command || 'unknown'}`,
        `Actor: ${telegramPersonLogLabel(input.message.from)}`,
        `Source group: ${sourceChatId}`,
        `Target group: ${input.targetChatId || input.message.chat.id}`,
        `Source message: ${input.message.message_id || 'not available'}`,
        input.detail ? `Detail: ${input.detail}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    ).catch(() => null)
  ]).then(([row]) => row);
}
