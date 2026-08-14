import assert from 'node:assert/strict';
import test from 'node:test';
import { callQualitySnapshot } from './call-session-quality.js';

test('callQualitySnapshot keeps bounded diagnostic summaries only', () => {
  assert.deepEqual(
    callQualitySnapshot({
      usedTurnRelay: true,
      qualitySummary: {
        quality: 'poor',
        reconnectCount: 3.4,
        averageRttMs: 412.7,
        packetLossPercent: 7.25,
        maxJitterMs: 88.2,
        ignored: 'not persisted'
      }
    }),
    {
      qualitySummary: {
        quality: 'poor',
        reconnectCount: 3,
        usedTurnRelay: true,
        averageRttMs: 413,
        packetLossPercent: 7.25,
        maxJitterMs: 88
      },
      reconnectCount: 3,
      usedTurnRelay: true,
      averageRttMs: 413,
      packetLossPercent: 7.25,
      maxJitterMs: 88
    }
  );
});

test('callQualitySnapshot rejects malformed diagnostics and clamps unsafe values', () => {
  assert.deepEqual(callQualitySnapshot(null), {});
  assert.deepEqual(
    callQualitySnapshot({
      qualitySummary: {
        quality: 'excellent',
        reconnectCount: 999,
        averageRttMs: -5,
        packetLossPercent: 250,
        maxJitterMs: Number.NaN
      }
    }),
    {
      qualitySummary: {
        quality: 'unknown',
        reconnectCount: 100,
        usedTurnRelay: false,
        averageRttMs: 0,
        packetLossPercent: 100
      },
      reconnectCount: 100,
      usedTurnRelay: false,
      averageRttMs: 0,
      packetLossPercent: 100
    }
  );
});
