import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHelpBotCommandMenu } from './telegram-community-bots.client.js';
import { GROUP_HELP_COMMAND_CATALOG } from './telegram-group-help.commands.js';
import { groupHelpHelpSections } from './telegram-group-help.help.js';

const supportedCommands = [...new Set(Object.values(GROUP_HELP_COMMAND_CATALOG).flat())];

test('/help documents every supported Group Help command for an authorized administrator', () => {
  const text = groupHelpHelpSections({
    canUseStaffTools: true,
    canUseModTools: true,
    canUseAdminTools: true,
    isControlGroup: true,
    muteMinutes: '60'
  }).join('\n');
  const documented = new Set(text.match(/\/[a-z]+/g) || []);
  assert.deepEqual(
    supportedCommands.filter((command) => !documented.has(command)),
    []
  );
});

test('Telegram command menu uses its 100 slots for primary commands', () => {
  const menu = groupHelpBotCommandMenu();
  assert.equal(menu.length, 100);
  assert.equal(new Set(menu.map(({ command }) => command)).size, 100);
  for (const command of [
    'start',
    'help',
    'rule',
    'rules',
    'support',
    'report',
    'alertadmin',
    'delete',
    'tmute',
    'tban',
    'promote',
    'send',
    'forget'
  ]) {
    assert.equal(
      menu.some((item) => item.command === command),
      true,
      command
    );
  }
});
