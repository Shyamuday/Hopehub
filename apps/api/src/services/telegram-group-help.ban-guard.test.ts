import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHelpBanCooldownSeconds } from './telegram-group-help.ban-guard.js';

test('normalizes the editable duplicate-ban protection window', () => {
  assert.equal(groupHelpBanCooldownSeconds('60'), 60);
  assert.equal(groupHelpBanCooldownSeconds('0'), 0);
  assert.equal(groupHelpBanCooldownSeconds('99999'), 3600);
  assert.equal(groupHelpBanCooldownSeconds('not a number'), 60);
});
