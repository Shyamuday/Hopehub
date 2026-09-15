import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isManagedTelegramVoiceChat,
  shouldAdoptLiveVoiceCall
} from './telegram-voice-event-reconciliation.js';

test('limits VC lifecycle automation to the configured main group', () => {
  assert.equal(isManagedTelegramVoiceChat('-100-main', '-100-main'), true);
  assert.equal(isManagedTelegramVoiceChat('-100-off-topic', '-100-main'), false);
  assert.equal(isManagedTelegramVoiceChat('-100-main', ''), false);
  assert.equal(isManagedTelegramVoiceChat('-100-main', undefined), false);
});

test('adopts a live call when the scheduled event is already tracked', () => {
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'current',
      latestOverdueEventId: 'newer',
      trackedEventId: 'current',
      trackedEventStatus: 'SCHEDULED'
    }),
    true
  );
});

test('adopts an unassociated live call for only the latest overdue event', () => {
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'latest',
      latestOverdueEventId: 'latest'
    }),
    true
  );
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'older',
      latestOverdueEventId: 'latest'
    }),
    false
  );
});

test('does not steal a live call from another active event', () => {
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'latest',
      latestOverdueEventId: 'latest',
      trackedEventId: 'other',
      trackedEventStatus: 'IN_PROGRESS'
    }),
    false
  );
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'latest',
      latestOverdueEventId: 'latest',
      trackedEventId: 'other',
      trackedEventStatus: 'FUTURE_ACTIVE_STATE'
    }),
    false
  );
});

test('replaces a stale completed or missing tracked event association', () => {
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'latest',
      latestOverdueEventId: 'latest',
      trackedEventId: 'old',
      trackedEventStatus: 'COMPLETED'
    }),
    true
  );
  assert.equal(
    shouldAdoptLiveVoiceCall({
      eventId: 'latest',
      latestOverdueEventId: 'latest',
      trackedEventId: 'deleted'
    }),
    true
  );
});
