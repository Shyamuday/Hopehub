import type { TelegramKeyboard } from './telegram-community-bots.types.js';

type TelegramButtonStyle = 'primary' | 'success' | 'danger';

const STYLES = new Set<TelegramButtonStyle>(['primary', 'success', 'danger']);

export function configuredUrlButtons(value: string, maximum = 8) {
  return value
    .split(/\r?\n/)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter(([label, url]) => Boolean(label) && /^https:\/\//i.test(url || ''))
    .slice(0, maximum)
    .map(([text, url, requestedStyle]) => ({
      text,
      url,
      style: (STYLES.has(requestedStyle as TelegramButtonStyle)
        ? requestedStyle
        : 'primary') as TelegramButtonStyle
    }));
}

export function configuredUrlKeyboard(
  value: string,
  options: { maximum?: number; buttonsPerRow?: number } = {}
): TelegramKeyboard | undefined {
  const buttons = configuredUrlButtons(value, options.maximum);
  if (!buttons.length) return undefined;
  const buttonsPerRow = Math.max(1, Math.min(options.buttonsPerRow || 2, 4));
  const inline_keyboard: TelegramKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < buttons.length; index += buttonsPerRow) {
    inline_keyboard.push(buttons.slice(index, index + buttonsPerRow));
  }
  return { inline_keyboard };
}
