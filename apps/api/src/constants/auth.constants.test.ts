import assert from 'node:assert/strict';
import test from 'node:test';
import { JWT_EXPIRY } from './auth.constants.js';

test('access tokens are configured to remain valid for 30 days', () => {
  assert.equal(JWT_EXPIRY, '30d');
});
