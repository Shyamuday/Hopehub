import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpNoteRequestedByText,
  noteControlOptions,
  normalizeGroupHelpNoteName,
  parseGroupHelpNotes,
  parseGroupHelpSaveCommand,
  serializeGroupHelpNotes
} from './telegram-group-help.notes.js';

test('accepts only single-word note names and parses save content', () => {
  assert.equal(normalizeGroupHelpNoteName('Help_me'), 'help_me');
  assert.equal(normalizeGroupHelpNoteName('help me'), undefined);
  assert.deepEqual(
    parseGroupHelpSaveCommand({ message_id: 1, chat: { id: -1 }, text: '/save help Useful text' }),
    { name: 'help', text: 'Useful text', privacy: 'default', adminOnly: false }
  );
});

test('extracts note privacy, admin and repeated controls', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  assert.deepEqual(noteControlOptions('Hello {private} {admin} {repeat 6h}', now), {
    text: 'Hello',
    privacy: 'private',
    adminOnly: true,
    repeatSeconds: 21_600,
    nextRepeatAt: '2026-01-01T06:00:00.000Z'
  });
});

test('round-trips notes and recognizes exact hashtag retrieval', () => {
  const notes = [{ name: 'help', text: 'Hello', privacy: 'public' as const, adminOnly: false }];
  assert.deepEqual(parseGroupHelpNotes(serializeGroupHelpNotes(notes)), notes);
  assert.equal(groupHelpNoteRequestedByText('#HELP'), 'help');
  assert.equal(groupHelpNoteRequestedByText('See #help'), undefined);
});
