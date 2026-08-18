export type TelegramButtonStyle = 'primary' | 'success' | 'danger';

type StyleableTelegramButton = {
  text: string;
  callback_data?: string;
  url?: string;
  style?: TelegramButtonStyle;
};

const DANGER_ACTION =
  /\b(cancel|reject|decline|delete|remove|report|complaint|disclaimer|offline|block|stop|bug)\b/i;
const SUCCESS_ACTION =
  /\b(send|submit|approve|confirm|complete|accept|online|book|join|create|apply|help|support|contact|helpline|save|publish|continue|suggestion|partnership)\b/i;

// Button labels are intentionally plain text. Emoji-only or emoji-led labels
// make inline keyboards look uneven between Telegram clients, especially when
// a row contains links with labels of different lengths. Keep this at the
// transport boundary so saved admin settings and scheduled content follow the
// same rule as hard-coded bot buttons.
const BUTTON_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}|\u{200D}/gu;

export function plainTelegramButtonText(value: string): string {
  return value
    .replace(BUTTON_EMOJI, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function inferredButtonStyle(button: StyleableTelegramButton): TelegramButtonStyle {
  const action = `${button.callback_data || ''} ${button.text}`.replace(/[_:-]+/g, ' ');
  if (DANGER_ACTION.test(action)) return 'danger';
  if (SUCCESS_ACTION.test(action)) return 'success';
  return 'primary';
}

/**
 * Applies Telegram's native semantic colours to every inline button.
 * Older Telegram clients safely fall back to their default button theme.
 */
export function colorizeTelegramKeyboard<
  TButton extends StyleableTelegramButton,
  TKeyboard extends { inline_keyboard: TButton[][] }
>(keyboard: TKeyboard): TKeyboard {
  return {
    ...keyboard,
    inline_keyboard: keyboard.inline_keyboard.map((row) =>
      row.map((button) => ({
        ...button,
        text: plainTelegramButtonText(button.text) || 'Open',
        style: button.style || inferredButtonStyle(button)
      }))
    )
  } as TKeyboard;
}

/**
 * Applies the same button styling at the Telegram transport boundary. This
 * keeps raw API calls, scheduled campaigns, previews and normal bot replies
 * visually consistent without each caller needing to remember the helper.
 */
export function colorizeTelegramPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const candidate = payload as T & { reply_markup?: unknown };
  const replyMarkup = candidate.reply_markup;
  if (
    !replyMarkup ||
    typeof replyMarkup !== 'object' ||
    !Array.isArray((replyMarkup as { inline_keyboard?: unknown }).inline_keyboard)
  ) {
    return payload;
  }
  return {
    ...candidate,
    reply_markup: colorizeTelegramKeyboard(
      replyMarkup as { inline_keyboard: StyleableTelegramButton[][] }
    )
  } as T;
}
