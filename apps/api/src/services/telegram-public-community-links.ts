import type { TelegramKeyboard } from './telegram-community-bots.types.js';

function safeTelegramUrl(value: string | undefined) {
  const url = (value || '').trim();
  return /^https:\/\/t\.me\/[A-Za-z0-9_+?-]+(?:[/?#].*)?$/i.test(url) ? url : '';
}

export function withPublicCommunityLinks(
  keyboard: TelegramKeyboard | undefined,
  values: {
    telegramGroupHelpMainGroupUrl?: string;
    telegramGroupHelpOffTopicGroupUrl?: string;
  }
): TelegramKeyboard | undefined {
  const rows = keyboard?.inline_keyboard.map((row) => [...row]) || [];
  const existingUrls = new Set(
    rows.flatMap((row) =>
      row.map((button) => button.url).filter((url): url is string => Boolean(url))
    )
  );
  const links = [
    {
      text: 'HopeHub group',
      url: safeTelegramUrl(values.telegramGroupHelpMainGroupUrl),
      style: 'success' as const
    },
    {
      text: 'Off-topic group',
      url: safeTelegramUrl(values.telegramGroupHelpOffTopicGroupUrl),
      style: 'success' as const
    }
  ].filter((button) => button.url && !existingUrls.has(button.url));
  if (links.length) rows.push(links);
  return rows.length ? { inline_keyboard: rows } : undefined;
}
