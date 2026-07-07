import type { ApproachStep, ApproachStepComponent } from './types';

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
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview',
      description: '8-Box structured case taking before repertorization.'
    },
    {
      id: 'case-sheet',
      label: '8-Box case structure',
      shortLabel: '8 Boxes',
      component: 'case-sheet',
      description: 'Complete all eight clinical boxes: identity, complaints, history, mentals, generals, and particulars.'
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

export function buildHybridWorkflow(): ApproachStep[] {
  return [
    {
      id: 'approach-select',
      label: 'Approach',
      shortLabel: 'Approach',
      component: 'approach-overview'
    },
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
