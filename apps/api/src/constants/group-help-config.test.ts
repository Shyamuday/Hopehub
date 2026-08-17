import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROUP_HELP_ACTIONS,
  GROUP_HELP_CAPABILITY_GROUPS,
  GROUP_HELP_CONFIG_DEFAULTS,
  GROUP_HELP_CONFIG_KEYS
} from './group-help-config.constants.js';

test('every Group Help action is backed by stored configuration fields', () => {
  const keys = new Set(GROUP_HELP_CONFIG_KEYS);
  const ids = new Set<string>();
  for (const action of GROUP_HELP_ACTIONS) {
    assert.equal(ids.has(action.id), false, `Duplicate action id: ${action.id}`);
    ids.add(action.id);
    assert.equal(keys.has(action.valueKey), true, `${action.id} value key is missing`);
    assert.equal(keys.has(action.templateKey), true, `${action.id} template key is missing`);
    if (action.imageUrlKey) {
      assert.equal(keys.has(action.imageUrlKey), true, `${action.id} image key is missing`);
    }
  }
});

test('HopeHubAI has a safe default test group separate from production', () => {
  assert.equal(GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpTestGroupChatId, '@hopehubtalks');
  assert.notEqual(
    GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpTestGroupChatId,
    GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpGroupChatId
  );
});

test('HopeHubAI exposes an optional moderation bypass list for trusted people', () => {
  assert.equal(GROUP_HELP_CONFIG_KEYS.includes('telegramGroupHelpAdminWhitelist'), true);
  assert.equal(GROUP_HELP_CONFIG_DEFAULTS.telegramGroupHelpAdminWhitelist, '');
});

test('Group Help capability map covers the main management areas', () => {
  assert.equal(GROUP_HELP_CAPABILITY_GROUPS.length >= 5, true);
  assert.equal(
    GROUP_HELP_CAPABILITY_GROUPS.every((group) => group.title && group.options.length >= 4),
    true
  );
});
