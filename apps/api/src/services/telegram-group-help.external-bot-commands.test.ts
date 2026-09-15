import assert from 'node:assert/strict';
import test from 'node:test';
import { isSangMataCommand } from './telegram-group-help.external-bot-commands.js';

test('recognizes every command addressed to SangMata without matching ordinary mentions', () => {
  for (const text of [
    '@SangMata_bot history',
    '@sangmata_bot allhistory 12345',
    '@sangmata_bot any_future_command',
    '/history@SangMata_bot'
  ]) {
    assert.equal(isSangMataCommand(text), true, text);
  }

  for (const text of [
    'please contact @sangmata_bot',
    '@sangmata_botany history',
    '@another_bot history',
    '/history'
  ]) {
    assert.equal(isSangMataCommand(text), false, text);
  }
});
