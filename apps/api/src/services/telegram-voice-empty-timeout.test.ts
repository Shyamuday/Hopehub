import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_VOICE_CHAT_TIMEOUT_MS,
  knownVoiceStarterForEmptyAlert,
  trackEmptyVoiceChat,
  voiceStarterSnapshot,
  voiceChatOccupancyCheckDue
} from './telegram-voice-empty-timeout.js';

function at(start: Date, minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000);
}

test('closes only after five continuously observed empty minutes', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  let payload = trackEmptyVoiceChat({}, 0, start).payload;

  for (let minute = 1; minute < 5; minute += 1) {
    const result = trackEmptyVoiceChat(payload, 0, at(start, minute));
    assert.equal(result.shouldClose, false);
    payload = result.payload;
  }

  const result = trackEmptyVoiceChat(payload, 0, at(start, 5));
  assert.equal(result.shouldClose, true);
  assert.equal(
    Date.parse(result.payload.lastParticipantCheckAt!) - Date.parse(result.payload.emptySince!),
    EMPTY_VOICE_CHAT_TIMEOUT_MS
  );
});

test('a participant joining resets the empty timer', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  let payload = trackEmptyVoiceChat({}, 0, start).payload;
  payload = trackEmptyVoiceChat(payload, 0, at(start, 1)).payload;

  const occupied = trackEmptyVoiceChat(payload, 2, at(start, 2));
  assert.equal(occupied.shouldClose, false);
  assert.equal(occupied.payload.emptySince, undefined);
  assert.equal(occupied.payload.participantCount, 2);

  let restarted = trackEmptyVoiceChat(occupied.payload, 0, at(start, 3));
  assert.equal(restarted.payload.emptySince, at(start, 3).toISOString());
  for (let minute = 4; minute < 8; minute += 1) {
    restarted = trackEmptyVoiceChat(restarted.payload, 0, at(start, minute));
  }
  assert.equal(restarted.shouldClose, false);

  const closed = trackEmptyVoiceChat(restarted.payload, 0, at(start, 8));
  assert.equal(closed.shouldClose, true);
});

test('an unobserved gap restarts the safety timer', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  const first = trackEmptyVoiceChat({}, 0, start);
  const afterGap = trackEmptyVoiceChat(first.payload, 0, at(start, 8));

  assert.equal(afterGap.shouldClose, false);
  assert.equal(afterGap.payload.emptySince, at(start, 8).toISOString());
});

test('an invalid Telegram participant count never advances closure', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  const first = trackEmptyVoiceChat({}, 0, start);
  const unknown = trackEmptyVoiceChat(first.payload, Number.NaN, at(start, 5));

  assert.equal(unknown.shouldClose, false);
  assert.deepEqual(unknown.payload, first.payload);
});

test('occupied calls are checked every ten minutes', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  const occupied = trackEmptyVoiceChat({}, 3, start).payload;

  assert.equal(voiceChatOccupancyCheckDue(occupied, at(start, 9)), false);
  assert.equal(voiceChatOccupancyCheckDue(occupied, at(start, 10)), true);
});

test('an empty observation requests its confirmation after five minutes', () => {
  const start = new Date('2026-09-08T06:00:00.000Z');
  const empty = trackEmptyVoiceChat({}, 0, start).payload;

  assert.equal(voiceChatOccupancyCheckDue(empty, at(start, 4)), false);
  assert.equal(voiceChatOccupancyCheckDue(empty, at(start, 5)), true);
  assert.equal(trackEmptyVoiceChat(empty, 0, at(start, 5)).shouldClose, true);
});

test('identifies the administrator who started an empty VC instead of its last member', () => {
  const administrator = {
    telegramUserId: '123',
    firstName: 'VC Host',
    username: 'vc_host'
  };

  assert.deepEqual(
    knownVoiceStarterForEmptyAlert({ participantCount: 8, startedBy: administrator }, 0),
    administrator
  );
  assert.equal(knownVoiceStarterForEmptyAlert({ participantCount: 1 }, 0), undefined);
  assert.equal(knownVoiceStarterForEmptyAlert({ startedBy: administrator }, 1), undefined);
  assert.equal(
    knownVoiceStarterForEmptyAlert(
      {
        startedBy: administrator,
        emptyLeaveAlertedAt: '2026-09-08T06:10:00.000Z'
      },
      0
    ),
    undefined
  );
});

test('captures the VC starter from Telegram service-message identity', () => {
  assert.deepEqual(
    voiceStarterSnapshot({
      id: 123,
      first_name: 'VC',
      last_name: 'Admin',
      username: 'vc_admin'
    }),
    {
      telegramUserId: '123',
      firstName: 'VC',
      lastName: 'Admin',
      username: 'vc_admin'
    }
  );
  assert.equal(voiceStarterSnapshot(undefined), undefined);
  assert.equal(voiceStarterSnapshot({ id: 99, is_bot: true }), undefined);
});
