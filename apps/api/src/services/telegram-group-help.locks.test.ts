import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredGroupHelpLocks,
  matchedGroupHelpLock,
  updateGroupHelpLocks
} from './telegram-group-help.locks.js';

const message = (extra: Record<string, unknown>) =>
  ({ message_id: 1, chat: { id: -1 }, ...extra }) as any;

test('group locks support all and granular unlocks', () => {
  const all = updateGroupHelpLocks('', ['all'], true)!;
  assert.deepEqual(configuredGroupHelpLocks(all), [
    'commands',
    'forwards',
    'links',
    'media',
    'stickers'
  ]);
  assert.equal(
    configuredGroupHelpLocks(updateGroupHelpLocks(all, ['links'], false)!).includes('links'),
    false
  );
  assert.equal(updateGroupHelpLocks('', ['unknown'], true), null);
});

test('group locks distinguish stickers, media, links, forwards, and commands', () => {
  assert.equal(matchedGroupHelpLock(message({ sticker: {} }), 'stickers'), 'stickers');
  assert.equal(matchedGroupHelpLock(message({ photo: [{}] }), 'media'), 'media');
  assert.equal(
    matchedGroupHelpLock(message({ text: 'visit https://hopehub.in' }), 'links'),
    'links'
  );
  assert.equal(
    matchedGroupHelpLock(message({ text: 'hello', forward_origin: {} }), 'forwards'),
    'forwards'
  );
  assert.equal(matchedGroupHelpLock(message({ text: '/rules' }), 'commands'), 'commands');
});
