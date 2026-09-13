import { prisma } from '../db.js';
import { getSiteConfigMap } from './site-config.service.js';
import { emitHopeHubLiveGroupMessage } from './hope-hub-live-groups-realtime.js';
import { sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { serializePublicHopeHubLiveGroupMessage } from './hope-hub-live-group-message-public.js';

const BRIDGE_CONFIG_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramLiveChatBridgeEnabled',
  'telegramLiveChatGroupSlug'
] as const;

function bridgeEnabled(value: string | undefined) {
  return !['disabled', 'false', '0', 'off'].includes((value || '').trim().toLowerCase());
}

function cleanDisplayName(value: string | null | undefined, fallback = 'Hope Hub member') {
  const cleaned = value
    ?.replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function telegramDisplayName(user?: CommunityTelegramMessage['from']) {
  if (user?.username?.trim()) return `@${user.username.trim().replace(/^@+/, '').slice(0, 32)}`;
  return cleanDisplayName(
    [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    'Telegram member'
  );
}

async function bridgeConfig() {
  const config = await getSiteConfigMap(BRIDGE_CONFIG_KEYS);
  return {
    enabled: bridgeEnabled(config.telegramLiveChatBridgeEnabled),
    telegramChatId: config.telegramGroupHelpGroupChatId.trim(),
    liveGroupSlug: config.telegramLiveChatGroupSlug.trim() || 'telegram-community'
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
      senderName: telegramDisplayName(message.from),
      senderRole: 'TELEGRAM_MEMBER',
      body: message.text.trim().slice(0, 2000),
      createdAt: message.date ? new Date(message.date * 1000) : undefined
    }
  });

  emitHopeHubLiveGroupMessage(group.id, serializePublicHopeHubLiveGroupMessage(created));
  return true;
}

export async function mirrorHopeHubLiveChatMessageToTelegram(input: {
  groupSlug: string;
  senderId: string;
  senderName: string;
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
      input.body.trim().slice(0, 4096)
    );
    return sent.message_id;
  } catch (error) {
    console.error('[telegram-live-chat] Could not mirror website message to Telegram.', error);
    return null;
  }
}
