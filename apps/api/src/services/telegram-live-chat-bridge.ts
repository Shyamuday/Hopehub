import { prisma } from '../db.js';
import { getSiteConfigMap } from './site-config.service.js';
import { emitHopeHubLiveGroupMessage } from './hope-hub-live-groups-realtime.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';

const BRIDGE_CONFIG_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramLiveChatBridgeEnabled',
  'telegramLiveChatGroupSlug'
] as const;

function bridgeEnabled(value: string | undefined) {
  return !['disabled', 'false', '0', 'off'].includes((value || '').trim().toLowerCase());
}

async function bridgeConfig() {
  const config = await getSiteConfigMap(BRIDGE_CONFIG_KEYS);
  return {
    enabled: bridgeEnabled(config.telegramLiveChatBridgeEnabled),
    telegramChatId: config.telegramGroupHelpGroupChatId.trim(),
    liveGroupSlug: config.telegramLiveChatGroupSlug.trim() || 'telegram-community'
  };
}

function serializeBridgeMessage(message: {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  body: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedByUserId: string | null;
  createdAt: Date;
}) {
  return {
    ...message,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString()
  };
}

export async function ingestTelegramLiveChatMessage(message: CommunityTelegramMessage) {
  if (!message.text?.trim() || message.from?.is_bot) return false;
  if (!['group', 'supergroup'].includes(message.chat.type || '')) return false;
  if (message.text.trim().startsWith('/')) return false;

  const config = await bridgeConfig();
  if (!config.enabled || !config.telegramChatId) return false;
  if (String(message.chat.id) !== config.telegramChatId) return false;

  const group = await prisma.hopeHubLiveGroup.upsert({
    where: { slug: config.liveGroupSlug },
    create: {
      title: 'Hope Hub community chat',
      slug: config.liveGroupSlug,
      description:
        'A moderated community conversation shared between Hope Hub and our Telegram group.',
      callTitle: 'Hope Hub community chat',
      status: 'LIVE',
      mode: 'CHAT',
      isPublic: true,
      isActive: true,
      startsAt: new Date()
    },
    update: {
      status: 'LIVE',
      mode: 'CHAT',
      isPublic: true,
      isActive: true,
      endedAt: null
    }
  });

  const created = await prisma.hopeHubLiveGroupMessage.create({
    data: {
      groupId: group.id,
      senderId: `telegram:${message.from?.id || 'unknown'}`,
      senderName: 'Telegram member',
      senderRole: 'TELEGRAM_MEMBER',
      body: message.text.trim().slice(0, 2000),
      createdAt: message.date ? new Date(message.date * 1000) : undefined
    }
  });

  emitHopeHubLiveGroupMessage(group.id, serializeBridgeMessage(created));
  return true;
}

export async function mirrorHopeHubLiveChatMessageToTelegram(input: {
  groupSlug: string;
  body: string;
}) {
  const config = await bridgeConfig();
  if (!config.enabled || !config.telegramChatId || input.groupSlug !== config.liveGroupSlug) {
    return null;
  }

  try {
    const sent = await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      config.telegramChatId,
      `💬 Hope Hub member\n\n${input.body.trim().slice(0, 3900)}`
    );
    return sent.message_id;
  } catch (error) {
    console.error('[telegram-live-chat] Could not mirror website message to Telegram.', error);
    return null;
  }
}
