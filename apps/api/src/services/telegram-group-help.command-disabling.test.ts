import assert from 'node:assert/strict';
import test from 'node:test';
import {
  disabledGroupHelpCommands,
  isGroupHelpCommandDisableable,
  normalizeGroupHelpCommandName,
  shouldSuppressGroupHelpCommand
} from './telegram-group-help.command-disabling.js';

test('normalizes and limits disabled commands to supported disableable commands', () => {
  assert.equal(normalizeGroupHelpCommandName('WARNINGS@HopeHubBot'), '/warnings');
  assert.equal(isGroupHelpCommandDisableable('/warns'), true);
  assert.equal(isGroupHelpCommandDisableable('/ban'), false);
  assert.deepEqual(disabledGroupHelpCommands('rules, WARNINGS /rules /ban'), [
    '/rules',
    '/warnings'
  ]);
});

test('disabled commands ignore members while admins bypass unless explicitly disabled', () => {
  const base = { command: '/rules', disabledCommands: '/rules', disableForAdmins: false };
  assert.equal(shouldSuppressGroupHelpCommand({ ...base, actorIsAdmin: false }), true);
  assert.equal(shouldSuppressGroupHelpCommand({ ...base, actorIsAdmin: true }), false);
  assert.equal(
    shouldSuppressGroupHelpCommand({ ...base, actorIsAdmin: true, disableForAdmins: true }),
    true
  );
  assert.equal(
    shouldSuppressGroupHelpCommand({ ...base, command: '/id', actorIsAdmin: false }),
    false
  );
});
