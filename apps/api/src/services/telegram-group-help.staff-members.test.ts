import assert from 'node:assert/strict';
import test from 'node:test';
import { directoryMemberIdentityPlan } from './telegram-group-help.staff-members.js';

test('MTProto directory sync cannot replace a Bot API public name with a contact label', () => {
  const plan = directoryMemberIdentityPlan(
    { firstName: 'Hope', lastName: null, username: 'beatmonk' },
    {
      telegramUserId: '8472882273',
      firstName: 'Tintin Kolkata',
      username: 'beatmonk'
    }
  );

  assert.deepEqual(plan.discovered, {
    firstName: 'Tintin Kolkata',
    lastName: null,
    username: 'beatmonk'
  });
  assert.deepEqual(plan.historyIdentity, {
    firstName: 'Hope',
    lastName: null,
    username: 'beatmonk'
  });
  assert.deepEqual(plan.update, { leftAt: null });
  assert.equal(Object.hasOwn(plan.update, 'firstName'), false);
  assert.equal(Object.hasOwn(plan.update, 'username'), false);
});
