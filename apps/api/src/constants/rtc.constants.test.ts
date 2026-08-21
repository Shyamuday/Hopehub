import assert from 'node:assert/strict';
import test from 'node:test';
import { getRtcConfigurationStatus } from './rtc.constants.js';

test('RTC status reports UDP, TCP, and TLS 443 TURN coverage without exposing credentials', () => {
  const original = {
    urls: process.env.TURN_URLS,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
    secret: process.env.TURN_SHARED_SECRET,
    mode: process.env.TURN_CREDENTIAL_MODE
  };
  process.env.TURN_URLS = [
    'turn:turn.hopehub.in:3478?transport=udp',
    'turn:turn.hopehub.in:3478?transport=tcp',
    'turns:turn.hopehub.in:443?transport=tcp'
  ].join(',');
  process.env.TURN_SHARED_SECRET = 'test-only-secret';
  process.env.TURN_CREDENTIAL_MODE = 'temporary';
  delete process.env.TURN_USERNAME;
  delete process.env.TURN_CREDENTIAL;

  try {
    const status = getRtcConfigurationStatus();
    assert.equal(status.turnConfigured, true);
    assert.deepEqual(status.transports, { udp: true, tcp: true, tls443: true });
    assert.equal(status.credentialMode, 'temporary');
    assert.equal(status.relayHostCount, 1);
    assert.equal(status.redundant, false);
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
    if (original.mode === undefined) delete process.env.TURN_CREDENTIAL_MODE;
    else process.env.TURN_CREDENTIAL_MODE = original.mode;
  }
});

test('RTC status detects independent TURN hosts for relay failover', () => {
  const originalUrls = process.env.TURN_URLS;
  const originalUsername = process.env.TURN_USERNAME;
  const originalCredential = process.env.TURN_CREDENTIAL;
  process.env.TURN_URLS = [
    'turn:turn-a.hopehub.in:3478?transport=udp',
    'turns:turn-b.hopehub.in:443?transport=tcp'
  ].join(',');
  process.env.TURN_USERNAME = 'test';
  process.env.TURN_CREDENTIAL = 'test';
  try {
    const status = getRtcConfigurationStatus();
    assert.equal(status.relayHostCount, 2);
    assert.equal(status.redundant, true);
  } finally {
    if (originalUrls === undefined) delete process.env.TURN_URLS;
    else process.env.TURN_URLS = originalUrls;
    if (originalUsername === undefined) delete process.env.TURN_USERNAME;
    else process.env.TURN_USERNAME = originalUsername;
    if (originalCredential === undefined) delete process.env.TURN_CREDENTIAL;
    else process.env.TURN_CREDENTIAL = originalCredential;
  }
});

test('RTC status prefers static credentials when coturn static and shared settings coexist', () => {
  const original = {
    urls: process.env.TURN_URLS,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
    secret: process.env.TURN_SHARED_SECRET,
    mode: process.env.TURN_CREDENTIAL_MODE
  };
  process.env.TURN_URLS = 'turn:turn.hopehub.in:3478';
  process.env.TURN_USERNAME = 'hopehub';
  process.env.TURN_CREDENTIAL = 'test-static-password';
  process.env.TURN_SHARED_SECRET = 'test-shared-secret';
  delete process.env.TURN_CREDENTIAL_MODE;

  try {
    const status = getRtcConfigurationStatus();
    assert.equal(status.turnConfigured, true);
    assert.equal(status.credentialMode, 'static');
    assert.deepEqual(status.transports, { udp: true, tcp: true, tls443: false });
  } finally {
    if (original.urls === undefined) delete process.env.TURN_URLS;
    else process.env.TURN_URLS = original.urls;
    if (original.username === undefined) delete process.env.TURN_USERNAME;
    else process.env.TURN_USERNAME = original.username;
    if (original.credential === undefined) delete process.env.TURN_CREDENTIAL;
    else process.env.TURN_CREDENTIAL = original.credential;
    if (original.secret === undefined) delete process.env.TURN_SHARED_SECRET;
    else process.env.TURN_SHARED_SECRET = original.secret;
    if (original.mode === undefined) delete process.env.TURN_CREDENTIAL_MODE;
    else process.env.TURN_CREDENTIAL_MODE = original.mode;
  }
});
