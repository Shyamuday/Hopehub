import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consultationAllowsCallMode,
  normalizeQuickTalkMode,
  quickTalkAvailabilityWhere,
  requestedQuickTalkMode
} from './quick-talk-modes.js';

test('quick-talk session creation keeps voice as its safe default', () => {
  assert.equal(normalizeQuickTalkMode(undefined), 'voice');
  assert.equal(normalizeQuickTalkMode('online_video'), 'video');
  assert.equal(normalizeQuickTalkMode('live_chat'), 'chat');
});

test('quick-talk discovery preserves an omitted mode preference', () => {
  assert.equal(requestedQuickTalkMode(''), null);
  assert.deepEqual(quickTalkAvailabilityWhere(''), {
    OR: [{ acceptsChat: true }, { acceptsVoiceCall: true }, { acceptsVideoCall: true }]
  });
});

test('quick-talk discovery uses an explicitly selected mode', () => {
  assert.deepEqual(quickTalkAvailabilityWhere('video'), { acceptsVideoCall: true });
});

test('consultation calls switch only to saved provider modes', () => {
  const intake = { allowedSessionModes: ['chat', 'voice'] };
  assert.equal(consultationAllowsCallMode(intake, 'audio'), true);
  assert.equal(consultationAllowsCallMode(intake, 'video'), false);
  assert.equal(
    consultationAllowsCallMode({ allowedSessionModes: ['chat', 'voice', 'video'] }, 'video'),
    true
  );
});

test('legacy consultations retain their original call restrictions', () => {
  assert.equal(consultationAllowsCallMode({ sessionMode: 'live_chat' }, 'audio'), false);
  assert.equal(consultationAllowsCallMode({ sessionMode: 'online_audio' }, 'video'), false);
  assert.equal(consultationAllowsCallMode({ sessionMode: 'online_video' }, 'audio'), true);
});
