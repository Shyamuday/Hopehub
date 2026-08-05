import { InlineKeyboard } from 'grammy';
import { config } from './config.js';

export function hopeHubWebBotKeyboard() {
  return new InlineKeyboard()
    .url('Open Hope Hub Bot', config.webBotUrl)
    .row()
    .url('Open Website', config.websiteUrl);
}

export function welcomeText(names: string[]) {
  const people = names.length ? names.join(', ') : 'friend';
  return [
    `<b>Welcome, ${people} 👋</b>`,
    '',
    config.welcomeMessage,
    '',
    'For support, booking, tests, payments, or account help, tap the button below.'
  ].join('\n');
}

export function startText() {
  return [
    '<b>Hope Hub Welcome Bot 💙</b>',
    '',
    'I welcome people in the Hope Hub Telegram group.',
    '',
    'For all Hope Hub features, use the main Hope Hub bot below.'
  ].join('\n');
}
