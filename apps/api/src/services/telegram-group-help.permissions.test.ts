import assert from 'node:assert/strict';
import test from 'node:test';
import { isGroupHelpBanAuthority } from './telegram-group-help.permissions.js';

test('limits ban authority to the Telegram group owner and Hope Hub owner account', () => {
  assert.equal(isGroupHelpBanAuthority(undefined, 'creator'), true);
  assert.equal(isGroupHelpBanAuthority(undefined, 'owner'), true);
  assert.equal(isGroupHelpBanAuthority('spiritualspirit', 'administrator'), true);
  assert.equal(isGroupHelpBanAuthority('spiritualspirirt', 'member'), true);
  assert.equal(isGroupHelpBanAuthority('other-admin', 'administrator'), false);
  assert.equal(isGroupHelpBanAuthority('stoic-moderator', 'administrator'), false);
});
