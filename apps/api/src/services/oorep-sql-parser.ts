import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type OorepInfoRow = {
  abbrev: string;
  title: string;
  language: string;
  license: string | null;
  displayTitle: string | null;
};

export type OorepRemedyRow = {
  id: number;
  abbreviation: string;
  name: string;
};

export type OorepRubricRow = {
  abbrev: string;
  id: number;
  fullPath: string;
};

export type OorepRubricRemedyRow = {
  abbrev: string;
  rubricId: number;
  remedyId: number;
  weight: number;
};

export type OorepMmInfoRow = {
  id: number;
  abbrev: string;
  fullTitle: string;
  authorLastName: string | null;
  authorFirstName: string | null;
  year: number | null;
  license: string | null;
  displayTitle: string | null;
};

export type OorepMmChapterRow = {
  id: number;
  mmInfoId: number;
  heading: string;
  remedyId: number;
};

export type OorepMmSectionRow = {
  id: number;
  mmChapterId: number;
  depth: number;
  heading: string | null;
  content: string;
};

function unescapeCopyValue(value: string) {
  return value === '\\N' ? null : value;
}

function splitCopyLine(line: string) {
  return line.split('\t');
}

export async function* iterateSqlCopyRows(filePath: string, tableName: string): AsyncGenerator<string[]> {
  const input = createReadStream(filePath, { encoding: 'utf8' });
  const reader = createInterface({ input, crlfDelay: Infinity });
  const copyPrefix = `COPY public.${tableName} `;
  let inSection = false;

  for await (const rawLine of reader) {
    const line = rawLine.trimEnd();
    if (!inSection) {
      if (line.startsWith(copyPrefix)) {
        inSection = true;
      }
      continue;
    }

    if (line === '\\.') {
      break;
    }

    if (!line) continue;
    yield splitCopyLine(line);
  }
}

export function parseInfoRow(fields: string[]): OorepInfoRow | null {
  if (fields.length < 11) return null;
  const abbrev = fields[0];
  if (!abbrev) return null;
  return {
    abbrev,
    title: fields[1] || abbrev,
    language: fields[2] || 'en',
    license: unescapeCopyValue(fields[7]),
    displayTitle: unescapeCopyValue(fields[10])
  };
}

export function parseRemedyRow(fields: string[]): OorepRemedyRow | null {
  if (fields.length < 3) return null;
  const id = Number(fields[0]);
  const abbreviation = fields[1];
  const name = fields[2];
  if (!Number.isFinite(id) || !abbreviation || !name) return null;
  return { id, abbreviation, name };
}

export function parseRubricRow(fields: string[]): OorepRubricRow | null {
  if (fields.length < 7) return null;
  const abbrev = fields[0];
  const id = Number(fields[1]);
  const fullPath = unescapeCopyValue(fields[5]) || unescapeCopyValue(fields[7]) || '';
  if (!abbrev || !Number.isFinite(id) || !fullPath) return null;
  return { abbrev, id, fullPath };
}

export function parseRubricRemedyRow(fields: string[]): OorepRubricRemedyRow | null {
  if (fields.length < 4) return null;
  const abbrev = fields[0];
  const rubricId = Number(fields[1]);
  const remedyId = Number(fields[2]);
  const weight = Number(fields[3]);
  if (!abbrev || !Number.isFinite(rubricId) || !Number.isFinite(remedyId) || !Number.isFinite(weight)) return null;
  return { abbrev, rubricId, remedyId, weight: Math.min(4, Math.max(1, weight || 1)) };
}

export function parseMmInfoRow(fields: string[]): OorepMmInfoRow | null {
  if (fields.length < 11) return null;
  const id = Number(fields[0]);
  const abbrev = fields[1];
  if (!Number.isFinite(id) || !abbrev) return null;
  const year = Number(fields[6]);
  return {
    id,
    abbrev,
    fullTitle: fields[2] || abbrev,
    authorLastName: unescapeCopyValue(fields[3]),
    authorFirstName: unescapeCopyValue(fields[4]),
    year: Number.isFinite(year) ? year : null,
    license: unescapeCopyValue(fields[7]),
    displayTitle: unescapeCopyValue(fields[10])
  };
}

export function parseMmChapterRow(fields: string[]): OorepMmChapterRow | null {
  if (fields.length < 4) return null;
  const id = Number(fields[0]);
  const mmInfoId = Number(fields[1]);
  const heading = fields[2];
  const remedyId = Number(fields[3]);
  if (!Number.isFinite(id) || !Number.isFinite(mmInfoId) || !heading || !Number.isFinite(remedyId)) return null;
  return { id, mmInfoId, heading, remedyId };
}

export function parseMmSectionRow(fields: string[]): OorepMmSectionRow | null {
  if (fields.length < 7) return null;
  const id = Number(fields[0]);
  const mmChapterId = Number(fields[1]);
  const depth = Number(fields[2]);
  const heading = unescapeCopyValue(fields[5]);
  const content = unescapeCopyValue(fields[6]);
  if (!Number.isFinite(id) || !Number.isFinite(mmChapterId) || !content) return null;
  return {
    id,
    mmChapterId,
    depth: Number.isFinite(depth) ? depth : 1,
    heading,
    content
  };
}

export function splitFullPath(fullPath: string) {
  const parts = fullPath
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const chapter = parts[0] || fullPath;
  const text = parts.length > 1 ? parts.slice(1).join(', ') : fullPath;
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(' > ') : chapter;
  return { chapter, text, parentPath, displayText: fullPath };
}
