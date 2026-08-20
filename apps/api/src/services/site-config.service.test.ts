import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldUseManagedDefault } from './site-config.service.js';

test('managed defaults initialize a missing database value', () => {
  assert.equal(
    shouldUseManagedDefault({
      current: undefined,
      previousDefault: undefined,
      explicitlyOverridden: false
    }),
    true
  );
});

test('managed defaults upgrade values that still match the prior default', () => {
  assert.equal(
    shouldUseManagedDefault({
      current: 'old default',
      previousDefault: 'old default',
      explicitlyOverridden: false
    }),
    true
  );
});

test('managed defaults preserve an explicit admin override even when it equals the old default', () => {
  assert.equal(
    shouldUseManagedDefault({
      current: 'old default',
      previousDefault: 'old default',
      explicitlyOverridden: true
    }),
    false
  );
});

test('managed defaults preserve legacy database values without an ownership snapshot', () => {
  assert.equal(
    shouldUseManagedDefault({
      current: 'production value',
      previousDefault: undefined,
      explicitlyOverridden: false
    }),
    false
  );
});
