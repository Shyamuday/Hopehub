import assert from 'node:assert/strict';
import test from 'node:test';
import { telegramPersonLogLabel, telegramPersonName } from './telegram-group-help.people.js';

test('staff logs use the full Telegram display name instead of a username', () => {
  const person = {
    id: 42,
    first_name: 'Mind',
    last_name: 'Craft',
    username: 'spiritualspirit'
  };

  assert.equal(telegramPersonName(person), 'Mind Craft');
  assert.equal(telegramPersonLogLabel(person), 'Mind Craft [42]');
});

test('staff logs use the safe fallback when Telegram provides no name', () => {
  assert.equal(telegramPersonLogLabel({ id: 42 }), 'Telegram member [42]');
});
