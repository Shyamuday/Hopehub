import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredCleaningTypes,
  GROUP_HELP_CLEAN_COMMAND_TYPES,
  groupHelpServiceMessageType,
  shouldCleanGroupHelpType,
  updatedCleaningTypes
} from './telegram-group-help.cleaning.js';

test('normalizes cleaning types and safely expands all when one type is kept', () => {
  assert.deepEqual(configuredCleaningTypes(undefined, GROUP_HELP_CLEAN_COMMAND_TYPES, true), [
    'all'
  ]);
  assert.equal(
    updatedCleaningTypes({
      current: 'all',
      requested: ['other'],
      allowed: GROUP_HELP_CLEAN_COMMAND_TYPES,
      enable: false,
      defaultToAll: true
    }),
    'admin\nuser'
  );
  assert.equal(
    updatedCleaningTypes({
      current: 'none',
      requested: ['admin', 'user'],
      allowed: GROUP_HELP_CLEAN_COMMAND_TYPES,
      enable: true
    }),
    'admin\nuser'
  );
  assert.equal(
    updatedCleaningTypes({
      current: 'none',
      requested: ['invalid'],
      allowed: GROUP_HELP_CLEAN_COMMAND_TYPES,
      enable: true
    }),
    undefined
  );
});

test('checks selected types while preserving the existing command-cleanup default', () => {
  assert.equal(
    shouldCleanGroupHelpType(undefined, 'admin', GROUP_HELP_CLEAN_COMMAND_TYPES, true),
    true
  );
  assert.equal(
    shouldCleanGroupHelpType('user', 'admin', GROUP_HELP_CLEAN_COMMAND_TYPES, true),
    false
  );
  assert.equal(
    shouldCleanGroupHelpType('user', 'user', GROUP_HELP_CLEAN_COMMAND_TYPES, true),
    true
  );
});

test('classifies Telegram service messages without treating normal messages as service events', () => {
  const base = { message_id: 1, chat: { id: -1 } };
  assert.equal(groupHelpServiceMessageType({ ...base, new_chat_members: [{ id: 2 }] }), 'join');
  assert.equal(groupHelpServiceMessageType({ ...base, pinned_message: { ...base } }), 'pin');
  assert.equal(groupHelpServiceMessageType({ ...base, video_chat_started: {} }), 'videochat');
  assert.equal(groupHelpServiceMessageType({ ...base, text: 'ordinary message' }), undefined);
});
