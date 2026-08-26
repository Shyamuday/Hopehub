import type { TelegramKeyboard } from './telegram-community-bots.types.js';

function normalizedChat(value: string | undefined) {
  return (value || '')
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '@')
    .toLocaleLowerCase();
}

function validTelegramUrl(value: string | undefined) {
  const url = (value || '').trim();
  return /^https:\/\/t\.me\/[A-Za-z0-9_+?-]+(?:[/?#].*)?$/i.test(url) ? url : '';
}

export function crossCommunityButton(values: Record<string, string>, chatId?: string) {
  if (!chatId) return null;
  const normalizedCurrent = normalizedChat(chatId);
  const configuredOffTopic = normalizedChat(values.telegramGroupHelpOffTopicGroupChatId);
  const configuredMain = normalizedChat(values.telegramGroupHelpGroupChatId);
  const groupTitle = (values.telegramGroupHelpGroupTitle || '').trim().toLocaleLowerCase();
  const inOffTopicGroup =
    (configuredOffTopic && normalizedCurrent === configuredOffTopic) ||
    groupTitle === 'hopehub chit-chat';
  const inMainGroup = configuredMain && normalizedCurrent === configuredMain;

  if (inOffTopicGroup) {
    const url = validTelegramUrl(values.telegramGroupHelpMainGroupUrl);
    return url ? { text: 'HopeHub support group', url, style: 'success' as const } : null;
  }
  if (inMainGroup || !configuredOffTopic) {
    const url = validTelegramUrl(values.telegramGroupHelpOffTopicGroupUrl);
    return url ? { text: 'Off-topic group', url, style: 'success' as const } : null;
  }
  return null;
}

export function withCrossCommunityButton(
  keyboard: TelegramKeyboard | undefined,
  values: Record<string, string>,
  chatId?: string
): TelegramKeyboard | undefined {
  const button = crossCommunityButton(values, chatId);
  if (!button) return keyboard;
  const rows = keyboard?.inline_keyboard.map((row) => [...row]) || [];
  if (rows.some((row) => row.some((item) => item.url === button.url)))
    return { inline_keyboard: rows };
  rows.push([button]);
  return { inline_keyboard: rows };
}
