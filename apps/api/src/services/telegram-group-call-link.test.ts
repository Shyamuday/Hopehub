import assert from 'node:assert/strict';
import test from 'node:test';
import { telegramGroupCallButton, telegramLiveVoiceJoinUrl } from './telegram-group-call-link.js';

test('scheduled event buttons do not claim that an inactive VC can be joined', () => {
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia', false), {
    text: 'Open group',
    url: 'https://t.me/hopehubindia'
  });
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia', true), {
    text: 'Open group',
    url: 'https://t.me/hopehubindia'
  });
});

test('live buttons use the exact exported call hash and open the Telegram app directly', () => {
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia?videochat=abc123', true), {
    text: 'Join VC',
    url: 'tg://resolve?domain=hopehubindia&videochat=abc123'
  });
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia?videochat', true), {
    text: 'Open group',
    url: 'https://t.me/hopehubindia'
  });
});

test('keeps non-Telegram meeting links usable while a call is live', () => {
  assert.deepEqual(telegramGroupCallButton('https://meet.example.com/room/123', true), {
    text: 'Join VC',
    url: 'https://meet.example.com/room/123'
  });
});

test('live reminders prefer the invite for the exact active call', () => {
  assert.equal(
    telegramLiveVoiceJoinUrl(
      'https://t.me/c/123/456?thread=789',
      'https://t.me/hopehubindia?videochat=old-call',
      'https://t.me/hopehubindia'
    ),
    'https://t.me/c/123/456?thread=789'
  );
  assert.equal(
    telegramLiveVoiceJoinUrl(undefined, undefined, 'https://t.me/hopehubindia'),
    'https://t.me/hopehubindia'
  );
});
