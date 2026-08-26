import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callEventPhase,
  safeCallEventMetadata,
  shouldPersistCallEvent
} from './call-event-tracker.js';

test('call event tracker keeps useful diagnostics and strips signaling/media secrets', () => {
  assert.deepEqual(
    safeCallEventMetadata({
      userAgent: 'Mobile Safari',
      connectionState: 'failed',
      usedTurnRelay: true,
      packetLossPercent: 8.2,
      setupToConnectedMs: 1750,
      pushAttempted: 2,
      pushDelivered: 1,
      pushDisabled: 1,
      audioChannelCount: 1,
      audioSampleRate: 48000,
      audioEchoCancellation: true,
      audioNoiseSuppression: true,
      audioAutoGainControl: true,
      videoPausedForNetwork: true,
      gatheredCandidateTypes: 'host,srflx,relay',
      gatheredCandidateCount: 6,
      gatheredRelayCandidateCount: 2,
      audioPlaybackBlocked: true,
      speakerOutputChangeFailed: false,
      sdp: 'private-session-description',
      candidate: 'candidate with an IP address',
      authorization: 'secret'
    }),
    {
      userAgent: 'Mobile Safari',
      connectionState: 'failed',
      usedTurnRelay: true,
      packetLossPercent: 8.2,
      setupToConnectedMs: 1750,
      pushAttempted: 2,
      pushDelivered: 1,
      pushDisabled: 1,
      audioChannelCount: 1,
      audioSampleRate: 48000,
      audioEchoCancellation: true,
      audioNoiseSuppression: true,
      audioAutoGainControl: true,
      videoPausedForNetwork: true,
      gatheredCandidateTypes: 'host,srflx,relay',
      gatheredCandidateCount: 6,
      gatheredRelayCandidateCount: 2,
      audioPlaybackBlocked: true,
      speakerOutputChangeFailed: false
    }
  );
  assert.deepEqual(
    safeCallEventMetadata({
      sdp: 'private-session-description',
      candidate: 'candidate with an IP address',
      authorization: 'secret'
    }),
    {}
  );
});

test('call event tracker stores lifecycle and rejected events without routine packet noise', () => {
  assert.equal(shouldPersistCallEvent('call:ring', 'ACCEPTED'), true);
  assert.equal(shouldPersistCallEvent('call:answer', 'ACCEPTED'), true);
  assert.equal(shouldPersistCallEvent('call:ice-candidate', 'ACCEPTED'), false);
  assert.equal(shouldPersistCallEvent('call:heartbeat', 'ACCEPTED'), false);
  assert.equal(shouldPersistCallEvent('call:ice-candidate', 'REJECTED'), true);
});

test('call event tracker groups events into readable diagnostic phases', () => {
  assert.equal(callEventPhase('call:ring'), 'SETUP');
  assert.equal(callEventPhase('call:diagnostic'), 'DIAGNOSTIC');
  assert.equal(callEventPhase('call:media-state'), 'MEDIA');
  assert.equal(callEventPhase('call:end'), 'TEARDOWN');
});
