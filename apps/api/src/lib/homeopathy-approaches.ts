import homeopathyApproaches from '@vitalis/homeopathy-approaches';

export type ClinicalMediaType =
  | 'SKIN'
  | 'TONGUE'
  | 'NAIL'
  | 'HAIR'
  | 'SWELLING'
  | 'EYE'
  | 'EAR'
  | 'WOUND'
  | 'JOINT'
  | 'POSTURE'
  | 'DENTAL'
  | 'ABDOMEN'
  | 'CHEST'
  | 'LIMBS'
  | 'OTHER';

const lib = homeopathyApproaches as unknown as {
  CLINICAL_MEDIA_TYPE_LABELS: Record<ClinicalMediaType, string>;
  CLINICAL_MEDIA_BODY_REGIONS: Partial<Record<ClinicalMediaType, string[]>>;
  clinicalMediaMetaPayload: (
    diseases: Array<{ id: string; name: string; publicCategory: string | null }>
  ) => Record<string, unknown>;
  observationHintsForMediaType: (mediaType: ClinicalMediaType) => Array<{ label: string; phrases: string[] }>;
  suggestRubricSearchPhrases: (input: {
    mediaType: ClinicalMediaType;
    observations?: string | null;
    bodyRegion?: string | null;
  }) => string[];
  resolveApproachByMethodLabel: (label?: string | null) => Record<string, unknown>;
  weightMultiplierForChapter: (approach: Record<string, unknown>, chapter?: string | null) => number;
};

export const CLINICAL_MEDIA_TYPE_LABELS = lib.CLINICAL_MEDIA_TYPE_LABELS;
export const CLINICAL_MEDIA_BODY_REGIONS = lib.CLINICAL_MEDIA_BODY_REGIONS;
export const clinicalMediaMetaPayload = lib.clinicalMediaMetaPayload;
export const observationHintsForMediaType = lib.observationHintsForMediaType;
export const suggestRubricSearchPhrases = lib.suggestRubricSearchPhrases;
export const resolveApproachByMethodLabel = lib.resolveApproachByMethodLabel;
export const weightMultiplierForChapter = lib.weightMultiplierForChapter;
