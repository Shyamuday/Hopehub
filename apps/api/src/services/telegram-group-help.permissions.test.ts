import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpBanAuthorityUserIds,
  isGroupHelpBanAuthority
} from './telegram-group-help.permissions.js';

test('limits ban authority to the Telegram group owner and Hope Hub owner account', () => {
  assert.equal(isGroupHelpBanAuthority({ telegramUserId: '1', status: 'creator' }), true);
  assert.equal(isGroupHelpBanAuthority({ telegramUserId: '1', status: 'owner' }), true);
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '1',
      username: 'spiritualspirit',
      status: 'administrator'
    }),
    true
  );
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '1',
      username: 'spiritualspirirt',
      status: 'member'
    }),
    true
  );
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '1',
      username: 'other-admin',
      status: 'administrator'
    }),
    false
  );
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '1',
      username: 'stoic-moderator',
      status: 'administrator'
    }),
    false
  );
});

test('uses configured Telegram IDs instead of mutable usernames when present', () => {
  const configured = groupHelpBanAuthorityUserIds('7217536617\n 99001122');
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '7217536617',
      username: 'renamed-account',
      status: 'administrator',
      configuredUserIds: configured
    }),
    true
  );
  assert.equal(
    isGroupHelpBanAuthority({
      telegramUserId: '123',
      username: 'spiritualspirit',
      status: 'administrator',
      configuredUserIds: configured
    }),
    false
  );
});
