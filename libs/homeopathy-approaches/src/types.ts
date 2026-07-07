export type ApproachWorkflowKind =
  | 'REPERTORY_TOTALITY'
  | 'STRUCTURED_CASE'
  | 'SENSATION_NARRATIVE'
  | 'MIASMATIC_LAYERED'
  | 'PROTOCOL_DRIVEN'
  | 'PATHOLOGY_CLINICAL'
  | 'HYBRID';

export type ApproachStepId =
  | 'approach-select'
  | 'intake-review'
  | 'case-sheet'
  | 'symptom-hierarchy'
  | 'sensation-capture'
  | 'miasm-layer'
  | 'protocol-pick'
  | 'rubric-search'
  | 'repertorize'
  | 'remedy-select'
  | 'prescribe'
  | 'analysis-notes'
  | 'lm-dosing';

export type ApproachStepComponent =
  | 'approach-overview'
  | 'intake-panel'
  | 'case-sheet'
  | 'kent-hierarchy'
  | 'sensation-mapper'
  | 'miasm-selector'
  | 'protocol-selector'
  | 'repertory-workspace'
  | 'remedy-results'
  | 'prescription-handoff'
  | 'analysis-notes'
  | 'organon-lm-dosing';

export type ApproachStep = {
  id: ApproachStepId;
  label: string;
  shortLabel: string;
  component: ApproachStepComponent;
  description?: string;
  optional?: boolean;
};

export type CaseSheetSchemaId =
  | 'classical'
  | 'eight-box'
  | 'constitutional'
  | 'kentian'
  | 'boenninghausen'
  | 'boger'
  | 'sensation'
  | 'miasmatic'
  | 'protocol'
  | 'clinical'
  | 'hybrid'
  | 'organon-lm';

export type CaseSheetFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  wide?: boolean;
};

export type RubricChapterBoost = {
  chapterMatch: string;
  multiplier: number;
  defaultWeight?: number;
};

export type ApproachRepertoryConfig = {
  enabled: boolean;
  searchPlaceholder?: string;
  chapterBoosts?: RubricChapterBoost[];
  defaultRubricWeight?: number;
  intakeSearchFromChapters?: string[];
};

export type ApproachPrescriptionHints = {
  skipRepertory?: boolean;
  potencyGuidance?: string;
  adviceTemplate?: string;
};

export type ApproachDefinition = {
  slug: string;
  methodNormalizedLabel: string;
  title: string;
  developedBy?: string;
  shortDescription: string;
  focus: string;
  bestFor: string[];
  processSteps: string[];
  strengths: string[];
  limits: string[];
  workflowKind: ApproachWorkflowKind;
  steps: ApproachStep[];
  caseSheetSchemaId: CaseSheetSchemaId;
  repertory: ApproachRepertoryConfig;
  prescription: ApproachPrescriptionHints;
};

export type CaseSheetPayload = Record<string, string> & {
  _schema?: string;
  _version?: string;
};

export type KentHierarchyData = {
  mentalGenerals: string;
  physicalGenerals: string;
  particularSymptoms: string;
  strikingKeynotes: string;
};

export type SensationApproachData = {
  patientLanguage: string;
  coreSensation: string;
  kingdom: string;
  remedyFamily: string;
  levelOfExperience: string;
};

export type MiasmaticApproachData = {
  presentingLayer: string;
  dominantMiasm: string;
  psoraSigns: string;
  sycosisSigns: string;
  syphilisSigns: string;
  familyMiasm: string;
};

export type ProtocolApproachData = {
  protocolId: string;
  protocolName: string;
  personalizationNotes: string;
  primaryRemedy: string;
  companionRemedy: string;
};

export type HybridApproachData = {
  primaryPath: string;
  secondaryNotes: string;
};

export type OrganonLmApproachData = {
  baselineVitality: string;
  sensitivityProfile: string;
  selectedLmPotency: string;
  dilutionGlass: string;
  repetitionSchedule: string;
  responseMonitoring: string;
  adjustmentNotes: string;
};

export type ApproachDataPayload = {
  kentHierarchy?: KentHierarchyData;
  sensation?: SensationApproachData;
  miasmatic?: MiasmaticApproachData;
  protocol?: ProtocolApproachData;
  hybrid?: HybridApproachData;
  organonLm?: OrganonLmApproachData;
};

export type BanerjiProtocol = {
  id: string;
  disease: string;
  name: string;
  primaryRemedy: string;
  companionRemedy?: string;
  notes: string;
};
