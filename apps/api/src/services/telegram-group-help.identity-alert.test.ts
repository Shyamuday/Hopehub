import assert from 'node:assert/strict';
import test from 'node:test';
import { publicIdentityChangeAlert } from './telegram-group-help.identity-alert.js';

test('formats a readable public name-change alert with profile history', () => {
  const text = publicIdentityChangeAlert({
    telegramUserId: 12345,
    displayName: 'Asha Mehta',
    changedFields: ['name', 'username'],
    previousDisplayName: 'Asha Sharma',
    previousUsername: 'asha_old',
    username: 'asha_mehta',
    previousNames: ['Asha', 'Asha Sharma'],
    previousUsernames: ['@asha_old'],
    nameChangeCount: 2
  });

  assert.equal(
    text,
    [
      'Profile updated',
      '',
      'Member: Asha Mehta',
      'Telegram ID: 12345',
      '',
      'What changed',
      'Name: Asha Sharma → Asha Mehta',
      'Username: @asha_old → @asha_mehta',
      '',
      'Profile history',
      'Names used before',
      '• Asha',
      '• Asha Sharma',
      'Usernames used before',
      '• @asha_old',
      '',
      'Observed in this group: 2 name changes.'
    ].join('\n')
  );
});

test('omits empty history sections and compacts untrusted profile text', () => {
  const text = publicIdentityChangeAlert({
    telegramUserId: '42',
    displayName: '  New\nName  ',
    changedFields: ['name'],
    previousDisplayName: ' Old\nName ',
    previousUsername: null,
    username: null,
    previousNames: [],
    previousUsernames: [],
    nameChangeCount: 1
  });

  assert.ok(text.includes('Member: New Name'));
  assert.ok(text.includes('Name: Old Name → New Name'));
  assert.ok(!text.includes('Profile history'));
});
