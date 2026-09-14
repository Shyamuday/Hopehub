import assert from 'node:assert/strict';
import test from 'node:test';
import { activeTelegramGroupWarningEntries } from './telegram-community-bots.store.js';

test('preserves legacy warning counts while converting old reason-only payloads', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  const entries = activeTelegramGroupWarningEntries(
    { count: 3, reasons: ['spam', 'insult'] },
    undefined,
    now
  );
  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => entry.reason),
    ['Legacy warning', 'spam', 'insult']
  );
});

test('expires each warning independently using its recorded timestamp', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  const entries = activeTelegramGroupWarningEntries(
    {
      entries: [
        { reason: 'old', createdAt: '2026-09-01T12:00:00.000Z' },
        { reason: 'active', createdAt: '2026-09-10T12:00:00.000Z' }
      ]
    },
    7 * 24 * 60 * 60,
    now
  );
  assert.deepEqual(
    entries.map((entry) => entry.reason),
    ['active']
  );
});

test('uses the record update time when expiring legacy warnings', () => {
  const entries = activeTelegramGroupWarningEntries(
    { count: 1, reasons: ['legacy'] },
    7 * 24 * 60 * 60,
    new Date('2026-09-14T12:00:00.000Z'),
    new Date('2026-09-01T12:00:00.000Z')
  );
  assert.deepEqual(entries, []);
});
