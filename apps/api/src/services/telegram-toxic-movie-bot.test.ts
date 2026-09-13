import assert from 'node:assert/strict';
import test from 'node:test';
import { toxicMovieBotMenu, toxicMovieWelcomeText } from './telegram-toxic-movie-bot.js';

test('Toxic movie bot is clearly unofficial and rejects piracy positioning', () => {
  const text = toxicMovieWelcomeText();
  assert.match(text, /Unofficial/i);
  assert.match(text, /not affiliated/i);
  assert.match(text, /No fake download or piracy links/i);
  assert.match(text, /https:\/\/t\.me\/hopehubindia/i);
});

test('Toxic movie bot labels the HopeHub destination honestly', () => {
  const menu = toxicMovieBotMenu('https://t.me/hopehubindia');
  const buttons = menu.inline_keyboard.flat();
  assert.deepEqual(
    buttons.find((button) => button.url === 'https://t.me/hopehubindia'),
    {
      text: 'Join HopeHub India',
      url: 'https://t.me/hopehubindia',
      style: 'success'
    }
  );
});
