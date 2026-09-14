import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpAdminMentionPhotoCaption,
  hasGroupHelpAdminMention
} from './telegram-group-help.admin-mentions.js';

test('recognizes common administrator and moderator mention variants', () => {
  for (const mention of [
    '@admin',
    '@admins',
    '@admnn',
    '@admnns',
    '@administrator',
    '@administrators',
    '@mod',
    '@mods',
    '@moderator',
    '@moderators'
  ]) {
    assert.equal(hasGroupHelpAdminMention(`${mention} please help`), true, mention);
    assert.equal(
      hasGroupHelpAdminMention(`Could ${mention.toUpperCase()} check this?`),
      true,
      mention
    );
  }
  assert.equal(hasGroupHelpAdminMention('admin'), true);
  assert.equal(hasGroupHelpAdminMention('Admins!'), true);
});

test('does not treat part of a username as an administrator request', () => {
  assert.equal(hasGroupHelpAdminMention('mail@admin.example'), false);
  assert.equal(hasGroupHelpAdminMention('Please ask @adminsupport'), false);
  assert.equal(hasGroupHelpAdminMention('Please ask @moderator_team'), false);
  assert.equal(hasGroupHelpAdminMention('The administration reviewed it'), false);
  assert.equal(hasGroupHelpAdminMention('An admin reviewed it'), false);
});

test('keeps administrator-request photo captions within Telegram limits', () => {
  assert.equal(groupHelpAdminMentionPhotoCaption('  Please help  '), 'Please help');
  const caption = groupHelpAdminMentionPhotoCaption(`Alert ${'🙂'.repeat(1100)}`);
  assert.equal(Array.from(caption).length, 1024);
  assert.equal(caption.endsWith('...'), true);
});
