import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { prisma } from '../db.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  ensureHopeHubOffTopicGroupPolicy,
  HOPE_HUB_OFF_TOPIC_GROUP_DESCRIPTION,
  HOPE_HUB_OFF_TOPIC_GROUP_TITLE
} from './telegram-group-help.off-topic.js';

async function isGroupAdmin(message: CommunityTelegramMessage) {
  if (!message.from || !['group', 'supergroup'].includes(message.chat.type || '')) return false;
  const member = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    {
      chat_id: message.chat.id,
      user_id: message.from.id
    }
  ).catch(() => null);
  return Boolean(member && ['creator', 'administrator'].includes(member.status || ''));
}

export async function registerGroupHelpOffTopicGroup(message: CommunityTelegramMessage) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command !== '/setofftopic') return false;
  if (!(await isGroupAdmin(message))) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      message.chat.id,
      'Only a group administrator can register this off-topic community.'
    );
    return true;
  }
  await prisma.siteConfig.upsert({
    where: { key: 'telegramGroupHelpOffTopicGroupChatId' },
    create: {
      key: 'telegramGroupHelpOffTopicGroupChatId',
      value: String(message.chat.id),
      label: 'Off-topic Telegram group ID'
    },
    update: { value: String(message.chat.id), label: 'Off-topic Telegram group ID' }
  });
  await ensureHopeHubOffTopicGroupPolicy(String(message.chat.id));
  const groupInfoUpdates = await Promise.allSettled([
    callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatTitle', {
      chat_id: message.chat.id,
      title: HOPE_HUB_OFF_TOPIC_GROUP_TITLE
    }),
    callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'setChatDescription', {
      chat_id: message.chat.id,
      description: HOPE_HUB_OFF_TOPIC_GROUP_DESCRIPTION
    })
  ]);
  const groupInfoUpdated = groupInfoUpdates.every((result) => result.status === 'fulfilled');
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    message.chat.id,
    `${HOPE_HUB_OFF_TOPIC_GROUP_TITLE} is now a permanent Hope Hub community. HopeHubAI onboarding, safety rules, moderation, reports and group-specific settings are active.${
      groupInfoUpdated
        ? ''
        : '\n\nThe settings are active, but Telegram did not allow the bot to change all group information. Give it “Change group info” permission or update the title manually.'
    }`
  );
  return true;
}

export async function registerGroupHelpLogGroup(message: CommunityTelegramMessage) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command !== '/setlog') return false;
  if (!(await isGroupAdmin(message))) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      message.chat.id,
      'Only a group administrator can set the moderation log group.'
    );
    return true;
  }
  await prisma.siteConfig.upsert({
    where: { key: 'telegramGroupHelpLogChannelId' },
    create: {
      key: 'telegramGroupHelpLogChannelId',
      value: String(message.chat.id),
      label: 'Telegram Group Help moderation log group ID'
    },
    update: { value: String(message.chat.id), label: 'Telegram Group Help moderation log group ID' }
  });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    message.chat.id,
    `✅ ${message.chat.title || 'This private group'} is now the Hope Hub moderation log. Reports and moderation actions will appear here.`
  );
  return true;
}
