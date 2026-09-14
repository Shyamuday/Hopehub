import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import type { GroupHelpFilterMedia } from './telegram-group-help.filters.js';

export type GroupHelpNote = {
  name: string;
  text?: string;
  media?: GroupHelpFilterMedia;
  privacy: 'default' | 'private' | 'public';
  adminOnly: boolean;
  repeatSeconds?: number;
  nextRepeatAt?: string;
};

const NOTE_PREFIX = 'rose-note:';

export function normalizeGroupHelpNoteName(value: string | undefined) {
  const name = (value || '').trim().replace(/^#/, '').toLowerCase();
  return /^[a-z0-9_]{1,32}$/.test(name) ? name : undefined;
}

export function parseGroupHelpRepeatTime(value: string | undefined) {
  const match = /^(\d+)(m|h|d|w)$/i.exec(value || '');
  if (!match) return undefined;
  const units: Record<string, number> = { m: 60, h: 3600, d: 86_400, w: 604_800 };
  const unit = units[match[2].toLowerCase()];
  if (!unit) return undefined;
  const seconds = Number(match[1]) * unit;
  return seconds >= 900 && seconds <= 31_536_000 ? seconds : undefined;
}

export function noteControlOptions(source: string, now = new Date()) {
  const repeat = /\{(?:repeat|repeated)\s+([^}\s]+)\}/i.exec(source);
  const repeatSeconds = repeat ? parseGroupHelpRepeatTime(repeat[1]) : undefined;
  return {
    text: source
      .replace(/\{(?:private|noprivate|admin)\}/gi, '')
      .replace(/\{(?:repeat|repeated)\s+[^}]+\}/gi, '')
      .trim(),
    privacy: (/\{private\}/i.test(source)
      ? 'private'
      : /\{noprivate\}/i.test(source)
        ? 'public'
        : 'default') as GroupHelpNote['privacy'],
    adminOnly: /\{admin\}/i.test(source),
    ...(repeatSeconds
      ? {
          repeatSeconds,
          nextRepeatAt: new Date(now.getTime() + repeatSeconds * 1000).toISOString()
        }
      : {})
  };
}

function validNote(value: unknown): value is GroupHelpNote {
  if (!value || typeof value !== 'object') return false;
  const note = value as GroupHelpNote;
  const mediaTypes = [
    'sticker',
    'photo',
    'animation',
    'video',
    'video_note',
    'document',
    'audio',
    'voice'
  ];
  return Boolean(
    normalizeGroupHelpNoteName(note.name) &&
    (!note.text || typeof note.text === 'string') &&
    (!note.media ||
      (mediaTypes.includes(note.media.type) &&
        typeof note.media.fileId === 'string' &&
        note.media.fileId.length > 0)) &&
    (note.text || note.media) &&
    ['default', 'private', 'public'].includes(note.privacy) &&
    typeof note.adminOnly === 'boolean' &&
    (!note.repeatSeconds ||
      (Number.isFinite(note.repeatSeconds) &&
        note.repeatSeconds >= 900 &&
        note.repeatSeconds <= 31_536_000)) &&
    (!note.nextRepeatAt || Number.isFinite(new Date(note.nextRepeatAt).getTime()))
  );
}

export function parseGroupHelpNotes(value: string | undefined) {
  const notes: GroupHelpNote[] = [];
  for (const line of (value || '').split(/\r?\n/)) {
    if (!line.startsWith(NOTE_PREFIX)) continue;
    try {
      const parsed = JSON.parse(line.slice(NOTE_PREFIX.length));
      if (validNote(parsed)) notes.push(parsed);
    } catch {
      // Ignore a damaged entry without preventing other notes from loading.
    }
  }
  return notes;
}

export function serializeGroupHelpNotes(notes: GroupHelpNote[]) {
  return notes.map((note) => `${NOTE_PREFIX}${JSON.stringify(note)}`).join('\n');
}

export function groupHelpNote(notes: GroupHelpNote[], name: string | undefined) {
  const normalized = normalizeGroupHelpNoteName(name);
  return normalized ? notes.find((note) => note.name === normalized) : undefined;
}

export function parseGroupHelpSaveCommand(message: CommunityTelegramMessage, now = new Date()) {
  const source = (message.text || '').trim().replace(/^\/save(?:@\w+)?\s*/i, '');
  const split = source.search(/\s/);
  const rawName = split < 0 ? source : source.slice(0, split);
  const name = normalizeGroupHelpNoteName(rawName);
  if (!name) return undefined;
  const controls = noteControlOptions(split < 0 ? '' : source.slice(split).trim(), now);
  return { name, ...controls };
}

export function groupHelpNoteRequestedByText(text: string | undefined) {
  const match = /^#([a-z0-9_]{1,32})$/i.exec((text || '').trim());
  return match?.[1]?.toLowerCase();
}
