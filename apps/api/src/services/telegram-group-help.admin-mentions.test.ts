import assert from 'node:assert/strict';
import test from 'node:test';
import { hasGroupHelpAdminMention } from './telegram-group-help.admin-mentions.js';

test('recognizes common administrator and moderator mention variants', () => {
  for (const mention of [
    '@admin',
    '@admins',
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
});

test('does not treat part of a username as an administrator request', () => {
  assert.equal(hasGroupHelpAdminMention('mail@admin.example'), false);
  assert.equal(hasGroupHelpAdminMention('Please ask @adminsupport'), false);
  assert.equal(hasGroupHelpAdminMention('Please ask @moderator_team'), false);
  assert.equal(hasGroupHelpAdminMention('The administration reviewed it'), false);
});
