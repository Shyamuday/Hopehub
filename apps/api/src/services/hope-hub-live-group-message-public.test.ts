import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PUBLIC_TELEGRAM_MEMBER_ID,
  PUBLIC_TELEGRAM_MEMBER_NAME,
  serializePublicHopeHubLiveGroupMessage
} from './hope-hub-live-group-message-public.js';

const createdAt = new Date('2026-08-31T10:00:00.000Z');

test('removes Telegram identity from the public live-chat payload', () => {
  const payload = serializePublicHopeHubLiveGroupMessage({
    id: 'message-1',
    groupId: 'group-1',
    senderId: 'telegram:7193161946',
    senderName: '@private_username',
    senderRole: 'TELEGRAM_MEMBER',
    body: 'Hello from Telegram',
    createdAt
  });

  assert.equal(payload.senderId, PUBLIC_TELEGRAM_MEMBER_ID);
  assert.equal(payload.senderName, PUBLIC_TELEGRAM_MEMBER_NAME);
  assert.equal(JSON.stringify(payload).includes('7193161946'), false);
  assert.equal(JSON.stringify(payload).includes('private_username'), false);
});

test('keeps website sender identity while hiding moderator account IDs', () => {
  const payload = serializePublicHopeHubLiveGroupMessage({
    id: 'message-2',
    groupId: 'group-1',
    senderId: 'website-user-1',
    senderName: 'Amit',
    senderRole: 'PATIENT',
    body: 'Removed text',
    isDeleted: true,
    deletedAt: createdAt,
    deletedByUserId: 'private-moderator-id',
    createdAt
  });

  assert.equal(payload.senderId, 'website-user-1');
  assert.equal(payload.senderName, 'Amit');
  assert.equal(payload.body, 'Message removed by moderator.');
  assert.equal(payload.deletedByUserId, null);
  assert.equal(JSON.stringify(payload).includes('private-moderator-id'), false);
});
