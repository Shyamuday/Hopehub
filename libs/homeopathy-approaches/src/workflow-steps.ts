import type { ApproachStep, ApproachStepComponent, ApproachStepId } from './types';

const REPERTORY_WORKFLOW_TAIL: ApproachStep[] = [
  {
    id: 'rubric-search',
    label: 'Symptom rubrics',
    shortLabel: 'Rubrics',
    component: 'repertory-workspace',
    description: 'Search the repertory and build the symptom set for this case.'
  },
  {
    id: 'repertorize',
    label: 'Repertorize',
    shortLabel: 'Repertorize',
    component: 'repertory-workspace',
    description: 'Run repertorization and review ranked remedies.'
  },
  {
    id: 'remedy-select',
    label: 'Select remedy',
    shortLabel: 'Remedy',
    component: 'remedy-results',
    description: 'Confirm the simillimum and review materia medica.'
  },
  {
    id: 'prescribe',
    label: 'Prescription',
    shortLabel: 'Prescribe',
    component: 'prescription-handoff',
    description: 'Hand off to the prescription editor with linked case analysis.'
  }
];

function structuredStep(
  id: ApproachStepId,
  label: string,
  shortLabel: string,
  component: ApproachStepComponent,
  description?: string,
  optional = false
): ApproachStep {
  return { id, label, shortLabel, component, description, optional };
}

const APPROACH_SELECT_STEP: ApproachStep = {
  id: 'approach-select',
  label: 'Approach',
  shortLabel: 'Approach',
  component: 'approach-overview',
  description: 'Choose the homeopathic method that governs this case analysis.'
};

const ANALYSIS_NOTES_STEP: ApproachStep = {
  id: 'analysis-notes',
  label: 'Notes',
  shortLabel: 'Notes',
  component: 'analysis-notes',
  description: 'Free-form analysis notes and follow-up thoughts.',
  optional: true
};

const HERING_TRACKING_STEP: ApproachStep = {
  id: 'hering-tracking',
  label: "Hering's law tracker",
  shortLabel: 'Hering',
  component: 'hering-tracking',
  description: "Optional aggravation and direction-of-cure tracking after prescribing.",
  optional: true
};

export function buildBoenninghausenWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'boenninghausen-lsm',
      'LSM symptom set',
      'LSM',
      'boenninghausen-lsm',
      'Capture location, sensation, modality, and concomitants.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP,
    HERING_TRACKING_STEP
  ];
}

export function buildBogerWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'boger-totality',
      'Pathological totality',
      'Totality',
      'boger-totality',
      'Map Boger pathological generals and time patterns.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP,
    HERING_TRACKING_STEP
  ];
}

export function buildConstitutionalWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'constitutional-profile',
      'Constitutional profile',
      'Constitution',
      'constitutional-profile',
      'Temperament, thermal state, and generals before particulars.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildClinicalAcuteWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'clinical-acute',
      'Acute clinical snapshot',
      'Acute',
      'clinical-acute',
      'Fast clinical capture for high-volume OPD.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildPredictiveWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'predictive-pathology',
      'Predictive pathology',
      'Predict',
      'predictive-pathology',
      'Pathology stage with response forecast.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP,
    HERING_TRACKING_STEP
  ];
}

export function buildFibonacciWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    { id: 'case-sheet', label: 'Baseline case', shortLabel: 'Case', component: 'case-sheet' },
    ...REPERTORY_WORKFLOW_TAIL.slice(0, 2),
    structuredStep(
      'fibonacci-potency',
      'Fibonacci potency plan',
      'Fibonacci',
      'fibonacci-potency',
      'Plan potency ladder and response checkpoints.'
    ),
    REPERTORY_WORKFLOW_TAIL[2],
    REPERTORY_WORKFLOW_TAIL[3],
    ANALYSIS_NOTES_STEP,
    HERING_TRACKING_STEP
  ];
}

export function buildTautopathyWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'tautopathy-isopathy',
      'Tautopathy / isopathy',
      'Tautopathy',
      'tautopathy-isopathy',
      'Causal substance, potency, and clearing plan.'
    ),
    REPERTORY_WORKFLOW_TAIL[3],
    ANALYSIS_NOTES_STEP
  ];
}

export function buildEizayagaWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'eizayaga-layers',
      'Layers of health',
      'Layers',
      'eizayaga-layers',
      'Lesion, functional, constitutional, and fundamental layers.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildVithoulkasWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'vithoulkas-essences',
      'Essences & levels',
      'Essence',
      'vithoulkas-essences',
      'Essence theme and level of health.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildDrainageWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'drainage-support',
      'Drainage & support',
      'Drainage',
      'drainage-support',
      'Drainage and organ support alongside simillimum.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildHeringWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    { id: 'case-sheet', label: 'Case baseline', shortLabel: 'Case', component: 'case-sheet' },
    ...REPERTORY_WORKFLOW_TAIL,
    structuredStep(
      'hering-tracking',
      "Hering's law tracker",
      'Hering',
      'hering-tracking',
      'Track direction of cure after prescribing.'
    ),
    ANALYSIS_NOTES_STEP
  ];
}

export function buildAcuteFastTrackWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'acute-fast-track',
      'Acute fast-track',
      'Fast',
      'acute-fast-track',
      'Minimal acute path to remedy and potency.'
    ),
    {
      id: 'rubric-search',
      label: 'Key rubrics',
      shortLabel: 'Rubrics',
      component: 'repertory-workspace',
      optional: true
    },
    { id: 'remedy-select', label: 'Select remedy', shortLabel: 'Remedy', component: 'remedy-results' },
    { id: 'prescribe', label: 'Prescription', shortLabel: 'Prescribe', component: 'prescription-handoff' }
  ];
}

export function buildCombinationWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'combination-remedy',
      'Combination remedy',
      'Combo',
      'combination-remedy',
      'Complex remedy composition and indication match.'
    ),
    { id: 'prescribe', label: 'Prescription', shortLabel: 'Prescribe', component: 'prescription-handoff' }
  ];
}

export function buildRepertoryWorkflow(caseSheetComponent: ApproachStepComponent = 'case-sheet'): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview',
      description: 'Choose the homeopathic method that governs this case analysis.'
    },
    {
      id: 'case-sheet',
      label: 'Case capture',
      shortLabel: 'Case',
      component: caseSheetComponent,
      description: 'Document the case using the structure required by this approach.'
    },
    ...REPERTORY_WORKFLOW_TAIL,
    {
      id: 'analysis-notes',
      label: 'Notes',
      shortLabel: 'Notes',
      component: 'analysis-notes',
      description: 'Free-form analysis notes and follow-up thoughts.',
      optional: true
    }
  ];
}

export function buildKentianWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview'
    },
    {
      id: 'symptom-hierarchy',
      label: 'Symptom hierarchy',
      shortLabel: 'Hierarchy',
      component: 'kent-hierarchy',
      description: 'Capture mental generals first, then physical generals and particulars.'
    },
    {
      id: 'case-sheet',
      label: 'Case sheet',
      shortLabel: 'Case',
      component: 'case-sheet'
    },
    ...REPERTORY_WORKFLOW_TAIL,
    {
      id: 'analysis-notes',
      label: 'Notes',
      shortLabel: 'Notes',
      component: 'analysis-notes',
      optional: true
    }
  ];
}

export function buildSensationWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview'
    },
    {
      id: 'sensation-capture',
      label: 'Sensation mapping',
      shortLabel: 'Sensation',
      component: 'sensation-mapper',
      description: 'Capture patient language, core sensation, and kingdom patterns.'
    },
    {
      id: 'case-sheet',
      label: 'Case sheet',
      shortLabel: 'Case',
      component: 'case-sheet'
    },
    {
      id: 'rubric-search',
      label: 'Supporting rubrics',
      shortLabel: 'Rubrics',
      component: 'repertory-workspace',
      description: 'Optional repertory support to validate sensation findings.',
      optional: true
    },
    {
      id: 'remedy-select',
      label: 'Select remedy',
      shortLabel: 'Remedy',
      component: 'remedy-results'
    },
    {
      id: 'prescribe',
      label: 'Prescription',
      shortLabel: 'Prescribe',
      component: 'prescription-handoff'
    }
  ];
}

export function buildMiasmaticWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview'
    },
    {
      id: 'miasm-layer',
      label: 'Miasmatic layer',
      shortLabel: 'Miasm',
      component: 'miasm-selector',
      description: 'Map psoric, sycotic, and syphilitic layers before repertorization.'
    },
    {
      id: 'case-sheet',
      label: 'Case sheet',
      shortLabel: 'Case',
      component: 'case-sheet'
    },
    ...REPERTORY_WORKFLOW_TAIL,
    {
      id: 'analysis-notes',
      label: 'Notes',
      shortLabel: 'Notes',
      component: 'analysis-notes',
      optional: true
    }
  ];
}

export function buildProtocolWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview'
    },
    {
      id: 'protocol-pick',
      label: 'Protocol selection',
      shortLabel: 'Protocol',
      component: 'protocol-selector',
      description: 'Select a disease protocol and personalize if needed.'
    },
    {
      id: 'case-sheet',
      label: 'Protocol notes',
      shortLabel: 'Notes',
      component: 'case-sheet'
    },
    {
      id: 'prescribe',
      label: 'Prescription',
      shortLabel: 'Prescribe',
      component: 'prescription-handoff'
    }
  ];
}

export function buildEightBoxWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'eight-box-guided',
      '8-box guided capture',
      '8 Boxes',
      'eight-box-guided',
      'Complete each clinical box before repertorization.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP
  ];
}

export function buildOrganonLmWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview',
      description: 'Organon 6th edition / LM (Q) potency method with gentle repetition.'
    },
    {
      id: 'case-sheet',
      label: 'Baseline case',
      shortLabel: 'Baseline',
      component: 'case-sheet',
      description: 'Establish totality, vitality, and sensitivity before LM remedy selection.'
    },
    {
      id: 'rubric-search',
      label: 'Symptom rubrics',
      shortLabel: 'Rubrics',
      component: 'repertory-workspace',
      description: 'Build the symptom rubric set for remedy selection.'
    },
    {
      id: 'repertorize',
      label: 'Repertorize',
      shortLabel: 'Repertorize',
      component: 'repertory-workspace'
    },
    {
      id: 'remedy-select',
      label: 'Select remedy',
      shortLabel: 'Remedy',
      component: 'remedy-results',
      description: 'Confirm the simillimum before planning LM potency.'
    },
    {
      id: 'lm-dosing',
      label: 'LM dosing plan',
      shortLabel: 'LM dose',
      component: 'organon-lm-dosing',
      description: 'Plan LM potency, dilution glass, repetition, and response monitoring.'
    },
    {
      id: 'prescribe',
      label: 'Prescription',
      shortLabel: 'Prescribe',
      component: 'prescription-handoff',
      description: 'Hand off to prescription with LM dosing notes.'
    },
    {
      id: 'analysis-notes',
      label: 'Notes',
      shortLabel: 'Notes',
      component: 'analysis-notes',
      optional: true
    }
  ];
}

export function buildKeynoteWorkflow(): ApproachStep[] {
  return [
    { id: 'approach-select', label: 'Approach', shortLabel: 'Approach', component: 'approach-overview' },
    {
      id: 'keynote-striking',
      label: 'Keynote symptoms',
      shortLabel: 'Keynotes',
      component: 'keynote-striking',
      description: 'Identify striking, rare, and peculiar symptoms before totality cross-check.'
    },
    { id: 'case-sheet', label: 'Totality review', shortLabel: 'Totality', component: 'case-sheet' },
    ...REPERTORY_WORKFLOW_TAIL,
    { id: 'analysis-notes', label: 'Notes', shortLabel: 'Notes', component: 'analysis-notes', optional: true }
  ];
}

export function buildScholtenWorkflow(): ApproachStep[] {
  return [
    { id: 'approach-select', label: 'Approach', shortLabel: 'Approach', component: 'approach-overview' },
    {
      id: 'scholten-mapping',
      label: 'Periodic table map',
      shortLabel: 'Scholten',
      component: 'scholten-mapper',
      description: 'Map series, stage, and mineral themes before repertorization.'
    },
    { id: 'case-sheet', label: 'Scholten case sheet', shortLabel: 'Case', component: 'case-sheet' },
    ...REPERTORY_WORKFLOW_TAIL,
    { id: 'analysis-notes', label: 'Notes', shortLabel: 'Notes', component: 'analysis-notes', optional: true }
  ];
}

export function buildSehgalWorkflow(): ApproachStep[] {
  return [
    { id: 'approach-select', label: 'Approach', shortLabel: 'Approach', component: 'approach-overview' },
    {
      id: 'sehgal-emotion',
      label: 'Emotional core',
      shortLabel: 'Emotion',
      component: 'sehgal-emotion',
      description: 'Identify the emotional disturbance driving the case.'
    },
    { id: 'case-sheet', label: 'Case sheet', shortLabel: 'Case', component: 'case-sheet' },
    ...REPERTORY_WORKFLOW_TAIL,
    { id: 'analysis-notes', label: 'Notes', shortLabel: 'Notes', component: 'analysis-notes', optional: true }
  ];
}

export function buildIntegrativeFollowUpWorkflow(): ApproachStep[] {
  return [
    { id: 'approach-select', label: 'Approach', shortLabel: 'Approach', component: 'approach-overview' },
    {
      id: 'integrative-follow-up',
      label: 'Follow-up & safety',
      shortLabel: 'Follow-up',
      component: 'integrative-follow-up',
      description: 'Track metrics, red flags, and referral logic for chronic digital care.'
    },
    { id: 'case-sheet', label: 'Care plan', shortLabel: 'Plan', component: 'case-sheet' },
    {
      id: 'rubric-search',
      label: 'Symptom rubrics',
      shortLabel: 'Rubrics',
      component: 'repertory-workspace',
      optional: true
    },
    { id: 'remedy-select', label: 'Select remedy', shortLabel: 'Remedy', component: 'remedy-results' },
    { id: 'prescribe', label: 'Prescription', shortLabel: 'Prescribe', component: 'prescription-handoff' }
  ];
}

export function buildPathologicalWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    structuredStep(
      'pathological-anchor',
      'Pathology anchor',
      'Pathology',
      'pathological-anchor',
      'Anchor prescribing on pathology stage and investigations.'
    ),
    ...REPERTORY_WORKFLOW_TAIL,
    ANALYSIS_NOTES_STEP,
    HERING_TRACKING_STEP
  ];
}

export function buildHybridWorkflow(): ApproachStep[] {
  return [
    APPROACH_SELECT_STEP,
    {
      id: 'case-sheet',
      label: 'Integration plan',
      shortLabel: 'Plan',
      component: 'case-sheet'
    },
    {
      id: 'rubric-search',
      label: 'Symptom rubrics',
      shortLabel: 'Rubrics',
      component: 'repertory-workspace',
      optional: true
    },
    {
      id: 'protocol-pick',
      label: 'Protocol (optional)',
      shortLabel: 'Protocol',
      component: 'protocol-selector',
      optional: true
    },
    { id: 'remedy-select', label: 'Select remedy', shortLabel: 'Remedy', component: 'remedy-results' },
    { id: 'prescribe', label: 'Prescription', shortLabel: 'Prescribe', component: 'prescription-handoff' },
    HERING_TRACKING_STEP
  ];
}
