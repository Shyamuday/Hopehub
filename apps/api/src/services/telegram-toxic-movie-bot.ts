import { COMMUNITY_BOT_SLUGS } from '../constants/telegram-community-bot.constants.js';
import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';
import { getTelegramBotControls } from './telegram-bot-controls.js';

const slug = COMMUNITY_BOT_SLUGS.TOXIC_MOVIE;
const LATEST_NEWS_URL = 'https://www.google.com/search?tbm=nws&q=Toxic+movie+Yash+official+updates';

function command(text: string): string | undefined {
  return text
    .trim()
    .match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)?.[1]
    ?.toLowerCase();
}

export function toxicMovieBotMenu(groupUrl: string): TelegramKeyboard {
  return {
    inline_keyboard: [
      [{ text: 'Latest verified updates', url: LATEST_NEWS_URL, style: 'primary' }],
      [
        { text: 'About this bot', callback_data: 'toxic:about' },
        { text: 'Help', callback_data: 'toxic:help' }
      ],
      [
        {
          text: 'Join HopeHub India community',
          url: groupUrl,
          style: 'success'
        }
      ]
    ]
  };
}

export function toxicMovieWelcomeText(): string {
  return [
    'Toxic Movie Updates | Yash — Unofficial',
    '',
    'Follow verified news, release updates, cast announcements, trailers and official viewing information for Toxic.',
    '',
    'This is an independent fan-information bot. It is not affiliated with the film, its cast, producers or distributors. It never shares pirated films or unofficial downloads.',
    '',
    'HopeHub India is shown separately as our community partner for friendly conversation and emotional support.'
  ].join('\n');
}

function aboutText(): string {
  return [
    'About this bot',
    '',
    'This unofficial bot helps fans find current, source-linked information about Yash’s Toxic without misleading download links.',
    '',
    'Movie names and trademarks belong to their respective owners. HopeHub India is an independent community partner and is not connected to the film.'
  ].join('\n');
}

function helpText(): string {
  return [
    'Commands',
    '',
    '/start — Open the main menu',
    '/latest — Find current Toxic movie news',
    '/about — Read the bot disclosure',
    '/community — Open HopeHub India',
    '/help — Show this guide'
  ].join('\n');
}

async function groupUrl(): Promise<string> {
  const controls = await getTelegramBotControls();
  return controls.telegramGroupHelpMainGroupUrl || 'https://t.me/hopehubindia';
}

async function showMenu(chatId: string | number): Promise<void> {
  const url = await groupUrl();
  await sendCommunityMessage(slug, chatId, toxicMovieWelcomeText(), {
    reply_markup: toxicMovieBotMenu(url)
  });
}

async function showText(chatId: string | number, text: string): Promise<void> {
  await sendCommunityMessage(slug, chatId, text, {
    reply_markup: toxicMovieBotMenu(await groupUrl())
  });
}

export async function handleToxicMovieBotUpdate(update: CommunityTelegramUpdate): Promise<void> {
  const callback = update.callback_query;
  if (callback?.message && callback.data) {
    await answerCommunityCallback(slug, callback.id);
    if (callback.data === 'toxic:about') {
      await showText(callback.message.chat.id, aboutText());
    } else if (callback.data === 'toxic:help') {
      await showText(callback.message.chat.id, helpText());
    }
    return;
  }

  const message = update.message;
  if (!message?.text || message.chat.type !== 'private') return;
  const requested = command(message.text);
  if (requested === 'start') return showMenu(message.chat.id);
  if (requested === 'about') return showText(message.chat.id, aboutText());
  if (requested === 'help') return showText(message.chat.id, helpText());
  if (requested === 'community') {
    return showText(
      message.chat.id,
      'HopeHub India is a friendly emotional-support and conversation community. Use the button below to join.'
    );
  }
  if (requested === 'latest') {
    return showText(
      message.chat.id,
      'Use “Latest verified updates” below to see current source-linked Toxic movie coverage. This bot does not provide movie files or unofficial downloads.'
    );
  }
  await showMenu(message.chat.id);
}
