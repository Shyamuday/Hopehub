import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSiteConfigValue, shouldUseManagedDefault } from './site-config.service.js';

test('runtime config prefers the primary database value', () => {
  assert.deepEqual(resolveSiteConfigValue('telegramUsername', '@saved'), {
    value: '@saved',
    source: 'database'
  });
});

test('runtime config identifies a registered managed fallback', () => {
  const resolved = resolveSiteConfigValue('telegramUserBotUsername', undefined);
  assert.equal(resolved.source, 'managed-fallback');
  assert.notEqual(resolved.value, '');
});

test('runtime config distinguishes a registered key that has no safe default', () => {
  assert.deepEqual(resolveSiteConfigValue('telegramUsername', undefined), {
    value: '',
    source: 'missing-primary'
  });
});

test('runtime config reports unregistered keys instead of disguising them as managed defaults', () => {
  assert.deepEqual(resolveSiteConfigValue('notARegisteredHopeHubSetting', undefined), {
    value: '',
    source: 'unregistered'
  });
});

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
