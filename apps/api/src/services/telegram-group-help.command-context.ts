import { getSiteConfigMap } from './site-config.service.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

const COMMAND_GROUP_KEYS = [
  'telegramGroupHelpGroupChatId',
  'telegramGroupHelpTestGroupChatId',
  'telegramGroupHelpStaffGroupId',
  'telegramGroupHelpLogChannelId'
] as const;

export type GroupHelpCommandContext = {
  sourceChatId: string;
  targetChatId: string;
  isControlGroup: boolean;
  configurationError?: string;
};

export function configuredGroupHelpChatIds(values: Record<string, string>) {
  return [
    values.telegramGroupHelpGroupChatId,
    values.telegramGroupHelpTestGroupChatId,
    values.telegramGroupHelpStaffGroupId,
    values.telegramGroupHelpLogChannelId
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

export function groupHelpCommandContextFromConfig(
  sourceChatId: string,
  values: Record<string, string>
): GroupHelpCommandContext {
  const normalizedSource = sourceChatId.trim().toLowerCase();
  const controlGroups = [values.telegramGroupHelpStaffGroupId, values.telegramGroupHelpLogChannelId]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  const mainGroupId = values.telegramGroupHelpGroupChatId?.trim() || '';
  const isControlGroup = controlGroups.includes(normalizedSource);
  return {
    sourceChatId,
    targetChatId: isControlGroup ? mainGroupId : sourceChatId,
    isControlGroup,
    ...(isControlGroup && !mainGroupId
      ? {
          configurationError:
            'The main Hope Hub group is not configured. Set telegramGroupHelpGroupChatId before using this control group.'
        }
      : {})
  };
}

export async function resolveGroupHelpCommandContext(
  message: CommunityTelegramMessage
): Promise<GroupHelpCommandContext> {
  const values = await getSiteConfigMap([...COMMAND_GROUP_KEYS]);
  return groupHelpCommandContextFromConfig(String(message.chat.id), values);
}

export function messageForGroupHelpTarget(
  message: CommunityTelegramMessage,
  targetChatId: string
): CommunityTelegramMessage {
  if (String(message.chat.id) === targetChatId) return message;
  return {
    ...message,
    chat: {
      ...message.chat,
      id: targetChatId
    }
  };
}

export function groupHelpCommandFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error || '');
  if (/not enough rights|administrator rights|have no rights/i.test(detail)) {
    return 'The action was not applied because the bot does not have the required Telegram administrator permission in the main group.';
  }
  if (/user.*not found|participant.*not found|member.*not found/i.test(detail)) {
    return 'The action was not applied because Telegram could not find that member in the main group.';
  }
  if (/message.*not found|message_id_invalid|message to (pin|delete) not found/i.test(detail)) {
    return 'The action was not applied because that main-group message no longer exists or its message ID is incorrect.';
  }
  if (/chat.*not found|chat_id_invalid/i.test(detail)) {
    return 'The action was not applied because the configured main group could not be reached.';
  }
  if (/too many requests|retry after|flood/i.test(detail)) {
    return 'Telegram temporarily rate-limited the bot. No success was recorded; please wait and try again.';
  }
  return 'The command could not be completed. No success was recorded. Check the target, bot permissions, and Telegram connection, then try again.';
}
