import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseFilterBuilderTriggers,
  upsertFilterBuilderFilter
} from './telegram-group-help.filter-builder.js';
import { parseGroupHelpFilters, serializeGroupHelpFilters } from './telegram-group-help.filters.js';

test('filter builder accepts a word, sentence, or several alternatives', () => {
  assert.deepEqual(parseFilterBuilderTriggers('panic attack'), [
    { value: 'panic attack', mode: 'contains' }
  ]);
  assert.deepEqual(parseFilterBuilderTriggers('hello, exact:help me\nprefix:/site'), [
    { value: 'hello', mode: 'contains' },
    { value: 'help me', mode: 'exact' },
    { value: '/site', mode: 'prefix' }
  ]);
  assert.deepEqual(parseFilterBuilderTriggers('Hello, hello'), [
    { value: 'hello', mode: 'contains' }
  ]);
});

test('filter builder replaces matching triggers while preserving other filters', () => {
  const initial = serializeGroupHelpFilters([
    {
      triggers: [
        { value: 'hello', mode: 'contains' },
        { value: 'hi', mode: 'contains' }
      ],
      text: 'Old greeting',
      audience: 'all',
      allowBots: false
    },
    {
      triggers: [{ value: 'rules', mode: 'exact' }],
      text: 'Read the rules',
      audience: 'all',
      allowBots: false
    }
  ]);
  const updated = parseGroupHelpFilters(
    upsertFilterBuilderFilter(initial, {
      triggers: [{ value: 'hello', mode: 'contains' }],
      text: 'New greeting',
      media: { type: 'photo', fileId: 'photo-id' },
      audience: 'all',
      allowBots: false
    })
  ).filters;

  assert.equal(updated.length, 3);
  assert.equal(updated.find((filter) => filter.text === 'Old greeting')?.triggers[0].value, 'hi');
  assert.equal(
    updated.find((filter) => filter.text === 'Read the rules')?.triggers[0].value,
    'rules'
  );
  assert.equal(updated.find((filter) => filter.text === 'New greeting')?.media?.fileId, 'photo-id');
});
