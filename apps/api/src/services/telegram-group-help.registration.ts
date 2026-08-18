import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { prisma } from '../db.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

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

export async function registerGroupHelpTestGroup(message: CommunityTelegramMessage) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command !== '/settestgroup') return false;
  if (!(await isGroupAdmin(message))) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      message.chat.id,
      'Only a group administrator can register this test group.'
    );
    return true;
  }
  await prisma.siteConfig.upsert({
    where: { key: 'telegramGroupHelpTestGroupChatId' },
    create: {
      key: 'telegramGroupHelpTestGroupChatId',
      value: String(message.chat.id),
      label: 'Test Telegram group ID'
    },
    update: { value: String(message.chat.id), label: 'Test Telegram group ID' }
  });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    message.chat.id,
    `✅ ${message.chat.title || 'This group'} is now the Hope Hub bot test group. Admin previews and test messages will arrive here.`
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
