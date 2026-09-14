import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateGroupHelpBotMembership } from './telegram-group-help.permission-audit.js';

test('permission audit identifies missing Telegram rights', () => {
  const result = evaluateGroupHelpBotMembership({
    status: 'administrator',
    can_delete_messages: true,
    can_restrict_members: true,
    can_pin_messages: false,
    can_manage_video_chats: true
  });
  assert.equal(result.administrator, true);
  assert.deepEqual(result.missing, ['can_pin_messages']);
});

test('permission audit fails closed for unreachable or non-admin bot', () => {
  assert.equal(evaluateGroupHelpBotMembership(null).reachable, false);
  assert.equal(evaluateGroupHelpBotMembership({ status: 'member' }).administrator, false);
});
