import assert from 'node:assert/strict';
import test from 'node:test';
import { hasGroupHelpAdminMention } from './telegram-group-help.admin-mentions.js';

test('recognizes @admin as a standalone request', () => {
  assert.equal(hasGroupHelpAdminMention('@admin please help'), true);
  assert.equal(hasGroupHelpAdminMention('Could @admin check this?'), true);
});

test('does not treat part of a username as an administrator request', () => {
  assert.equal(hasGroupHelpAdminMention('Please ask @administrator'), false);
  assert.equal(hasGroupHelpAdminMention('mail@admin.example'), false);
});
