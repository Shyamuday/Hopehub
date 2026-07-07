import type { ApproachDefinition } from './types';
import {
  buildEightBoxWorkflow,
  buildHybridWorkflow,
  buildKentianWorkflow,
  buildMiasmaticWorkflow,
  buildOrganonLmWorkflow,
  buildProtocolWorkflow,
  buildRepertoryWorkflow,
  buildSensationWorkflow
} from './workflow-steps';

const MIND_BOOST = { chapterMatch: 'mind', multiplier: 1.5, defaultWeight: 3 };
const GENERAL_BOOST = { chapterMatch: 'general', multiplier: 1.25, defaultWeight: 2 };

export const APPROACH_DEFINITIONS: ApproachDefinition[] = [
  {
    slug: 'classical-homeopathy',
    methodNormalizedLabel: 'classical homeopathy',
    title: 'Classical Homeopathy',
    shortDescription: 'Individualized prescribing using totality, single remedy, and minimum dose principles.',
    focus: 'Doctrine-based totality prescribing.',
    bestFor: ['Chronic cases', 'First consultation depth', 'Teaching clinics'],
    processSteps: [
      'Capture full totality',
      'Identify characteristic symptoms',
      'Convert to rubrics',
      'Repertorize and confirm in materia medica',
      'Prescribe single remedy'
    ],
    strengths: ['Deep individualized care', 'Strong repertory integration'],
    limits: ['Time-intensive in busy OPD'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'classical',
    repertory: {
      enabled: true,
      searchPlaceholder: 'e.g. anxiety morning, burning stomach, grief suppressed',
      defaultRubricWeight: 2
    },
    prescription: { potencyGuidance: 'Start with moderate potency unless acute intensity demands otherwise.' }
  },
  {
    slug: 'eight-box-case-structure',
    methodNormalizedLabel: '8-box case structure',
    title: '8-Box Case Structure',
    shortDescription:
      'Structured case-taking across eight clinical boxes before repertorization and prescription.',
    focus: 'Case documentation and symptom structuring before remedy selection.',
    bestFor: ['Chronic complex cases', 'Constitutional prescribing', 'Doctor dashboard workflows'],
    processSteps: [
      'Capture patient identity and constitution profile',
      'Record chief complaints with duration and modalities',
      'Map present illness progression and triggers',
      'Review past and family history',
      'Document mental/emotional state and physical generals',
      'Integrate particulars with investigation and diagnosis',
      'Convert symptoms to rubrics and repertorize',
      'Match materia medica and finalize remedy with potency'
    ],
    strengths: [
      'Prevents random prescribing',
      'Balances mental, physical, and pathology layers',
      'Maps cleanly to digital case forms'
    ],
    limits: ['Not a universal standard in all schools', 'Does not alone define full treatment doctrine'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildEightBoxWorkflow(),
    caseSheetSchemaId: 'eight-box',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Convert 8-box particulars into rubric search terms…',
      defaultRubricWeight: 2
    },
    prescription: { potencyGuidance: 'Select potency after full 8-box documentation and repertory confirmation.' }
  },
  {
    slug: 'organon-lm',
    methodNormalizedLabel: 'organon lm method',
    title: 'Organon LM Method',
    developedBy: 'Samuel Hahnemann',
    shortDescription: 'LM (Q) potency method from the 6th edition Organon with gentle, repeatable dosing.',
    focus: 'Controlled LM repetition with careful response monitoring.',
    bestFor: ['Sensitive patients', 'Long chronic follow-up', 'Fine dose control'],
    processSteps: [
      'Establish baseline totality and vitality',
      'Select simillimum via repertory',
      'Plan LM potency and dilution glass',
      'Use gentle repetition protocol',
      'Review response and adjust incrementally'
    ],
    strengths: ['Gentle action profile', 'Flexible long-term dose management'],
    limits: ['Needs disciplined follow-up', 'Incorrect repetition can confuse case response'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildOrganonLmWorkflow(),
    caseSheetSchemaId: 'organon-lm',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search rubrics for baseline totality before LM dosing…',
      defaultRubricWeight: 2
    },
    prescription: {
      potencyGuidance: 'Use LM (Q) potencies with documented dilution glass, repetition schedule, and aggravation watch.',
      adviceTemplate: 'LM remedy with gentle repetition per Organon 6th edition protocol. Monitor response before escalating.'
    }
  },
  {
    slug: 'clinical-homeopathy',
    methodNormalizedLabel: 'clinical homeopathy',
    title: 'Clinical Homeopathy',
    shortDescription: 'Symptom-clinical correlation with practical prescribing for common presentations.',
    focus: 'Clinical diagnosis plus key prescribing symptoms.',
    bestFor: ['High-volume OPD', 'Acute presentations', 'Telemedicine'],
    processSteps: ['Confirm clinical picture', 'Select key symptoms', 'Shortlist remedies', 'Prescribe and monitor'],
    strengths: ['Fast operational flow', 'Easy for junior doctors'],
    limits: ['Less depth for complex chronic layers'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'clinical',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search by clinical symptom or organ affinity',
      defaultRubricWeight: 2
    },
    prescription: { potencyGuidance: 'Favor practical potencies aligned with acute vs chronic context.' }
  },
  {
    slug: 'constitutional-approach',
    methodNormalizedLabel: 'constitutional approach',
    title: 'Constitutional Approach',
    shortDescription: 'Builds the remedy picture from temperament, generals, and life history.',
    focus: 'Constitution before particulars.',
    bestFor: ['Chronic relapse cases', 'Pediatric constitution', 'Long-term care'],
    processSteps: ['Profile constitution', 'Map generals and mentals', 'Repertorize', 'Confirm deep-acting remedy'],
    strengths: ['Excellent for chronic follow-up'],
    limits: ['Needs detailed initial interview'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'constitutional',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: { potencyGuidance: 'Prefer gradual potency progression in sensitive constitutions.' }
  },
  {
    slug: 'miasmatic-approach',
    methodNormalizedLabel: 'miasmatic approach',
    title: 'Miasmatic Approach',
    shortDescription: 'Layers psoric, sycotic, and syphilitic patterns into remedy selection.',
    focus: 'Miasmatic background and family pattern.',
    bestFor: ['Recurrent pathology', 'Family-linked disease', 'Deep chronic cases'],
    processSteps: ['Map presenting layer', 'Assess miasmatic signs', 'Integrate constitutional clues', 'Repertorize and prescribe'],
    strengths: ['Explains relapse patterns', 'Useful in multi-generational history'],
    limits: ['Requires miasm training'],
    workflowKind: 'MIASMATIC_LAYERED',
    steps: buildMiasmaticWorkflow(),
    caseSheetSchemaId: 'miasmatic',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search rubrics for miasmatic or constitutional clues',
      defaultRubricWeight: 2
    },
    prescription: { potencyGuidance: 'Address dominant miasmatic layer before jumping potency.' }
  },
  {
    slug: 'kentian-method',
    methodNormalizedLabel: 'kentian method',
    title: 'Kentian Method',
    developedBy: 'James Tyler Kent',
    shortDescription: 'Prioritizes mental generals and hierarchical symptom evaluation.',
    focus: 'Mind first, then generals, then particulars.',
    bestFor: ['Deep chronic cases', 'Clear mental generals', 'Experienced prescribers'],
    processSteps: ['Prioritize hierarchy', 'Emphasize mental generals', 'Repertorize deeply', 'Select high-potency strategy when suitable'],
    strengths: ['Strong doctrine-led differentiation'],
    limits: ['Not ideal for all fast OPD cases'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildKentianWorkflow(),
    caseSheetSchemaId: 'kentian',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Start with mental generals: fear, anxiety, irritability…',
      chapterBoosts: [MIND_BOOST, GENERAL_BOOST],
      defaultRubricWeight: 2,
      intakeSearchFromChapters: ['mind', 'general']
    },
    prescription: { potencyGuidance: 'High potency may be suitable when mental generals are clear and vitality supports it.' }
  },
  {
    slug: 'boenninghausen-method',
    methodNormalizedLabel: 'boenninghausen method',
    title: 'Boenninghausen Method',
    developedBy: 'Clemens von Boenninghausen',
    shortDescription: 'Uses location, sensation, modality, and concomitant relationships.',
    focus: 'Complete symptom locations with modalities.',
    bestFor: ['Clear modality patterns', 'Physical particulars', 'Repertory teaching'],
    processSteps: ['Define location', 'Capture sensation', 'Record modalities', 'Add concomitants', 'Repertorize'],
    strengths: ['Structured physical case taking'],
    limits: ['Less emphasis on mentals unless added manually'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'boenninghausen',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Location + sensation + modality, e.g. headache forehead bursting morning',
      defaultRubricWeight: 2
    },
    prescription: {}
  },
  {
    slug: 'boger-method',
    methodNormalizedLabel: 'boger method',
    title: 'Boger Method',
    developedBy: 'Cyrus Maxwell Boger',
    shortDescription: 'Pathological totality with time patterns and concomitants.',
    focus: 'Pathological generals and time modalities.',
    bestFor: ['Chronic pathology-heavy cases', 'Time-aggravated symptoms'],
    processSteps: ['Define pathological totality', 'Map time patterns', 'Repertorize with concomitants', 'Confirm remedy'],
    strengths: ['Strong in pathology-led chronic work'],
    limits: ['Needs accurate clinical correlation'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'boger',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'sensation-method',
    methodNormalizedLabel: 'sensation method',
    title: 'Sensation Method',
    developedBy: 'Rajan Sankaran',
    shortDescription: 'Tracks patient expression and deep sensation themes toward kingdom and family.',
    focus: 'Patient language and sensation kingdom mapping.',
    bestFor: ['Complex chronic cases', 'Rich narrative expression', 'Specialist practice'],
    processSteps: ['Capture patient language', 'Extract sensation themes', 'Map kingdom', 'Select remedy family and remedy'],
    strengths: ['High depth for complex patterns'],
    limits: ['Time-intensive; needs training'],
    workflowKind: 'SENSATION_NARRATIVE',
    steps: buildSensationWorkflow(),
    caseSheetSchemaId: 'sensation',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Optional: validate sensation with rubric search',
      defaultRubricWeight: 2
    },
    prescription: { potencyGuidance: 'Match potency to depth and sensitivity of the sensation layer.' }
  },
  {
    slug: 'scholten-method',
    methodNormalizedLabel: 'scholten method',
    title: 'Scholten Method',
    developedBy: 'Jan Scholten',
    shortDescription: 'Periodic table themes and mineral family patterns for remedy selection.',
    focus: 'Element themes and series/stage mapping.',
    bestFor: ['Mineral remedy cases', 'Theme-rich interviews'],
    processSteps: ['Identify thematic pattern', 'Map series/stage clues', 'Shortlist mineral remedies', 'Confirm with totality'],
    strengths: ['Powerful for mineral pictures'],
    limits: ['Requires Scholten framework knowledge'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'constitutional',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'banerji-protocols',
    methodNormalizedLabel: 'banerji protocols',
    title: 'Banerji Protocols',
    developedBy: 'Prasanta Banerji',
    shortDescription: 'Standardized protocol sets for specific diseases.',
    focus: 'Protocol-driven prescribing for scale and repeatability.',
    bestFor: ['Clinic scalability', 'Telemedicine ops', 'Fast initial treatment'],
    processSteps: ['Select diagnosis', 'Load protocol set', 'Personalize if needed', 'Prescribe and track'],
    strengths: ['High scalability', 'Operational consistency'],
    limits: ['Less individualized than classical frameworks'],
    workflowKind: 'PROTOCOL_DRIVEN',
    steps: buildProtocolWorkflow(),
    caseSheetSchemaId: 'protocol',
    repertory: { enabled: false },
    prescription: {
      skipRepertory: true,
      potencyGuidance: 'Follow protocol dose conventions; document personalization clearly.',
      adviceTemplate: 'Protocol-based prescription with documented personalization.'
    }
  },
  {
    slug: 'predictive-homeopathy',
    methodNormalizedLabel: 'predictive homeopathy',
    title: 'Predictive Homeopathy',
    developedBy: 'Prafull Vijayakar',
    shortDescription: 'Pathology-led predictive patterns and follow-up forecasting.',
    focus: 'Pathology correlation and response prediction.',
    bestFor: ['Pathology-heavy chronic cases', 'Follow-up planning'],
    processSteps: ['Map pathology', 'Identify predictive pattern', 'Prescribe and forecast response'],
    strengths: ['Strong follow-up framing'],
    limits: ['Needs pathology literacy'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildRepertoryWorkflow(),
    caseSheetSchemaId: 'clinical',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'protocol-based-prescribing',
    methodNormalizedLabel: 'protocol-based prescribing',
    title: 'Protocol-Based Prescribing',
    shortDescription: 'Operational protocol pathways for common disease presentations.',
    focus: 'Standardized clinic protocols.',
    bestFor: ['Junior doctors', 'High-volume clinics'],
    processSteps: ['Select protocol', 'Confirm indications', 'Prescribe', 'Track outcomes'],
    strengths: ['Consistency across team'],
    limits: ['May miss atypical presentations'],
    workflowKind: 'PROTOCOL_DRIVEN',
    steps: buildProtocolWorkflow(),
    caseSheetSchemaId: 'protocol',
    repertory: { enabled: false },
    prescription: { skipRepertory: true }
  },
  {
    slug: 'integrated-hybrid-approach',
    methodNormalizedLabel: 'integrated hybrid approach',
    title: 'Integrated Hybrid Approach',
    shortDescription: 'Combines classical, clinical, and protocol tools as the case demands.',
    focus: 'Flexible multi-path prescribing.',
    bestFor: ['Complex ops environments', 'Senior consultants', 'Teaching'],
    processSteps: ['Choose primary path', 'Add supporting path if needed', 'Document integration', 'Prescribe'],
    strengths: ['Maximum flexibility'],
    limits: ['Requires clear documentation to avoid confusion'],
    workflowKind: 'HYBRID',
    steps: buildHybridWorkflow(),
    caseSheetSchemaId: 'hybrid',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  }
];

export const DEFAULT_APPROACH = APPROACH_DEFINITIONS[0];
