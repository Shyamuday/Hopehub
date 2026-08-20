import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changedTelegramIdentityFields,
  normalizedTelegramIdentity,
  telegramDisplayName
} from './telegram-community-member-identity.js';

test('Telegram identity tracking separates name changes from username changes', () => {
  const original = normalizedTelegramIdentity({
    firstName: 'Asha',
    lastName: 'Kumar',
    username: 'asha_old'
  });
  const renamed = normalizedTelegramIdentity({
    firstName: 'Asha',
    lastName: 'Sharma',
    username: 'asha_new'
  });

  assert.deepEqual(changedTelegramIdentityFields(original, renamed), ['name', 'username']);
  assert.equal(telegramDisplayName(renamed), 'Asha Sharma');
});

test('Telegram identity tracking normalizes blank public profile fields', () => {
  const identity = normalizedTelegramIdentity({
    firstName: '  ',
    lastName: '',
    username: '  user  '
  });
  assert.deepEqual(identity, { firstName: null, lastName: null, username: 'user' });
  assert.equal(telegramDisplayName(identity), '@user');
});
