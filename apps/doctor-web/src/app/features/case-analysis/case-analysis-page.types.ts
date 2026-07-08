export type RepertorySource = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  rubricCount?: number | null;
  provider?: 'local' | 'oorep';
};

export type MateriaMedicaSource = {
  id: string;
  code: string;
  name: string;
  author?: string | null;
  year?: number | null;
  language?: string | null;
  provider?: 'local' | 'oorep';
};

export type MateriaMedicaSearchResult = {
  remedyId: string;
  remedyName: string;
  remedyAbbreviation: string;
  sections: Array<{ id: string; heading: string | null; content: string; depth: number }>;
};

export type RepertoryRemedyRef = {
  id: string;
  name: string;
  abbreviation: string;
};

export type RubricSuggestion = {
  id: string;
  chapter: string;
  subchapter?: string | null;
  text: string;
  parentPath?: string | null;
  label: string;
  source: { id: string; name: string; code: string };
};

export type RubricSearchResult = {
  id: string;
  chapter: string;
  subchapter?: string | null;
  text: string;
  parentPath?: string | null;
  source: { id: string; name: string; code: string };
  remedies: Array<{ grade: number; remedy: RepertoryRemedyRef }>;
};

export type SelectedRubric = {
  rubricId: string;
  weight: number;
  rubric?: {
    id: string;
    chapter: string;
    subchapter?: string | null;
    text: string;
    parentPath?: string | null;
  };
};

export type AnalysisResult = {
  rank: number;
  totalScore: number;
  coverage: number;
  remedy: RepertoryRemedyRef;
};

export type CaseAnalysis = {
  id: string;
  consultationId?: string | null;
  status: 'DRAFT' | 'FINALIZED';
  notes?: string | null;
  caseSheet?: Record<string, string> | null;
  approachData?: Record<string, unknown> | null;
  methodOptionId?: string | null;
  methodOption?: { id: string; label: string; normalizedLabel?: string } | null;
  source?: RepertorySource | null;
  selectedRemedy?: RepertoryRemedyRef | null;
  rubrics: Array<{ rubricId: string; weight: number; rubric: SelectedRubric['rubric'] }>;
  results: Array<{ rank: number; totalScore: number; coverage: number; remedy: RepertoryRemedyRef }>;
  createdAt?: string;
  updatedAt?: string;
};

export type ConsultationSummary = {
  id: string;
  status: string;
  intakeAnswers?: Record<string, string> | null;
  patient?: { id: string; name: string; patientCode?: string | null };
  disease?: { id: string; name: string; intakeQuestions?: string[] };
};

export type PatientCaseHistory = {
  lastPrescriptionMethod: { id: string; label: string } | null;
  entries: PatientCaseHistoryEntry[];
};

export type PatientCaseHistoryEntry = {
  consultationId: string;
  consultationDate: string;
  diseaseName: string;
  status: string;
  analyses: Array<{
    id: string;
    methodLabel: string | null;
    selectedRemedyName: string | null;
    status: string;
    createdAt: string;
    rubricCount: number;
  }>;
  prescription: {
    id: string;
    methodLabel: string | null;
    diagnosis: string;
    status: string;
    createdAt: string;
    caseAnalysisId: string | null;
  } | null;
};

export type MateriaMedicaSection = {
  id: string;
  depth: number;
  heading?: string | null;
  content: string;
  sortOrder: number;
};

export type MateriaMedicaKeyRubric = {
  rubricId: string;
  weight: number | null;
  grade: number;
  rubric: {
    id: string;
    chapter: string;
    subchapter?: string | null;
    text: string;
    parentPath?: string | null;
    source?: { id: string; name: string };
  };
};

export type MateriaMedicaResponse = {
  remedy: RepertoryRemedyRef;
  source: { id: string; code: string; name: string; author?: string | null; year?: number | null } | null;
  sections: MateriaMedicaSection[];
  caseRubrics?: MateriaMedicaKeyRubric[];
  keyRubrics: MateriaMedicaKeyRubric[];
};
