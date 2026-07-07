import type { ApproachDefinition, ApproachStep, ApproachStepId } from './types';

export type StepCompletionContext = {
  methodOptionId?: string | null;
  caseSheet?: Record<string, string> | null;
  approachData?: Record<string, unknown> | null;
  rubricCount?: number;
  resultCount?: number;
  selectedRemedyId?: string | null;
};

export function isStepComplete(step: ApproachStep, context: StepCompletionContext): boolean {
  switch (step.id) {
    case 'approach-select':
      return !!context.methodOptionId;
    case 'case-sheet':
      return hasAnyCaseSheetValue(context.caseSheet);
    case 'symptom-hierarchy':
      return hasKentHierarchy(context.approachData);
    case 'sensation-capture':
      return hasSensationData(context.approachData);
    case 'miasm-layer':
      return hasMiasmaticData(context.approachData);
    case 'protocol-pick':
      return hasProtocolData(context.approachData);
    case 'lm-dosing':
      return hasOrganonLmData(context.approachData);
    case 'rubric-search':
      return (context.rubricCount || 0) > 0;
    case 'repertorize':
      return (context.resultCount || 0) > 0;
    case 'remedy-select':
      return !!context.selectedRemedyId;
    case 'prescribe':
      return !!context.selectedRemedyId;
    case 'analysis-notes':
      return true;
    default:
      return false;
  }
}

function hasAnyCaseSheetValue(caseSheet?: Record<string, string> | null) {
  if (!caseSheet) return false;
  return Object.entries(caseSheet).some(([key, value]) => !key.startsWith('_') && !!value?.trim());
}

function hasKentHierarchy(approachData?: Record<string, unknown> | null) {
  const kent = approachData?.['kentHierarchy'] as Record<string, string> | undefined;
  if (!kent) return false;
  return ['mentalGenerals', 'physicalGenerals', 'particularSymptoms'].some((key) => kent[key]?.trim());
}

function hasSensationData(approachData?: Record<string, unknown> | null) {
  const sensation = approachData?.['sensation'] as Record<string, string> | undefined;
  if (!sensation) return false;
  return !!(sensation['coreSensation']?.trim() || sensation['patientLanguage']?.trim());
}

function hasMiasmaticData(approachData?: Record<string, unknown> | null) {
  const miasm = approachData?.['miasmatic'] as Record<string, string> | undefined;
  if (!miasm) return false;
  return !!(miasm['dominantMiasm']?.trim() || miasm['presentingLayer']?.trim());
}

function hasProtocolData(approachData?: Record<string, unknown> | null) {
  const protocol = approachData?.['protocol'] as Record<string, string> | undefined;
  if (!protocol) return false;
  return !!protocol['protocolId']?.trim();
}

function hasOrganonLmData(approachData?: Record<string, unknown> | null) {
  const organon = approachData?.['organonLm'] as Record<string, string> | undefined;
  if (!organon) return false;
  return !!(organon['selectedLmPotency']?.trim() || organon['repetitionSchedule']?.trim());
}

export function firstIncompleteStepId(
  steps: ApproachStep[],
  context: StepCompletionContext
): ApproachStepId {
  const required = steps.filter((step) => !step.optional);
  return required.find((step) => !isStepComplete(step, context))?.id || steps[steps.length - 1]?.id || 'approach-select';
}

export function defaultRubricWeightForChapter(
  approach: ApproachDefinition,
  chapter?: string | null
): number {
  const base = approach.repertory.defaultRubricWeight || 2;
  if (!chapter) return base;
  const chapterLower = chapter.toLowerCase();
  const boost = approach.repertory.chapterBoosts?.find((item) => chapterLower.includes(item.chapterMatch.toLowerCase()));
  return boost?.defaultWeight || base;
}

export function weightMultiplierForChapter(approach: ApproachDefinition, chapter?: string | null): number {
  if (!chapter) return 1;
  const chapterLower = chapter.toLowerCase();
  const boost = approach.repertory.chapterBoosts?.find((item) => chapterLower.includes(item.chapterMatch.toLowerCase()));
  return boost?.multiplier || 1;
}
