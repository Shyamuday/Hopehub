import assert from 'node:assert/strict';
import test from 'node:test';
import { telegramGroupCallButton, telegramVideoChatJoinUrl } from './telegram-group-call-link.js';

test('uses Telegram video-chat links for public group URLs', () => {
  assert.equal(
    telegramVideoChatJoinUrl('https://t.me/hopehubindia'),
    'https://t.me/hopehubindia?videochat'
  );
});

test('does not rewrite private Telegram invites or external meeting links', () => {
  assert.equal(
    telegramVideoChatJoinUrl('https://t.me/+privateInviteHash'),
    'https://t.me/+privateInviteHash'
  );
  assert.equal(
    telegramVideoChatJoinUrl('https://meet.example.com/room/123'),
    'https://meet.example.com/room/123'
  );
});

test('keeps an already configured video-chat link intact', () => {
  assert.equal(
    telegramVideoChatJoinUrl('https://t.me/hopehubindia?videochat'),
    'https://t.me/hopehubindia?videochat'
  );
});

test('scheduled event buttons do not claim that an inactive VC can be joined', () => {
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia', false), {
    text: 'Open group',
    url: 'https://t.me/hopehubindia'
  });
  assert.deepEqual(telegramGroupCallButton('https://t.me/hopehubindia', true), {
    text: 'Join VC',
    url: 'https://t.me/hopehubindia?videochat'
  });
});
