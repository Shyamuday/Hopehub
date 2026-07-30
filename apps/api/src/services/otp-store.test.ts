import assert from 'node:assert/strict';
import test from 'node:test';
import { storeOtpEntry, verifyOtpEntry, verifyOtpEntryDetailed } from './otp-store.js';

test('keeps OTP available after a wrong attempt and consumes it after success', async () => {
  const identifier = `otp-test-${Date.now()}-${Math.random()}`;

  await storeOtpEntry(identifier, '123456');

  assert.equal(await verifyOtpEntry(identifier, '000000'), false);
  assert.deepEqual(await verifyOtpEntryDetailed(identifier, '000000'), {
    ok: false,
    reason: 'mismatch'
  });
  assert.equal(await verifyOtpEntry(identifier, '123456'), true);
  assert.equal(await verifyOtpEntry(identifier, '123456'), false);
});

test('trims submitted OTP before verifying', async () => {
  const identifier = `otp-test-trim-${Date.now()}-${Math.random()}`;

  await storeOtpEntry(identifier, '654321');

  assert.equal(await verifyOtpEntry(identifier, ' 654321 '), true);
});

test('reports missing OTP verification reason', async () => {
  const identifier = `otp-test-missing-${Date.now()}-${Math.random()}`;

  assert.deepEqual(await verifyOtpEntryDetailed(identifier, '123456'), {
    ok: false,
    reason: 'missing'
  });
});
