import { prisma } from '../db.js';
import {
  buildApproachAiContext,
  caseSheetFieldsForSchema,
  fieldsForStepComponent,
  resolveApproachByMethodOption,
  type ApproachAiContext,
  type ApproachDefinition,
  type ApproachFieldDef,
  type ApproachStepComponent
} from '@vitalis/homeopathy-approaches';

export type FieldSuggestionRequest = {
  fieldKey: string;
  promptKey?: string;
  suggestEndpoint?: string;
  currentValue?: string;
  panelComponent?: ApproachStepComponent | 'case-sheet';
  extractFrom?: string[];
};

export type FieldSuggestionResult = {
  suggestion: string;
  source: string;
  confidence?: number;
};

const PROMPT_KEYWORDS: Record<string, string[]> = {
  mental: ['mental', 'mood', 'mind', 'fear', 'anxiety', 'dream', 'emotion', 'irritab', 'weep', 'delusion', 'grief', 'worry'],
  physical: ['thermal', 'appetite', 'thirst', 'sleep', 'sweat', 'general', 'chilly', 'perspir', 'stool', 'urine'],
  chief: ['complaint', 'presenting', 'problem', 'reason', 'symptom', 'concern'],
  sensation: ['sensation', 'pain', 'feel', 'character', 'quality', 'burning', 'stitch', 'throb', 'language', 'kingdom', 'miasm', 'metaphor'],
  modality: ['better', 'worse', 'aggrav', 'amelior', 'modality'],
  location: ['location', 'side', 'where', 'site', 'radiat', 'extend'],
  family: ['family', 'hereditary', 'parent', 'sibling', 'mother', 'father'],
  past: ['past', 'history', 'previous', 'surgery', 'illness', 'suppression'],
  concomitant: ['concomitant', 'accompany', 'along', 'with'],
  pathology: ['pathology', 'diagnosis', 'disease', 'lab', 'investigation', 'report', 'finding'],
  emotional: ['emotion', 'feel', 'mood', 'grief', 'anger', 'fear', 'anxiety', 'trigger'],
  miasm: ['miasm', 'psora', 'sycosis', 'syphilis', 'tubercular'],
  kingdom: ['kingdom', 'plant', 'mineral', 'animal', 'nosode'],
  organ: ['organ', 'liver', 'kidney', 'lung', 'heart', 'stomach', 'joint'],
  acute: ['acute', 'sudden', 'fever', 'onset', 'intensity', 'today'],
  constitutional: ['constitution', 'temperament', 'thermal', 'build'],
  keynote: ['keynote', 'peculiar', 'strange', 'rare', 'striking'],
  scholten: ['theme', 'mineral', 'series', 'stage', 'pattern'],
  organon: ['potency', 'lm', 'aggravation', 'vitality', 'sensitivity'],
  clinical: ['diagnosis', 'clinical', 'acute', 'presentation'],
  protocol: ['protocol', 'diagnosis', 'contraindication', 'follow'],
  hybrid: ['approach', 'integrat', 'primary', 'secondary'],
  drainage: ['drainage', 'organ', 'liver', 'lymph', 'support'],
  hering: ['hering', 'aggravation', 'amelioration', 'direction', 'cure'],
  fibonacci: ['potency', 'fibonacci', 'sequence', 'interval'],
  tautopathy: ['causal', 'substance', 'vaccine', 'drug', 'exposure', 'detox'],
  eizayaga: ['lesion', 'functional', 'constitutional', 'layer'],
  vithoulkas: ['essence', 'level', 'health', 'defense', 'stress'],
  predictive: ['pathology', 'response', 'forecast', 'suppression'],
  pathological: ['pathology', 'anchor', 'investigation', 'stage'],
  integrative: ['chronic', 'comorbid', 'medication', 'follow', 'goal'],
  sehgal: ['emotion', 'trigger', 'presentation', 'correlation'],
  combination: ['combination', 'complex', 'indication', 'component'],
  eightbox: ['complaint', 'history', 'mental', 'general', 'diagnosis'],
  boger: ['pathological', 'totality', 'time', 'concomitant'],
  boenninghausen: ['location', 'sensation', 'modality', 'concomitant'],
  kentian: ['mental', 'general', 'particular', 'keynote'],
  classical: ['complaint', 'onset', 'modality', 'mental', 'history'],
  miasmatic: ['miasm', 'psora', 'sycosis', 'syphilis', 'layer'],
  organonlm: ['totality', 'vitality', 'potency', 'aggravation']
};

function splitCamelCase(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s_.-]+/).filter(Boolean);
}

function keywordsForField(field: ApproachFieldDef): string[] {
  const tokens = new Set<string>();

  if (field.promptKey) {
    for (const segment of field.promptKey.split('.')) {
      const lower = segment.toLowerCase();
      const mapped = PROMPT_KEYWORDS[lower];
      if (mapped) mapped.forEach((item) => tokens.add(item));
      for (const part of splitCamelCase(segment)) {
        if (part.length >= 4) tokens.add(part.toLowerCase());
      }
    }
  }

  for (const word of field.label.split(/\s+/)) {
    const cleaned = word.toLowerCase().replace(/[^\w]/g, '');
    if (cleaned.length >= 4) tokens.add(cleaned);
  }

  return [...tokens];
}

function extractFromIntake(intakeAnswers: Record<string, string>, field: ApproachFieldDef, maxLen = 1200) {
  const keywords = keywordsForField(field);
  const scored: Array<{ score: number; text: string }> = [];

  for (const [question, answer] of Object.entries(intakeAnswers)) {
    const answerTrim = answer?.trim();
    if (!answerTrim) continue;
    const haystack = `${question} ${answerTrim}`.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) score += 2;
    }
    if (score > 0) {
      scored.push({ score, text: `${question}: ${answerTrim}` });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length) {
    return {
      suggestion: scored.map((item) => item.text).join('\n').slice(0, maxLen),
      source: 'ai-extract-intake',
      confidence: Math.min(0.95, 0.45 + scored[0].score * 0.05)
    } satisfies FieldSuggestionResult;
  }

  const fallback = Object.entries(intakeAnswers)
    .filter(([, value]) => value?.trim())
    .map(([question, answer]) => `${question}: ${answer.trim()}`)
    .join('\n')
    .slice(0, maxLen);

  if (!fallback) return null;
  return {
    suggestion: fallback,
    source: 'ai-extract-intake-fallback',
    confidence: 0.35
  } satisfies FieldSuggestionResult;
}

function completeFromContext(
  approach: ApproachDefinition,
  field: ApproachFieldDef,
  input: {
    methodRationale?: string | null;
    caseSheet?: Record<string, string> | null;
    approachData?: Record<string, unknown> | null;
    intakeAnswers?: Record<string, string> | null;
  }
): FieldSuggestionResult | null {
  const aiContext = buildApproachAiContext({
    approach,
    methodRationale: input.methodRationale,
    caseSheet: input.caseSheet,
    approachData: input.approachData as never
  }) as ApproachAiContext;

  const prefix = field.promptKey?.split('.')[0];
  const related = aiContext.fields.filter(
    (item) =>
      item.key !== field.key &&
      item.value &&
      (!prefix || item.promptKey?.startsWith(`${prefix}.`) || item.promptKey?.startsWith(prefix))
  );

  const parts: string[] = [];
  if (input.methodRationale?.trim()) {
    parts.push(`Approach rationale: ${input.methodRationale.trim()}`);
  }
  if (related.length) {
    parts.push(...related.slice(0, 8).map((item) => `${item.label}: ${item.value}`));
  }
  if (input.intakeAnswers && Object.keys(input.intakeAnswers).length) {
    const intake = extractFromIntake(input.intakeAnswers, field, 700);
    if (intake?.suggestion) parts.push(intake.suggestion);
  }

  if (!parts.length) return null;
  return {
    suggestion: parts.join('\n\n').slice(0, 1200),
    source: 'ai-complete',
    confidence: related.length ? 0.72 : 0.5
  };
}

async function extractFromMedia(analysisId: string, field: ApproachFieldDef) {
  const media = await prisma.clinicalMedia.findMany({
    where: { caseAnalysisId: analysisId },
    select: {
      mediaType: true,
      bodyRegion: true,
      observations: true,
      conditionLabel: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const lines = media
    .map((item) => {
      const chunks = [item.mediaType, item.bodyRegion, item.conditionLabel, item.observations?.trim()].filter(Boolean);
      return chunks.join(' — ');
    })
    .filter(Boolean);

  if (!lines.length) return null;
  return {
    suggestion: lines.join('\n').slice(0, 1200),
    source: 'ai-extract-media',
    confidence: 0.65
  } satisfies FieldSuggestionResult;
}

async function extractFromPriorCase(
  patientId: string,
  field: ApproachFieldDef,
  doctorId: string,
  excludeAnalysisId: string
) {
  const prior = await prisma.caseAnalysis.findMany({
    where: {
      id: { not: excludeAnalysisId },
      consultation: { patientId, assignedDoctorId: doctorId }
    },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: {
      notes: true,
      caseSheet: true,
      updatedAt: true
    }
  });

  const snippets: string[] = [];
  for (const item of prior) {
    if (item.notes?.trim()) snippets.push(item.notes.trim());
    const sheet = item.caseSheet as Record<string, string> | null;
    if (sheet) {
      const keywords = keywordsForField(field);
      for (const [key, value] of Object.entries(sheet)) {
        if (!value?.trim() || key.startsWith('_')) continue;
        const haystack = `${key} ${value}`.toLowerCase();
        if (keywords.some((keyword) => haystack.includes(keyword))) {
          snippets.push(`${key}: ${value.trim()}`);
        }
      }
    }
  }

  if (!snippets.length) return null;
  return {
    suggestion: snippets.join('\n').slice(0, 1200),
    source: 'prior-case',
    confidence: 0.55
  } satisfies FieldSuggestionResult;
}

function resolveFieldDef(
  approach: ApproachDefinition,
  fieldKey: string,
  promptKey?: string,
  panelComponent?: string
): ApproachFieldDef | null {
  if (panelComponent && panelComponent !== 'case-sheet') {
    const panelFields = fieldsForStepComponent(panelComponent as ApproachStepComponent);
    const panelField = panelFields.find((field) => field.key === fieldKey || field.promptKey === promptKey);
    if (panelField) return panelField;
  }

  const sheetFields = caseSheetFieldsForSchema(approach.caseSheetSchemaId);
  const sheetField = sheetFields.find((field) => field.key === fieldKey || field.promptKey === promptKey);
  if (sheetField) return sheetField;

  for (const step of approach.steps) {
    const stepFields = fieldsForStepComponent(step.component);
    const stepField = stepFields.find((field) => field.key === fieldKey || field.promptKey === promptKey);
    if (stepField) return stepField;
  }

  return null;
}

export async function suggestApproachField(input: {
  analysisId: string;
  doctorId: string;
  request: FieldSuggestionRequest;
}): Promise<FieldSuggestionResult | null> {
  const analysis = await prisma.caseAnalysis.findUnique({
    where: { id: input.analysisId },
    include: {
      methodOption: { select: { id: true, label: true, normalizedLabel: true } },
      consultation: {
        select: {
          patientId: true,
          assignedDoctorId: true,
          intakeAnswers: true
        }
      }
    }
  });

  if (!analysis) return null;

  const approach = resolveApproachByMethodOption(analysis.methodOption) as ApproachDefinition;
  const field =
    resolveFieldDef(approach, input.request.fieldKey, input.request.promptKey, input.request.panelComponent) ||
    ({
      key: input.request.fieldKey,
      label: input.request.fieldKey,
      promptKey: input.request.promptKey,
      suggestEndpoint: input.request.suggestEndpoint as ApproachFieldDef['suggestEndpoint'],
      extractFrom: input.request.extractFrom as ApproachFieldDef['extractFrom']
    } satisfies ApproachFieldDef);

  const endpoint = input.request.suggestEndpoint || field.suggestEndpoint;
  const extractFrom = input.request.extractFrom || field.extractFrom || [];
  const methodRationale = (analysis as { methodRationale?: string | null }).methodRationale;
  const intakeAnswers = (analysis.consultation?.intakeAnswers || {}) as Record<string, string>;
  const caseSheet = (analysis.caseSheet || null) as Record<string, string> | null;
  const approachData = (analysis.approachData || null) as Record<string, unknown> | null;
  const patientId = analysis.consultation?.patientId;

  if (endpoint === 'ai-extract-media' || extractFrom.includes('media')) {
    const mediaResult = await extractFromMedia(input.analysisId, field);
    if (mediaResult) return mediaResult;
  }

  if (extractFrom.includes('priorCase') && patientId) {
    const priorResult = await extractFromPriorCase(patientId, field, input.doctorId, input.analysisId);
    if (priorResult) return priorResult;
  }

  if (endpoint === 'ai-extract-intake' || extractFrom.includes('intake')) {
    if (Object.keys(intakeAnswers).length) {
      const intakeResult = extractFromIntake(intakeAnswers, field);
      if (intakeResult) return intakeResult;
    }
  }

  if (endpoint === 'ai-complete') {
    const completeResult = completeFromContext(approach, field, {
      methodRationale,
      caseSheet,
      approachData,
      intakeAnswers
    });
    if (completeResult) return completeResult;
  }

  if (Object.keys(intakeAnswers).length) {
    return extractFromIntake(intakeAnswers, field);
  }

  return null;
}
