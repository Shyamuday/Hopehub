export type FilterMatchMode = 'contains' | 'prefix' | 'exact';
export type FilterAudience = 'all' | 'users' | 'admins';
export type GroupHelpFilterDraft = {
  id?: string;
  category?: 'crisis' | 'wellbeing';
  cooldownSeconds?: number;
  notifyStaff?: boolean;
  triggers: Array<{ value: string; mode: FilterMatchMode }>;
  text?: string;
  media?: { type: string; fileId: string };
  button?: { text: string; url: string };
  audience: FilterAudience;
  allowBots: boolean;
};

export type GroupHelpNoteDraft = {
  name: string;
  text?: string;
  media?: { type: string; fileId: string };
  privacy: 'default' | 'private' | 'public';
  adminOnly: boolean;
  repeatSeconds?: number;
  nextRepeatAt?: string;
};

const FILTER_PREFIX = 'rose-filter:';
const NOTE_PREFIX = 'rose-note:';

export function parseAdminFilters(value: string) {
  const filters: GroupHelpFilterDraft[] = [];
  const passthrough: string[] = [];
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(FILTER_PREFIX)) {
      try {
        const parsed = JSON.parse(line.slice(FILTER_PREFIX.length));
        if (Array.isArray(parsed.triggers) && parsed.triggers.length) {
          filters.push(parsed);
          continue;
        }
      } catch {
        // Keep damaged or future-format entries available in the advanced editor.
      }
    }
    passthrough.push(rawLine);
  }
  return { filters, passthrough };
}

export function serializeAdminFilters(filters: GroupHelpFilterDraft[], passthrough: string[] = []) {
  return [
    ...passthrough,
    ...filters.map((filter) => `${FILTER_PREFIX}${JSON.stringify(filter)}`),
  ].join('\n');
}

export function parseAdminNotes(value: string) {
  const notes: GroupHelpNoteDraft[] = [];
  const passthrough: string[] = [];
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(NOTE_PREFIX)) {
      try {
        const parsed = JSON.parse(line.slice(NOTE_PREFIX.length));
        if (parsed.name && (parsed.text || parsed.media)) {
          notes.push(parsed);
          continue;
        }
      } catch {
        // Preserve unknown content rather than discarding it from the raw setting.
      }
    }
    passthrough.push(rawLine);
  }
  return { notes, passthrough };
}

export function serializeAdminNotes(notes: GroupHelpNoteDraft[], passthrough: string[] = []) {
  return [...passthrough, ...notes.map((note) => `${NOTE_PREFIX}${JSON.stringify(note)}`)].join(
    '\n',
  );
}

export function splitConfigList(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/^\//, '').toLowerCase())
    .filter(Boolean);
}

export function toggleConfigList(value: string, item: string, enabled: boolean) {
  const normalized = item.replace(/^\//, '').toLowerCase();
  const entries = splitConfigList(value).filter(
    (entry) => entry !== normalized && entry !== 'none',
  );
  if (enabled) entries.push(normalized);
  return Array.from(new Set(entries)).join('\n') || 'none';
}

export function telegramFormattingPreview(source: string) {
  const variant = source.split(/\n?%%%\n?/)[0] || '';
  return variant
    .replace(/\{first\}/gi, 'Aarav')
    .replace(/\{last\}/gi, 'Sharma')
    .replace(/\{fullname\}/gi, 'Aarav Sharma')
    .replace(/\{username\}/gi, '@aarav')
    .replace(/\{mention\}/gi, 'Aarav')
    .replace(/\{id\}/gi, '123456789')
    .replace(/\{chatname\}/gi, 'Hope Hub India')
    .replace(/\{(?:rules|preview|nonotif|protect|mediaspoiler)\}/gi, '')
    .replace(/\[([^\]]+)\]\(buttonurl:\/\/[^)]+\)/gi, '[$1 button]')
    .trim();
}
