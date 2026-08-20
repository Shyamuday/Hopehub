import assert from 'node:assert/strict';
import test from 'node:test';
import { GROUP_HELP_CONFIG_KEYS } from './group-help-config.constants.js';
import { SITE_CONFIG_KEYS } from './site-config.constants.js';
import { TELEGRAM_BOT_CONTROL_KEYS } from './telegram-bot-controls.constants.js';

function duplicates(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

test('managed configuration registries contain unique keys', () => {
  assert.deepEqual(duplicates(SITE_CONFIG_KEYS), []);
  assert.deepEqual(duplicates(GROUP_HELP_CONFIG_KEYS), []);
  assert.deepEqual(duplicates(TELEGRAM_BOT_CONTROL_KEYS), []);
});

test('managed configuration registries do not claim the same database key', () => {
  const all = [...SITE_CONFIG_KEYS, ...GROUP_HELP_CONFIG_KEYS, ...TELEGRAM_BOT_CONTROL_KEYS];
  assert.deepEqual(duplicates(all), []);
});
