import assert from 'node:assert/strict';
import test from 'node:test';
import {
  postButtons,
  postContent,
  postInteger,
  postSchedule
} from './telegram-post-editor-policy.js';

test('text and uploaded photo/video posts retain the correct media type', () => {
  const base = { message_id: 1, chat: { id: 1, type: 'private' } };
  assert.equal(postContent({ ...base, text: 'Hello' }).imageUrl, null);
  assert.equal(
    postContent({ ...base, photo: [{ file_id: 'small' }, { file_id: 'large' }], caption: 'Photo' })
      .imageUrl,
    'photo:large'
  );
  assert.equal(postContent({ ...base, video: { file_id: 'movie' } }).imageUrl, 'video:movie');
  assert.throws(() =>
    postContent({ ...base, video: { file_id: 'movie' }, caption: 'x'.repeat(1025) })
  );
  assert.throws(() => postContent({ ...base, text: 'x'.repeat(4097) }));
  assert.throws(() => postContent(base));
});

test('schedule parses IST, rejects malformed dates, past times and overflow days', () => {
  const now = new Date('2026-10-12T00:00:00Z');
  assert.equal(postSchedule('2026-10-13 18:30', now).toISOString(), '2026-10-13T13:00:00.000Z');
  for (const value of ['2026-02-30 10:00', '2026-99-12 10:00', 'tomorrow', '2026-10-01 10:00'])
    assert.throws(() => postSchedule(value, now));
});

test('config numbers and URL buttons are bounded and validated', () => {
  assert.equal(postInteger('1440', 1, 525600), 1440);
  assert.throws(() => postInteger('0', 1, 525600));
  assert.throws(() => postInteger('1.5', 1, 525600));
  assert.deepEqual(postButtons('Website | https://hopehub.in'), [
    { text: 'Website', url: 'https://hopehub.in' }
  ]);
  assert.deepEqual(postButtons('-'), []);
  assert.throws(() => postButtons('Click | javascript:alert(1)'));
});
