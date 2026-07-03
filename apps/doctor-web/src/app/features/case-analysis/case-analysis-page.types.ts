export type RepertorySource = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  rubricCount?: number;
};

export type RepertoryRemedyRef = {
  id: string;
  name: string;
  abbreviation: string;
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
  consultationId: string;
  status: 'DRAFT' | 'FINALIZED';
  notes?: string | null;
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
  patient?: { id: string; name: string; patientCode?: string | null };
  disease?: { id: string; name: string };
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
