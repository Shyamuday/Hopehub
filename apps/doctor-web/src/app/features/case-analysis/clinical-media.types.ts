export type ClinicalMediaItem = {
  id: string;
  patientId: string;
  caseAnalysisId: string | null;
  consultationId: string | null;
  diseaseId: string | null;
  diseaseName: string | null;
  conditionLabel: string | null;
  mediaType: string;
  mediaTypeLabel: string;
  bodyRegion: string | null;
  mimeType: string;
  fileName: string | null;
  observations: string | null;
  patientConsent: boolean;
  uploadedByName: string | null;
  uploadedByRole: string | null;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalMediaPhraseSearchLog = {
  phrase: string;
  sourceKey: string;
  sourceLabel: string;
  priority: number;
  reasoning: string;
};

export type ClinicalMediaRubricMatch = {
  rubricId: string;
  weight: number;
  sourceField: string;
  sourceLabel: string;
  sourcePhrase: string;
  reasoning: string;
  rubric: {
    id: string;
    chapter: string;
    subchapter: string | null;
    text: string;
    parentPath: string | null;
  };
};

export type ClinicalMediaImageAnalysis = {
  isSuggestionOnly: true;
  disclaimer: string;
  mediaId: string;
  mediaType: string;
  mediaTypeLabel: string;
  visionModel: string;
  visionAvailable: boolean;
  extractedSymptoms: string;
  symptomPhrases: string[];
  phrasesSearched: ClinicalMediaPhraseSearchLog[];
  suggestedRubrics: ClinicalMediaRubricMatch[];
  summary: string;
  generatedAt: string;
};
