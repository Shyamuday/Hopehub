import { caseSheetFieldsForSchema, hydrateCaseSheetForSchema } from './case-sheet-schemas';
import { structuredPanelFieldLabels } from './approach-structured-panels';
import { resolveApproachByMethodLabel } from './registry';

export type ClinicalSummaryRow = { label: string; value: string };

const STRUCTURED_LABELS = structuredPanelFieldLabels();

function humanizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(formatValue).filter(Boolean).join(', ');
  }
  return JSON.stringify(value);
}

function labelForApproachKey(prefix: string, key: string) {
  const composite = `${prefix}.${key}`;
  return STRUCTURED_LABELS.get(composite) || STRUCTURED_LABELS.get(key) || `${humanizeKey(prefix)} · ${humanizeKey(key)}`;
}

function flattenApproachData(data: unknown, prefix = '', depth = 0): ClinicalSummaryRow[] {
  if (data === null || data === undefined || depth > 2) return [];
  if (typeof data !== 'object' || Array.isArray(data)) {
    const text = formatValue(data);
    return text && prefix ? [{ label: prefix, value: text }] : [];
  }

  const rows: ClinicalSummaryRow[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && depth < 2) {
      const nestedPrefix = prefix || humanizeKey(key);
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const text = formatValue(nestedValue);
        if (!text) continue;
        rows.push({
          label: labelForApproachKey(prefix ? `${prefix}.${key}` : key, nestedKey),
          value: text
        });
      }
      continue;
    }
    const text = formatValue(value);
    if (text) {
      rows.push({
        label: prefix ? labelForApproachKey(prefix, key) : humanizeKey(key),
        value: text
      });
    }
  }
  return rows;
}

export function buildAdminClinicalSummary(input: {
  methodLabel?: string | null;
  caseSheet?: unknown;
  approachData?: unknown;
}) {
  const approach = resolveApproachByMethodLabel(input.methodLabel);
  const fields = caseSheetFieldsForSchema(approach.caseSheetSchemaId);
  const rawSheet =
    input.caseSheet && typeof input.caseSheet === 'object' && !Array.isArray(input.caseSheet)
      ? (input.caseSheet as Record<string, string>)
      : null;
  const sheet = hydrateCaseSheetForSchema(approach.caseSheetSchemaId, rawSheet);

  const caseSheetRows: ClinicalSummaryRow[] = fields
    .map((field) => ({ label: field.label, value: String(sheet[field.key] ?? '').trim() }))
    .filter((row) => row.value.length > 0);

  const approachRows = flattenApproachData(input.approachData).slice(0, 40);

  return {
    approachTitle: approach.title,
    workflowKind: approach.workflowKind,
    caseSheetRows,
    approachRows
  };
}
