import assert from 'node:assert/strict';
import test from 'node:test';
import { staffPasswordLoginSchema } from './staff-login-validation.js';

test('staff password login accepts legacy passwords shorter than eight characters', () => {
  const result = staffPasswordLoginSchema.safeParse({
    email: 'doctor@example.com',
    password: 'old123'
  });

  assert.equal(result.success, true);
});

test('staff password login still rejects an empty password', () => {
  const result = staffPasswordLoginSchema.safeParse({
    email: 'doctor@example.com',
    password: ''
  });

  assert.equal(result.success, false);
});
