import { caseSheetFieldsForSchema } from './case-sheet-schemas';
import { structuredPanelForComponent } from './approach-structured-panels';
import { specializedPanelDef } from './specialized-panel-defs';
import type { ApproachDataPayload, ApproachDefinition, ApproachFieldDef, ApproachStepComponent } from './types';

export type ApproachSearchPhrase = {
  phrase: string;
  sourceKey: string;
  sourceLabel: string;
  priority: number;
};

function splitIntoPhrases(value: string): string[] {
  const chunks = value
    .split(/[\n;]+/)
    .flatMap((line) => line.split(/,(?=\s)/))
    .map((part) => part.replace(/^[-•*]\s*/, '').trim())
    .filter((part) => part.length >= 4);

  const phrases: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= 64) {
      phrases.push(chunk);
      continue;
    }
    for (const sentence of chunk.split(/(?<=[.!?])\s+/)) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 4) phrases.push(trimmed.slice(0, 64));
    }
  }
  return [...new Set(phrases)];
}

function pushPhrases(
  target: ApproachSearchPhrase[],
  field: ApproachFieldDef,
  value: string | undefined,
  prefix: string,
  priorityBoost: number
) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const priority = (field.rubricSearchable ? 20 : 0) + priorityBoost;
  for (const phrase of splitIntoPhrases(trimmed)) {
    target.push({
      phrase,
      sourceKey: prefix ? `${prefix}.${field.key}` : field.key,
      sourceLabel: field.label,
      priority
    });
  }
}

function collectFromFields(
  target: ApproachSearchPhrase[],
  fields: ApproachFieldDef[],
  data: Record<string, string> | undefined,
  prefix: string,
  priorityBoost: number
) {
  if (!data) return;
  for (const field of fields) {
    pushPhrases(target, field, data[field.key], prefix, priorityBoost);
  }
}

function dataKeyForSpecializedComponent(component: ApproachStepComponent): keyof ApproachDataPayload | null {
  switch (component) {
    case 'kent-hierarchy':
      return 'kentHierarchy';
    case 'sensation-mapper':
      return 'sensation';
    case 'miasm-selector':
      return 'miasmatic';
    case 'keynote-striking':
      return 'keynote';
    case 'scholten-mapper':
      return 'scholten';
    case 'sehgal-emotion':
      return 'sehgal';
    case 'integrative-follow-up':
      return 'integrativeFollowUp';
    case 'organon-lm-dosing':
      return 'organonLm';
    default:
      return null;
  }
}

export function collectApproachSearchPhrases(input: {
  approach: ApproachDefinition;
  methodRationale?: string | null;
  caseSheet?: Record<string, string> | null;
  approachData?: ApproachDataPayload | null;
  intakeAnswers?: Record<string, string> | null;
  maxPhrases?: number;
}): ApproachSearchPhrase[] {
  const phrases: ApproachSearchPhrase[] = [];
  const maxPhrases = input.maxPhrases ?? 14;

  if (input.methodRationale?.trim()) {
    for (const phrase of splitIntoPhrases(input.methodRationale)) {
      phrases.push({
        phrase,
        sourceKey: 'methodRationale',
        sourceLabel: 'Why this approach',
        priority: 8
      });
    }
  }

  collectFromFields(
    phrases,
    caseSheetFieldsForSchema(input.approach.caseSheetSchemaId),
    input.caseSheet || undefined,
    'caseSheet',
    12
  );

  for (const step of input.approach.steps) {
    const structured = structuredPanelForComponent(step.component);
    if (structured) {
      collectFromFields(
        phrases,
        structured.def.fields,
        (input.approachData?.[structured.dataKey] as Record<string, string> | undefined) || undefined,
        String(structured.dataKey),
        10
      );
      continue;
    }

    const specialized = specializedPanelDef(step.component);
    if (!specialized) continue;
    const dataKey = dataKeyForSpecializedComponent(step.component);
    if (!dataKey) continue;
    collectFromFields(
      phrases,
      specialized.fields,
      (input.approachData?.[dataKey] as Record<string, string> | undefined) || undefined,
      dataKey,
      10
    );
  }

  if (input.intakeAnswers) {
    for (const [question, answer] of Object.entries(input.intakeAnswers)) {
      if (!answer?.trim()) continue;
      for (const phrase of splitIntoPhrases(`${question}: ${answer}`)) {
        phrases.push({
          phrase: phrase.slice(0, 64),
          sourceKey: 'intake',
          sourceLabel: 'Patient intake',
          priority: 4
        });
      }
    }
  }

  const deduped = new Map<string, ApproachSearchPhrase>();
  for (const item of phrases.sort((a, b) => b.priority - a.priority)) {
    const key = item.phrase.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return [...deduped.values()].slice(0, maxPhrases);
}
