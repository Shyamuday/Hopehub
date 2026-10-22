import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupHelpMessageHasSendableMedia } from './telegram-group-help.bot-send.js';

const baseMessage = { message_id: 1, chat: { id: -1001 } };

test('recognizes every media type supported by the Group Help send command', () => {
  assert.equal(
    groupHelpMessageHasSendableMedia({
      ...baseMessage,
      photo: [{ file_id: 'small' }, { file_id: 'large' }]
    }),
    true
  );
  for (const field of [
    'video',
    'animation',
    'document',
    'audio',
    'voice',
    'video_note',
    'sticker'
  ] as const) {
    assert.equal(
      groupHelpMessageHasSendableMedia({ ...baseMessage, [field]: { file_id: field } }),
      true,
      field
    );
  }
});

test('does not treat plain text or unsupported Telegram payloads as sendable media', () => {
  assert.equal(groupHelpMessageHasSendableMedia({ ...baseMessage, text: 'hello' }), false);
  assert.equal(groupHelpMessageHasSendableMedia(undefined), false);
});
