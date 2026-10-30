import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpModerationMemberLabel,
  groupHelpModerationMemberEntities
} from './telegram-group-help.moderation-member.js';

test('typed and button actions share the same target name and username formatting', () => {
  const direct = { id: 123, first_name: 'Asha', last_name: 'Mehta', username: 'asha' };
  const button = { telegramUserId: '123', firstName: 'Asha', lastName: 'Mehta', username: '@asha' };
  assert.equal(groupHelpModerationMemberLabel(direct), 'Asha Mehta (@asha)');
  assert.equal(groupHelpModerationMemberLabel(button), groupHelpModerationMemberLabel(direct));
});

test('members without usernames retain their ID and a correctly positioned clickable mention', () => {
  const member = { id: 123, first_name: '😀 Asha' };
  const label = groupHelpModerationMemberLabel(member);
  const text = `✅ Staff copy\n\n⚠️ Moderation notice\nMember: ${label}\nAction: Warned`;
  const [entity] = groupHelpModerationMemberEntities(text, member);
  assert.equal(label, '😀 Asha [123]');
  assert.equal(text.slice(entity.offset, entity.offset + entity.length), label);
  assert.equal(entity.type, 'text_mention');
  assert.equal(entity.type === 'text_mention' && entity.user.id, 123);
  assert.deepEqual(groupHelpModerationMemberEntities(text, { id: -1 }), []);
  assert.deepEqual(groupHelpModerationMemberEntities('Member not included', member), []);
});

test('names remain plain text and mentions target the immutable ID even when a username exists', () => {
  const member = { id: 456, first_name: '<b>Asha</b>\nMember:', username: 'asha' };
  const text = `Member: ${groupHelpModerationMemberLabel(member)}`;
  const entity = groupHelpModerationMemberEntities(text, member)[0];
  assert.equal(entity.type === 'text_mention' && entity.user.id, 456);
  assert.equal(groupHelpModerationMemberLabel(member).includes('\n'), false);
  assert.equal(groupHelpModerationMemberLabel({ id: 123 }), 'Telegram member [123]');
});

test('explicit member mentions preserve the configured Contact Bot username link', () => {
  const member = { id: 123, first_name: 'Asha', username: 'asha' };
  const text = `Member: ${groupHelpModerationMemberLabel(member)}\nContact @Contacthopehubbot`;
  const entities = groupHelpModerationMemberEntities(text, member);
  assert.equal(entities.length, 2);
  assert.equal(entities[1].type, 'mention');
  assert.equal(
    text.slice(entities[1].offset, entities[1].offset + entities[1].length),
    '@Contacthopehubbot'
  );
});
