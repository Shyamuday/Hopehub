import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROUP_HELP_COMMAND_CATALOG,
  GROUP_HELP_COMMAND_DEFINITIONS,
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
