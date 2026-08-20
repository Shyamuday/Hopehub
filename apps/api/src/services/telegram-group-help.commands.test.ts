import assert from 'node:assert/strict';
import test from 'node:test';
import { isGroupHelpAutomaticFullAdminUsername } from '../constants/telegram-community-bot.constants.js';
import {
  GROUP_HELP_COMMAND_CATALOG,
  GROUP_HELP_COMMAND_DEFINITIONS,
  GROUP_HELP_DEFAULT_STAFF_COMMANDS,
  GROUP_HELP_STAFF_PERMISSION_GROUPS,
  groupHelpCommandDefinition
} from './telegram-group-help.commands.js';

test('command registry contains every catalog command exactly once', () => {
  const catalog = Object.values(GROUP_HELP_COMMAND_CATALOG).flat();
  assert.equal(GROUP_HELP_COMMAND_DEFINITIONS.length, catalog.length);
  assert.equal(
    new Set(GROUP_HELP_COMMAND_DEFINITIONS.map(({ command }) => command)).size,
    catalog.length
  );
  for (const command of catalog)
    assert.equal(groupHelpCommandDefinition(command)?.command, command);
});

test('every delegated staff permission maps to a supported bot command', () => {
  const supported = new Set(GROUP_HELP_COMMAND_DEFINITIONS.map(({ command }) => command));
  for (const group of GROUP_HELP_STAFF_PERMISSION_GROUPS) {
    assert.ok(group.commands.length > 0, `${group.key} must contain at least one command`);
    for (const command of group.commands) {
      assert.ok(supported.has(command), `${group.key} contains unsupported command ${command}`);
    }
  }
});

test('automatic private-staff access contains routine tools but excludes sensitive powers', () => {
  const defaults = new Set<string>(GROUP_HELP_DEFAULT_STAFF_COMMANDS);
  for (const command of ['/info', '/stats', '/warn', '/delete', '/mute']) {
    assert.ok(defaults.has(command));
  }
  for (const command of [
    '/ban',
    '/kick',
    '/pin',
    '/filter',
    '/lockdown',
    '/promote',
    '/settings'
  ]) {
    assert.ok(!defaults.has(command));
  }
});

test('only the requested trusted staff usernames match automatic full access', () => {
  assert.equal(isGroupHelpAutomaticFullAdminUsername('@spiritualspirit'), true);
  assert.equal(isGroupHelpAutomaticFullAdminUsername('spiritualspirirt'), true);
  assert.equal(isGroupHelpAutomaticFullAdminUsername('HopeHubStoicGuide'), true);
  assert.equal(isGroupHelpAutomaticFullAdminUsername('ordinary_helper'), false);
});

test('dangerous commands are marked destructive and require the expected role', () => {
  assert.deepEqual(
    ['/ban', '/kick', '/promote', '/unpinall', '/lockdown'].map((command) => ({
      command,
      role: groupHelpCommandDefinition(command)?.minimumRole,
      destructive: groupHelpCommandDefinition(command)?.destructive
    })),
    [
      { command: '/ban', role: 'MODERATOR', destructive: true },
      { command: '/kick', role: 'MODERATOR', destructive: true },
      { command: '/promote', role: 'ADMIN', destructive: true },
      { command: '/unpinall', role: 'ADMIN', destructive: true },
      { command: '/lockdown', role: 'ADMIN', destructive: true }
    ]
  );
});
