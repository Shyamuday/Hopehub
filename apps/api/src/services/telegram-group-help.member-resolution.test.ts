import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseGroupHelpTargetReference,
  resolveGroupHelpTelegramUserIdWithLookup
} from './telegram-group-help.member-resolution.js';

test('Group Help targets accept Telegram IDs and usernames consistently', () => {
  assert.deepEqual(parseGroupHelpTargetReference('7217536617'), {
    kind: 'id',
    value: 7217536617
  });
  assert.deepEqual(parseGroupHelpTargetReference('@MindCraft'), {
    kind: 'username',
    value: 'MindCraft'
  });
  assert.deepEqual(parseGroupHelpTargetReference('spiritualspirit'), {
    kind: 'username',
    value: 'spiritualspirit'
  });
});

test('Group Help targets reject unsafe IDs and malformed usernames', () => {
  assert.equal(parseGroupHelpTargetReference('9007199254740992'), null);
  assert.equal(parseGroupHelpTargetReference('@bad-name'), null);
  assert.equal(parseGroupHelpTargetReference(''), null);
});

test('numeric IDs bypass username lookup and usernames resolve to the stored immutable ID', async () => {
  let lookedUp = '';
  const findByUsername = async (username: string) => {
    lookedUp = username;
    return '7217536617';
  };

  assert.equal(
    await resolveGroupHelpTelegramUserIdWithLookup('123456789', findByUsername),
    123456789
  );
  assert.equal(lookedUp, '');
  assert.equal(
    await resolveGroupHelpTelegramUserIdWithLookup('@MindCraft', findByUsername),
    7217536617
  );
  assert.equal(lookedUp, 'MindCraft');
});
