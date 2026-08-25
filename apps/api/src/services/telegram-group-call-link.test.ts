import assert from 'node:assert/strict';
import test from 'node:test';
import { telegramVideoChatJoinUrl } from './telegram-group-call-link.js';

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
