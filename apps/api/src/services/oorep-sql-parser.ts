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
