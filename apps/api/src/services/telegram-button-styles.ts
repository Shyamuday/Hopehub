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
        style: button.style || inferredButtonStyle(button)
      }))
    )
  } as TKeyboard;
}
