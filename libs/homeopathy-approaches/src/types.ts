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
  | 'lm-dosing'
  | 'keynote-striking'
  | 'scholten-mapping'
  | 'sehgal-emotion'
  | 'integrative-follow-up'
  | 'boenninghausen-lsm'
  | 'boger-totality'
  | 'constitutional-profile'
  | 'clinical-acute'
  | 'predictive-pathology'
  | 'pathological-anchor'
  | 'eight-box-guided'
  | 'fibonacci-potency'
  | 'tautopathy-isopathy'
  | 'eizayaga-layers'
  | 'vithoulkas-essences'
  | 'drainage-support'
  | 'hering-tracking'
  | 'acute-fast-track'
  | 'combination-remedy';

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
  | 'organon-lm-dosing'
  | 'keynote-striking'
  | 'scholten-mapper'
  | 'sehgal-emotion'
  | 'integrative-follow-up'
  | 'boenninghausen-lsm'
  | 'boger-totality'
  | 'constitutional-profile'
  | 'clinical-acute'
  | 'predictive-pathology'
  | 'pathological-anchor'
  | 'eight-box-guided'
  | 'fibonacci-potency'
  | 'tautopathy-isopathy'
  | 'eizayaga-layers'
  | 'vithoulkas-essences'
  | 'drainage-support'
  | 'hering-tracking'
  | 'acute-fast-track'
  | 'combination-remedy';

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
  | 'organon-lm'
  | 'keynote'
  | 'pathological'
  | 'sehgal'
  | 'integrative-follow-up'
  | 'scholten'
  | 'fibonacci'
  | 'tautopathy'
  | 'eizayaga'
  | 'vithoulkas'
  | 'drainage'
  | 'hering'
  | 'acute-fast'
  | 'combination';

export type FieldSuggestEndpoint =
  'rubric-search' | 'ai-complete' | 'ai-extract-intake' | 'ai-extract-media';

export type ApproachFieldDef = {
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  wide?: boolean;
  multiline?: boolean;
  required?: boolean;
  fieldType?: 'text' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
  rubricSearchable?: boolean;
  promptKey?: string;
  suggestEndpoint?: FieldSuggestEndpoint;
  suggestContext?: string[];
  extractFrom?: Array<'intake' | 'chat' | 'media' | 'priorCase'>;
  captureLayer?: 'capture' | 'clarify' | 'extract';
  optionGroups?: Array<{
    title: string;
    options: string[];
  }>;
};

export type CaseSheetFieldDef = ApproachFieldDef;

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
  /** Public-site URL slug when it differs from `slug`. */
  marketingSlug?: string;
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

export type KeynoteApproachData = {
  strikingSymptoms: string;
  peculiarRareSymptoms: string;
  totalityCrossCheck: string;
  differentialShortlist: string;
};

export type ScholtenApproachData = {
  thematicPattern: string;
  series: string;
  stage: string;
  mineralShortlist: string;
  confirmationNotes: string;
};

export type SehgalApproachData = {
  emotionalDisturbance: string;
  emotionalTrigger: string;
  mindBodyLinkage: string;
  emotionalCoreRemedy: string;
};

export type IntegrativeFollowUpApproachData = {
  baselineMetrics: string;
  subjectiveMarkers: string;
  objectiveReports: string;
  safetyRedFlags: string;
  referralEscalation: string;
  nextReviewPlan: string;
};

export type StringMapApproachData = Record<string, string>;

export type ApproachDataPayload = {
  kentHierarchy?: KentHierarchyData;
  sensation?: SensationApproachData;
  miasmatic?: MiasmaticApproachData;
  protocol?: ProtocolApproachData;
  hybrid?: HybridApproachData;
  organonLm?: OrganonLmApproachData;
  keynote?: KeynoteApproachData;
  scholten?: ScholtenApproachData;
  sehgal?: SehgalApproachData;
  integrativeFollowUp?: IntegrativeFollowUpApproachData;
  boenninghausenLsm?: StringMapApproachData;
  bogerTotality?: StringMapApproachData;
  constitutionalProfile?: StringMapApproachData;
  clinicalAcute?: StringMapApproachData;
  predictivePathology?: StringMapApproachData;
  pathologicalAnchor?: StringMapApproachData;
  eightBoxGuided?: StringMapApproachData;
  fibonacciPotency?: StringMapApproachData;
  tautopathyIsopathy?: StringMapApproachData;
  eizayagaLayers?: StringMapApproachData;
  vithoulkasEssences?: StringMapApproachData;
  drainageSupport?: StringMapApproachData;
  heringTracking?: StringMapApproachData;
  acuteFastTrack?: StringMapApproachData;
  combinationRemedy?: StringMapApproachData;
};

export type BanerjiProtocol = {
  id: string;
  disease: string;
  name: string;
  primaryRemedy: string;
  companionRemedy?: string;
  notes: string;
};
