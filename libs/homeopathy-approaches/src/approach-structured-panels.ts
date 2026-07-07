import type { ApproachDataPayload, ApproachStepComponent } from './types';

export type StructuredPanelFieldDef = {
  key: string;
  label: string;
  rows?: number;
  wide?: boolean;
  placeholder?: string;
  multiline?: boolean;
  rubricSearchable?: boolean;
};

export type ApproachStructuredPanelDef = {
  title: string;
  hint: string;
  fields: StructuredPanelFieldDef[];
  requiredKeys?: string[];
  combinationCatalog?: boolean;
};

export type StructuredPanelBinding = {
  dataKey: keyof ApproachDataPayload;
  def: ApproachStructuredPanelDef;
};

function fields(...items: StructuredPanelFieldDef[]): StructuredPanelFieldDef[] {
  return items;
}

export const STRUCTURED_APPROACH_PANELS: Record<ApproachStepComponent, StructuredPanelBinding | undefined> = {
  'approach-overview': undefined,
  'intake-panel': undefined,
  'case-sheet': undefined,
  'kent-hierarchy': undefined,
  'sensation-mapper': undefined,
  'miasm-selector': undefined,
  'protocol-selector': undefined,
  'repertory-workspace': undefined,
  'remedy-results': undefined,
  'prescription-handoff': undefined,
  'analysis-notes': undefined,
  'organon-lm-dosing': undefined,
  'keynote-striking': undefined,
  'scholten-mapper': undefined,
  'sehgal-emotion': undefined,
  'integrative-follow-up': undefined,
  'boenninghausen-lsm': {
    dataKey: 'boenninghausenLsm',
    def: {
      title: 'Boenninghausen symptom set',
      hint: 'Capture location, sensation, modality, and concomitant relationships before repertorization.',
      fields: fields(
        { key: 'location', label: 'Location', rows: 2, wide: true, placeholder: 'Site, side, radiation…', rubricSearchable: true },
        { key: 'sensation', label: 'Sensation', rows: 2, wide: true, placeholder: 'Burning, stitching, numbness…', rubricSearchable: true },
        { key: 'modalities', label: 'Modalities (better / worse)', rows: 3, wide: true, rubricSearchable: true },
        { key: 'concomitants', label: 'Concomitants', rows: 2, wide: true, rubricSearchable: true },
        { key: 'timeAggravation', label: 'Time aggravation', rows: 2 }
      ),
      requiredKeys: ['location', 'sensation']
    }
  },
  'boger-totality': {
    dataKey: 'bogerTotality',
    def: {
      title: 'Boger pathological totality',
      hint: 'Define pathological generals, time patterns, and concomitants for Boger-style analysis.',
      fields: fields(
        { key: 'pathologicalTotality', label: 'Pathological totality', rows: 4, wide: true },
        { key: 'timePatterns', label: 'Time patterns', rows: 2, wide: true },
        { key: 'concomitants', label: 'Concomitants', rows: 2, wide: true },
        { key: 'clinicalCorrelation', label: 'Clinical / investigation correlation', rows: 3, wide: true }
      )
    }
  },
  'constitutional-profile': {
    dataKey: 'constitutionalProfile',
    def: {
      title: 'Constitutional profile',
      hint: 'Map temperament, thermal state, and generals before particulars.',
      fields: fields(
        { key: 'temperament', label: 'Temperament & constitution', rows: 3, wide: true },
        { key: 'thermalState', label: 'Thermal preference', rows: 2 },
        { key: 'appetiteThirst', label: 'Appetite & thirst', rows: 2 },
        { key: 'sleepDreams', label: 'Sleep & dreams', rows: 2, wide: true },
        { key: 'mentalPicture', label: 'Mental picture', rows: 3, wide: true }
      )
    }
  },
  'clinical-acute': {
    dataKey: 'clinicalAcute',
    def: {
      title: 'Acute clinical snapshot',
      hint: 'Fast OPD capture: diagnosis context, key symptoms, and organ affinity.',
      fields: fields(
        { key: 'acutePresentation', label: 'Acute presentation', rows: 2, wide: true, rubricSearchable: true },
        { key: 'clinicalDiagnosis', label: 'Working clinical diagnosis', rows: 2 },
        { key: 'keyPrescribingSymptoms', label: 'Key prescribing symptoms', rows: 3, wide: true, rubricSearchable: true },
        { key: 'organAffinity', label: 'Organ affinity', rows: 2, rubricSearchable: true },
        { key: 'urgencyNotes', label: 'Urgency / red flags', rows: 2, wide: true }
      ),
      requiredKeys: ['acutePresentation', 'keyPrescribingSymptoms']
    }
  },
  'predictive-pathology': {
    dataKey: 'predictivePathology',
    def: {
      title: 'Predictive pathology map',
      hint: 'Vijayakar-style pathology layering with expected response and follow-up forecast.',
      fields: fields(
        { key: 'pathologyStage', label: 'Pathology stage', rows: 3, wide: true },
        { key: 'tissueAffinity', label: 'Tissue / organ affinity', rows: 2, wide: true },
        { key: 'predictedResponse', label: 'Predicted remedy response', rows: 3, wide: true },
        { key: 'followUpForecast', label: 'Follow-up forecast', rows: 3, wide: true },
        { key: 'suppressionHistory', label: 'Suppression / palliation history', rows: 2, wide: true }
      )
    }
  },
  'pathological-anchor': {
    dataKey: 'pathologicalAnchor',
    def: {
      title: 'Pathology prescribing anchor',
      hint: 'Anchor remedy selection on pathology stage and correlated objective findings.',
      fields: fields(
        { key: 'pathologyStage', label: 'Pathology stage', rows: 3, wide: true },
        { key: 'investigationTrends', label: 'Investigation trends', rows: 3, wide: true },
        { key: 'anchorSymptoms', label: 'Anchor prescribing symptoms', rows: 3, wide: true },
        { key: 'differentialPathology', label: 'Differential pathology notes', rows: 2, wide: true }
      )
    }
  },
  'eight-box-guided': {
    dataKey: 'eightBoxGuided',
    def: {
      title: '8-box guided capture',
      hint: 'Walk through each clinical box before moving to repertorization.',
      fields: fields(
        { key: 'patientConstitution', label: '1. Patient identity & constitution', rows: 2, wide: true },
        { key: 'chiefComplaints', label: '2. Chief complaints', rows: 2, wide: true },
        { key: 'presentIllness', label: '3. Present illness', rows: 2, wide: true },
        { key: 'pastFamilyHistory', label: '4. Past & family history', rows: 2, wide: true },
        { key: 'mentalEmotional', label: '5. Mental / emotional', rows: 2, wide: true },
        { key: 'physicalGenerals', label: '6. Physical generals', rows: 2, wide: true },
        { key: 'particulars', label: '7. Particular symptoms', rows: 2, wide: true },
        { key: 'diagnosisPlan', label: '8. Diagnosis & plan', rows: 2, wide: true }
      )
    }
  },
  'fibonacci-potency': {
    dataKey: 'fibonacciPotency',
    def: {
      title: 'Fibonacci potency plan',
      hint: 'Plan potency ladder, interval, and response checkpoints using Fibonacci sequencing.',
      fields: fields(
        { key: 'startingPotency', label: 'Starting potency', rows: 2 },
        { key: 'fibonacciSequence', label: 'Fibonacci sequence plan', rows: 2, wide: true, placeholder: 'e.g. 6C → 10C → 16C → 26C…' },
        { key: 'doseInterval', label: 'Dose interval', rows: 2 },
        { key: 'responseCheckpoints', label: 'Response checkpoints', rows: 3, wide: true },
        { key: 'adjustmentRules', label: 'Adjustment rules', rows: 2, wide: true }
      )
    }
  },
  'tautopathy-isopathy': {
    dataKey: 'tautopathyIsopathy',
    def: {
      title: 'Tautopathy / isopathy',
      hint: 'Document causal substance, potency rationale, and clearing timeline.',
      fields: fields(
        { key: 'causalSubstance', label: 'Causal substance / agent', rows: 2, wide: true },
        { key: 'exposureTimeline', label: 'Exposure timeline', rows: 2, wide: true },
        { key: 'potencyRationale', label: 'Potency rationale', rows: 2, wide: true },
        { key: 'clearingPlan', label: 'Clearing / detox plan', rows: 3, wide: true },
        { key: 'followUpMarkers', label: 'Follow-up markers', rows: 2, wide: true }
      )
    }
  },
  'eizayaga-layers': {
    dataKey: 'eizayagaLayers',
    def: {
      title: 'Eizayaga layers of health',
      hint: 'Map lesion, functional, constitutional, and fundamental layers.',
      fields: fields(
        { key: 'lesionLayer', label: 'Lesion layer', rows: 2, wide: true },
        { key: 'functionalLayer', label: 'Functional layer', rows: 2, wide: true },
        { key: 'constitutionalLayer', label: 'Constitutional layer', rows: 2, wide: true },
        { key: 'fundamentalLayer', label: 'Fundamental / miasmatic layer', rows: 2, wide: true },
        { key: 'layerPrescribingPlan', label: 'Layer-wise prescribing plan', rows: 3, wide: true }
      )
    }
  },
  'vithoulkas-essences': {
    dataKey: 'vithoulkasEssences',
    def: {
      title: 'Vithoulkas essences & levels',
      hint: 'Capture essence themes, level of health, and defense mechanism.',
      fields: fields(
        { key: 'essenceTheme', label: 'Essence / central theme', rows: 3, wide: true },
        { key: 'levelOfHealth', label: 'Level of health', rows: 2, wide: true },
        { key: 'defenseMechanism', label: 'Defense mechanism', rows: 2, wide: true },
        { key: 'stressTimeline', label: 'Stress / shock timeline', rows: 2, wide: true },
        { key: 'remedyEssenceMatch', label: 'Remedy essence match', rows: 2, wide: true }
      )
    }
  },
  'drainage-support': {
    dataKey: 'drainageSupport',
    def: {
      title: 'Drainage & organ support',
      hint: 'Plan drainage remedies, organ support, and sequencing with the simillimum.',
      fields: fields(
        { key: 'targetOrgans', label: 'Target organs / systems', rows: 2, wide: true },
        { key: 'drainageRemedies', label: 'Drainage remedies', rows: 2, wide: true },
        { key: 'supportRemedies', label: 'Organ support remedies', rows: 2, wide: true },
        { key: 'sequencingNotes', label: 'Sequencing with simillimum', rows: 3, wide: true },
        { key: 'monitoringPlan', label: 'Monitoring plan', rows: 2, wide: true }
      )
    }
  },
  'hering-tracking': {
    dataKey: 'heringTracking',
    def: {
      title: "Hering's law & aggravation tracker",
      hint: 'Track direction of cure, aggravations, and ameliorations after prescribing.',
      fields: fields(
        { key: 'prePrescriptionState', label: 'Pre-prescription state', rows: 2, wide: true },
        { key: 'aggravationPhase', label: 'Aggravation phase', rows: 2, wide: true },
        { key: 'directionOfCure', label: "Direction of cure (Hering's law)", rows: 3, wide: true },
        { key: 'ameliorations', label: 'Ameliorations observed', rows: 2, wide: true },
        { key: 'nextAction', label: 'Next action / potency decision', rows: 2, wide: true }
      )
    }
  },
  'acute-fast-track': {
    dataKey: 'acuteFastTrack',
    def: {
      title: 'Acute fast-track',
      hint: 'Minimal acute workflow: complaint → key rubrics → remedy → potency.',
      fields: fields(
        { key: 'acuteComplaint', label: 'Acute complaint', rows: 2, wide: true, rubricSearchable: true },
        { key: 'onsetIntensity', label: 'Onset & intensity', rows: 2 },
        { key: 'keyRubricSummary', label: 'Key rubric summary', rows: 3, wide: true, rubricSearchable: true },
        { key: 'selectedRemedy', label: 'Selected remedy', rows: 1 },
        { key: 'potencyPlan', label: 'Potency & repetition plan', rows: 2, wide: true }
      ),
      requiredKeys: ['acuteComplaint', 'selectedRemedy']
    }
  },
  'combination-remedy': {
    dataKey: 'combinationRemedy',
    def: {
      title: 'Combination / complex remedy',
      hint: 'Document complex remedy composition, indications, and personalization.',
      fields: fields(
        { key: 'combinationName', label: 'Combination / complex name', rows: 2, wide: true },
        { key: 'componentRemedies', label: 'Component remedies', rows: 3, wide: true },
        { key: 'indicationMatch', label: 'Indication match', rows: 3, wide: true },
        { key: 'personalizationNotes', label: 'Personalization notes', rows: 2, wide: true },
        { key: 'durationPlan', label: 'Duration & review plan', rows: 2, wide: true }
      ),
      requiredKeys: ['combinationName', 'indicationMatch'],
      combinationCatalog: true
    }
  }
};

export function structuredPanelForComponent(component: ApproachStepComponent | null | undefined) {
  if (!component) return null;
  return STRUCTURED_APPROACH_PANELS[component] ?? null;
}

export function emptyStructuredPanelData(binding: StructuredPanelBinding): Record<string, string> {
  const data: Record<string, string> = {};
  for (const field of binding.def.fields) {
    data[field.key] = '';
  }
  return data;
}

export function hasStructuredPanelContent(
  dataKey: keyof ApproachDataPayload,
  approachData?: Record<string, unknown> | null
) {
  const binding = Object.values(STRUCTURED_APPROACH_PANELS).find((item) => item?.dataKey === dataKey);
  const block = approachData?.[dataKey] as Record<string, string> | undefined;
  if (!block) return false;
  const requiredKeys = binding?.def.requiredKeys?.length
    ? binding.def.requiredKeys
    : binding?.def.fields.map((field) => field.key) || [];
  if (!requiredKeys.length) {
    return Object.values(block).some((value) => !!value?.trim());
  }
  return requiredKeys.every((key) => !!block[key]?.trim());
}

export function structuredPanelFieldLabels(): Map<string, string> {
  const labels = new Map<string, string>();
  for (const binding of Object.values(STRUCTURED_APPROACH_PANELS)) {
    if (!binding) continue;
    const prefix = humanizeDataKey(String(binding.dataKey));
    for (const field of binding.def.fields) {
      labels.set(`${binding.dataKey}.${field.key}`, `${prefix} · ${field.label}`);
      labels.set(field.key, field.label);
    }
  }
  return labels;
}

function humanizeDataKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (char) => char.toUpperCase());
}
