import assert from 'node:assert/strict';
import test from 'node:test';
import { getRtcConfigurationStatus } from './rtc.constants.js';

test('RTC status reports UDP, TCP, and TLS 443 TURN coverage without exposing credentials', () => {
  const original = {
    urls: process.env.TURN_URLS,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
    secret: process.env.TURN_SHARED_SECRET
  };
  process.env.TURN_URLS = [
    'turn:turn.hopehub.in:3478?transport=udp',
    'turn:turn.hopehub.in:3478?transport=tcp',
    'turns:turn.hopehub.in:443?transport=tcp'
  ].join(',');
  process.env.TURN_SHARED_SECRET = 'test-only-secret';
  delete process.env.TURN_USERNAME;
  delete process.env.TURN_CREDENTIAL;

  try {
    const status = getRtcConfigurationStatus();
    assert.equal(status.turnConfigured, true);
    assert.deepEqual(status.transports, { udp: true, tcp: true, tls443: true });
    assert.equal(status.credentialMode, 'temporary');
    assert.equal(JSON.stringify(status).includes('test-only-secret'), false);
  } finally {
    if (original.urls === undefined) delete process.env.TURN_URLS;
    else process.env.TURN_URLS = original.urls;
    if (original.username === undefined) delete process.env.TURN_USERNAME;
    else process.env.TURN_USERNAME = original.username;
    if (original.credential === undefined) delete process.env.TURN_CREDENTIAL;
    else process.env.TURN_CREDENTIAL = original.credential;
    if (original.secret === undefined) delete process.env.TURN_SHARED_SECRET;
    else process.env.TURN_SHARED_SECRET = original.secret;
  }
});
