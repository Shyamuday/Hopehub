import type { TelegramKeyboard } from './telegram-community-bots.types.js';

type TelegramButtonStyle = 'primary' | 'success' | 'danger';

const STYLES = new Set<TelegramButtonStyle>(['primary', 'success', 'danger']);

export function configuredUrlButtons(value: string, maximum = 8) {
  return value
    .split(/\r?\n/)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter(([label, url]) => Boolean(label) && /^https:\/\//i.test(url || ''))
    .slice(0, maximum)
    .map(([text, url, requestedStyle]) => {
      const style = STYLES.has(requestedStyle as TelegramButtonStyle)
        ? (requestedStyle as TelegramButtonStyle)
        : 'success';
      return { text, url, style: style === 'primary' ? 'success' : style };
    });
}

export function configuredUrlKeyboard(
  value: string,
  options: { maximum?: number; buttonsPerRow?: number } = {}
): TelegramKeyboard | undefined {
  const hasExplicitRows = value.includes('&&');
  if (hasExplicitRows) {
    const maximum = options.maximum ?? 8;
    const rows = value
      .split(/\r?\n/)
      .map((line) => configuredUrlButtons(line.split('&&').join('\n'), maximum).slice(0, 4))
      .filter((row) => row.length);
    const inline_keyboard: TelegramKeyboard['inline_keyboard'] = [];
    let total = 0;
    for (const row of rows) {
      if (total >= maximum) break;
      const available = maximum - total;
      inline_keyboard.push(row.slice(0, available));
      total += Math.min(row.length, available);
    }
    return inline_keyboard.length ? { inline_keyboard } : undefined;
  }

  const buttons = configuredUrlButtons(value, options.maximum);
  if (!buttons.length) return undefined;
  const buttonsPerRow = Math.max(1, Math.min(options.buttonsPerRow || 2, 4));
  const inline_keyboard: TelegramKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < buttons.length; index += buttonsPerRow) {
    inline_keyboard.push(buttons.slice(index, index + buttonsPerRow));
  }
  return { inline_keyboard };
}
