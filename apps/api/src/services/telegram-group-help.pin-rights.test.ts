import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageGroupHelpPins } from './telegram-group-help.pin-rights.js';

test('only the owner and spiritualspirit receive human pin permission', () => {
  assert.equal(canManageGroupHelpPins({ status: 'creator', username: 'groupowner' }), true);
  assert.equal(canManageGroupHelpPins({ status: 'owner' }), true);
  assert.equal(
    canManageGroupHelpPins({ status: 'administrator', username: '@SpiritualSpirit' }),
    true
  );
  assert.equal(
    canManageGroupHelpPins({ status: 'administrator', username: '@spiritualspirirt' }),
    true
  );
  assert.equal(
    canManageGroupHelpPins({ status: 'administrator', username: 'anotheradmin' }),
    false
  );
  assert.equal(canManageGroupHelpPins({ status: 'administrator' }), false);
});
