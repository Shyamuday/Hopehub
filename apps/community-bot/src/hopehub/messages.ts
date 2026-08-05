import { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import { config } from './config.js';

export function hopeHubWebBotKeyboard() {
  return new InlineKeyboard()
    .url('Hope Hub Bot', config.webBotUrl)
    .row()
    .url('Website', config.websiteUrl)
    .row()
    .text('Rules', 'community:rules');
}

export function welcomeText(names: string[]) {
  const people = names.length ? names.join(', ') : 'friend';
  return [
    `<b>Welcome, ${people} 👋</b>`,
    '',
    config.welcomeMessage,
    '',
    'For private support, self-check tests, bookings, payments, or account help, use the buttons below.'
  ].join('\n');
}

export function startText() {
  return [
    '<b>Hope Hub Welcome Bot 💙</b>',
    '',
    'I welcome people into the Hope Hub India emotional-support community.',
    '',
    'For private support and Hope Hub services, use the main bot below.'
  ].join('\n');
}

export function rulesText() {
  return [
    '<b>Hope Hub group rules</b>',
    '',
    ...config.rules.map((rule, index) => `${index + 1}. ${rule}`)
  ].join('\n');
}

export async function replyWithHopeHubLogo(ctx: Context, text: string) {
  const replyMarkup = hopeHubWebBotKeyboard();
  if (!config.logoUrl) {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: replyMarkup });
    return;
  }

  try {
    await ctx.replyWithPhoto(config.logoUrl, {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
  } catch (error) {
    console.warn('Could not send Hope Hub logo, falling back to text message.', error);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: replyMarkup });
  }
}
