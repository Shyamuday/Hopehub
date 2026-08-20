import { prisma } from '../db.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export function recordGroupHelpCommandAudit(input: {
  message: CommunityTelegramMessage;
  targetChatId?: string;
  status: 'HANDLED' | 'DENIED' | 'FAILED' | 'CANCELLED';
  detail?: string;
}) {
  const command = (input.message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  return prisma.telegramGroupHelpCommandAudit.create({
    data: {
      sourceChatId: String(input.message.chat.id),
      targetChatId: input.targetChatId,
      actorUserId: input.message.from ? String(input.message.from.id) : null,
      command: command || 'unknown',
      status: input.status,
      detail: input.detail?.slice(0, 1000)
    }
  });
}
