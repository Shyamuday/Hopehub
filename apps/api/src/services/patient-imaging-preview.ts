import type { ClinicalMediaImageAnalysis } from './clinical-media-rubric-analysis.js';

export const PATIENT_AI_DISCLAIMER =
  'This is an AI-generated preliminary note — not a medical diagnosis. Meet your healthcare expert for a final review and care plan.';

export type PatientImagingPreview = {
  isAiGenerated: true;
  disclaimer: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  mediaId: string;
  mediaTypeLabel: string;
  summary: string;
  observationsNoticed: string[];
  discussionPoints: string[];
  possibleTopics: string[];
  generatedAt: string | null;
};

export function buildProcessingPatientPreview(input: {
  mediaId: string;
  mediaTypeLabel: string;
}): PatientImagingPreview {
  return {
    isAiGenerated: true,
    disclaimer: PATIENT_AI_DISCLAIMER,
    status: 'processing',
    mediaId: input.mediaId,
    mediaTypeLabel: input.mediaTypeLabel,
    summary: 'We are reviewing your upload…',
    observationsNoticed: [],
    discussionPoints: [],
    possibleTopics: [],
    generatedAt: null
  };
}

export function buildFailedPatientPreview(input: {
  mediaId: string;
  mediaTypeLabel: string;
  reason?: string;
}): PatientImagingPreview {
  return {
    isAiGenerated: true,
    disclaimer: PATIENT_AI_DISCLAIMER,
    status: 'failed',
    mediaId: input.mediaId,
    mediaTypeLabel: input.mediaTypeLabel,
    summary:
      input.reason ??
      'We could not generate a preliminary note for this upload. Your doctor can still review the file during consultation.',
    observationsNoticed: [],
    discussionPoints: [],
    possibleTopics: [],
    generatedAt: null
  };
}

export function buildPatientPreviewFromAnalysis(
  analysis: ClinicalMediaImageAnalysis
): PatientImagingPreview {
  const noticed = [...new Set([...analysis.findings, ...analysis.symptomPhrases])]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  const discussion = analysis.symptomPhrases
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  const topics = analysis.suggestedDiseases.map((item) => item.name).slice(0, 4);

  const summary =
    analysis.impression?.trim() ||
    (noticed.length
      ? `Possible observations: ${noticed.slice(0, 2).join(', ')}.`
      : 'Preliminary AI review complete — discuss with your doctor.');

  return {
    isAiGenerated: true,
    disclaimer: PATIENT_AI_DISCLAIMER,
    status: 'ready',
    mediaId: analysis.mediaId,
    mediaTypeLabel: analysis.mediaTypeLabel,
    summary,
    observationsNoticed: noticed,
    discussionPoints: discussion.length
      ? discussion
      : ['Share when symptoms started and what makes them better or worse'],
    possibleTopics: topics.length
      ? topics.map((name) => `${name} — to confirm with your doctor`)
      : ['General symptom review with your doctor'],
    generatedAt: analysis.generatedAt
  };
}

export function mapJobStatusToPatientStatus(
  status: string | null | undefined
): PatientImagingPreview['status'] {
  switch (status) {
    case 'PROCESSING':
      return 'processing';
    case 'READY':
      return 'ready';
    case 'FAILED':
      return 'failed';
    case 'PENDING':
      return 'pending';
    default:
      return 'pending';
  }
}
