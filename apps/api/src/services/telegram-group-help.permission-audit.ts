import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';

export const GROUP_HELP_REQUIRED_BOT_RIGHTS = [
  'can_delete_messages',
  'can_restrict_members',
  'can_pin_messages',
  'can_manage_video_chats'
] as const;

type BotMembership = { status?: string; [key: string]: unknown };

export function evaluateGroupHelpBotMembership(membership: BotMembership | null) {
  if (!membership)
    return { reachable: false, administrator: false, missing: [...GROUP_HELP_REQUIRED_BOT_RIGHTS] };
  const administrator = ['creator', 'administrator'].includes(membership.status || '');
  return {
    reachable: true,
    administrator,
    missing: administrator
      ? GROUP_HELP_REQUIRED_BOT_RIGHTS.filter((right) => membership[right] !== true)
      : [...GROUP_HELP_REQUIRED_BOT_RIGHTS]
  };
}

export async function auditGroupHelpBotPermissions(values: Record<string, string>) {
  const bot = await callCommunityTelegramApi<{ id: number; username?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getMe',
    {}
  );
  const targets = [
    ['Main group', values.telegramGroupHelpGroupChatId],
    ['Off-topic group', values.telegramGroupHelpOffTopicGroupChatId]
  ] as const;
  const results = [];
  for (const [label, configuredId] of targets) {
    const chatId = configuredId?.trim();
    if (!chatId) {
      results.push({
        label,
        chatId: '',
        configured: false,
        reachable: false,
        administrator: false,
        missing: [...GROUP_HELP_REQUIRED_BOT_RIGHTS]
      });
      continue;
    }
    const membership = await callCommunityTelegramApi<BotMembership>(
      GROUP_HELP_BOT_SLUG,
      'getChatMember',
      { chat_id: chatId, user_id: bot.id }
    ).catch(() => null);
    results.push({
      label,
      chatId,
      configured: true,
      ...evaluateGroupHelpBotMembership(membership)
    });
  }
  return {
    bot,
    results,
    ok: results
      .filter((item) => item.configured)
      .every((item) => item.administrator && item.missing.length === 0)
  };
}

export function formatGroupHelpPermissionAudit(
  audit: Awaited<ReturnType<typeof auditGroupHelpBotPermissions>>
) {
  return [
    `Telegram permission audit: ${audit.ok ? 'PASS' : 'ACTION NEEDED'}`,
    `Bot: ${audit.bot.username ? `@${audit.bot.username}` : audit.bot.id}`,
    '',
    ...audit.results.map(
      (item) =>
        `${item.label}: ${!item.configured ? 'not configured' : !item.reachable ? 'unreachable' : !item.administrator ? 'not an administrator' : item.missing.length ? `missing ${item.missing.join(', ')}` : 'all required rights enabled'}`
    )
  ].join('\n');
}
