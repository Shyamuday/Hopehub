import { describe, expect, it } from 'vitest';
import {
  parseAdminFilters,
  parseAdminNotes,
  serializeAdminFilters,
  serializeAdminNotes,
  telegramFormattingPreview,
  toggleConfigList,
} from './group-help-editors';

describe('Group Help admin editors', () => {
  it('round-trips filters without dropping legacy lines', () => {
    const filter = {
      triggers: [{ value: 'suicide', mode: 'contains' }],
      text: 'Help',
      audience: 'all',
      allowBots: false,
    };
    const raw = `legacy => reply\nrose-filter:${JSON.stringify(filter)}`;
    const parsed = parseAdminFilters(raw);
    expect(parsed.filters).toEqual([filter]);
    expect(serializeAdminFilters(parsed.filters, parsed.passthrough)).toContain('legacy => reply');
  });

  it('round-trips notes and preserves unknown lines', () => {
    const note = { name: 'support', text: 'We are here', privacy: 'private', adminOnly: false };
    const parsed = parseAdminNotes(`future-format\nrose-note:${JSON.stringify(note)}`);
    expect(parsed.notes).toEqual([note]);
    expect(serializeAdminNotes(parsed.notes, parsed.passthrough)).toContain('future-format');
  });

  it('toggles newline configuration lists', () => {
    expect(toggleConfigList('rules\nnotes', '/rules', false)).toBe('notes');
    expect(toggleConfigList('none', 'rules', true)).toBe('rules');
  });

  it('renders a safe sample of fillings and random content', () => {
    expect(telegramFormattingPreview('Hi {first}!\n%%%\nHello {last}')).toBe('Hi Aarav!');
  });
});
