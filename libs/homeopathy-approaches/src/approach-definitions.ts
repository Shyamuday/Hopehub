import type { ApproachDefinition } from './types';
import {
  buildEightBoxWorkflow,
  buildHybridWorkflow,
  buildIntegrativeFollowUpWorkflow,
  buildKentianWorkflow,
  buildKeynoteWorkflow,
  buildMiasmaticWorkflow,
  buildOrganonLmWorkflow,
  buildPathologicalWorkflow,
  buildProtocolWorkflow,
  buildRepertoryWorkflow,
  buildScholtenWorkflow,
  buildSehgalWorkflow,
  buildSensationWorkflow,
  buildBoenninghausenWorkflow,
  buildBogerWorkflow,
  buildConstitutionalWorkflow,
  buildTemperamentConstitutionalWorkflow,
  buildBachFlowerEmotionalWorkflow,
  buildNosodeSarcodeWorkflow,
  buildMotherTinctureOrganopathicWorkflow,
  buildIntercurrentRemedyWorkflow,
  buildPediatricConstitutionalWorkflow,
  buildClinicalAcuteWorkflow,
  buildPredictiveWorkflow,
  buildFibonacciWorkflow,
  buildTautopathyWorkflow,
  buildEizayagaWorkflow,
  buildVithoulkasWorkflow,
  buildDrainageWorkflow,
  buildHeringWorkflow,
  buildAcuteFastTrackWorkflow,
  buildCombinationWorkflow
} from './workflow-steps';

const MIND_BOOST = { chapterMatch: 'mind', multiplier: 1.5, defaultWeight: 3 };
const GENERAL_BOOST = { chapterMatch: 'general', multiplier: 1.25, defaultWeight: 2 };

export const APPROACH_DEFINITIONS: ApproachDefinition[] = [
  {
    slug: 'classical-homeopathy',
    marketingSlug: 'classical-homeopathy-framework',
    methodNormalizedLabel: 'classical homeopathy',
    title: 'Classical Homeopathy',
    shortDescription:
      'Individualized prescribing using totality, single remedy, and minimum dose principles.',
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
    prescription: {
      potencyGuidance: 'Start with moderate potency unless acute intensity demands otherwise.'
    }
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
    limits: [
      'Not a universal standard in all schools',
      'Does not alone define full treatment doctrine'
    ],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildEightBoxWorkflow(),
    caseSheetSchemaId: 'eight-box',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Convert 8-box particulars into rubric search terms…',
      defaultRubricWeight: 2
    },
    prescription: {
      potencyGuidance: 'Select potency after full 8-box documentation and repertory confirmation.'
    }
  },
  {
    slug: 'organon-lm',
    methodNormalizedLabel: 'organon lm method',
    title: 'Organon LM Method',
    developedBy: 'Samuel Hahnemann',
    shortDescription:
      'LM (Q) potency method from the 6th edition Organon with gentle, repeatable dosing.',
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
      potencyGuidance:
        'Use LM (Q) potencies with documented dilution glass, repetition schedule, and aggravation watch.',
      adviceTemplate:
        'LM remedy with gentle repetition per Organon 6th edition protocol. Monitor response before escalating.'
    }
  },
  {
    slug: 'clinical-homeopathy',
    methodNormalizedLabel: 'clinical homeopathy',
    title: 'Clinical Homeopathy',
    shortDescription:
      'Symptom-clinical correlation with practical prescribing for common presentations.',
    focus: 'Clinical diagnosis plus key prescribing symptoms.',
    bestFor: ['High-volume OPD', 'Acute presentations', 'Telemedicine'],
    processSteps: [
      'Confirm clinical picture',
      'Select key symptoms',
      'Shortlist remedies',
      'Prescribe and monitor'
    ],
    strengths: ['Fast operational flow', 'Easy for junior doctors'],
    limits: ['Less depth for complex chronic layers'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildClinicalAcuteWorkflow(),
    caseSheetSchemaId: 'clinical',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search by clinical symptom or organ affinity',
      defaultRubricWeight: 2
    },
    prescription: {
      potencyGuidance: 'Favor practical potencies aligned with acute vs chronic context.'
    }
  },
  {
    slug: 'constitutional-approach',
    marketingSlug: 'constitutional',
    methodNormalizedLabel: 'constitutional approach',
    title: 'Constitutional Approach',
    shortDescription: 'Builds the remedy picture from temperament, generals, and life history.',
    focus: 'Constitution before particulars.',
    bestFor: ['Chronic relapse cases', 'Pediatric constitution', 'Long-term care'],
    processSteps: [
      'Profile constitution',
      'Map generals and mentals',
      'Repertorize',
      'Confirm deep-acting remedy'
    ],
    strengths: ['Excellent for chronic follow-up'],
    limits: ['Needs detailed initial interview'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildConstitutionalWorkflow(),
    caseSheetSchemaId: 'constitutional',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {
      potencyGuidance: 'Prefer gradual potency progression in sensitive constitutions.'
    }
  },
  {
    slug: 'temperament-based-constitutional',
    marketingSlug: 'temperament-constitutional',
    methodNormalizedLabel: 'temperament based constitutional approach',
    title: 'Temperament-Based Constitutional Approach',
    shortDescription:
      'Uses dominant temperament, secondary temperament, and stable generals to guide constitutional remedy selection.',
    focus: 'Temperament as the organizing frame for constitution and remedy differentiation.',
    bestFor: [
      'Chronic constitutional cases',
      'Behavior-led interviews',
      'Pediatric and family practice'
    ],
    processSteps: [
      'Identify dominant and secondary temperament',
      'Collect temperament evidence from behavior and patient language',
      'Map emotional baseline, reactivity, and physical generals',
      'Convert temperament-linked clues into rubrics',
      'Confirm the remedy through totality and materia medica'
    ],
    strengths: [
      'Makes constitution easier to structure',
      'Helps junior doctors capture stable patient patterns',
      'Works well alongside repertory confirmation'
    ],
    limits: [
      'Risk of overtyping the patient if not checked against totality',
      'Needs careful differentiation from temporary mood states'
    ],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildTemperamentConstitutionalWorkflow(),
    caseSheetSchemaId: 'constitutional',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search temperament-linked mentals, generals, and modalities…',
      defaultRubricWeight: 2,
      chapterBoosts: [MIND_BOOST, GENERAL_BOOST],
      intakeSearchFromChapters: ['mind', 'general']
    },
    prescription: {
      potencyGuidance:
        'Confirm temperament findings against full totality; start conservatively when temperament and pathology disagree.'
    }
  },
  {
    slug: 'bach-flower-emotional-support',
    marketingSlug: 'bach-flower-emotional-support',
    methodNormalizedLabel: 'bach flower emotional support approach',
    title: 'Bach Flower / Emotional Support Approach',
    developedBy: 'Edward Bach',
    shortDescription:
      'Maps present emotional state and stress response to supportive flower-remedy selection.',
    focus: 'Emotional support, stress states, coping pattern, and gentle adjunct care.',
    bestFor: ['Anxiety and stress states', 'Grief or adjustment support', 'Adjunct emotional care'],
    processSteps: [
      'Identify the present emotional state',
      'Map trigger, coping pattern, and behavior',
      'Select flower remedy or combination',
      'Set short review window and support notes'
    ],
    strengths: [
      'Fast emotional-state capture',
      'Gentle adjunctive workflow',
      'Useful in counseling-heavy visits'
    ],
    limits: [
      'Adjunctive rather than deep constitutional prescribing',
      'Needs red-flag screening for severe mental health risk'
    ],
    workflowKind: 'HYBRID',
    steps: buildBachFlowerEmotionalWorkflow(),
    caseSheetSchemaId: 'integrative-follow-up',
    repertory: { enabled: false },
    prescription: {
      skipRepertory: true,
      adviceTemplate: 'Flower-remedy support with documented emotional state and review plan.'
    }
  },
  {
    slug: 'nosode-sarcode-approach',
    marketingSlug: 'nosode-sarcode',
    methodNormalizedLabel: 'nosode sarcode approach',
    title: 'Nosode / Sarcode Approach',
    shortDescription:
      'Uses nosode or sarcode indications for inherited tendency, recurrent disease, organ affinity, or stuck cases.',
    focus: 'Miasmatic, inherited, recurrent, and organ-specific remedy layers.',
    bestFor: [
      'Recurrent infections',
      'Strong family disease load',
      'Organ/tissue support decisions'
    ],
    processSteps: [
      'Identify miasmatic or inherited tendency',
      'Map recurrent disease or organ affinity',
      'Check current vitality and sensitivity',
      'Choose nosode or sarcode strategy',
      'Confirm timing, potency, and follow-up markers'
    ],
    strengths: [
      'Useful when constitutional progress stalls',
      'Clarifies inherited and organ layers'
    ],
    limits: [
      'Requires careful timing',
      'Can confuse case response if used without clear indication'
    ],
    workflowKind: 'MIASMATIC_LAYERED',
    steps: buildNosodeSarcodeWorkflow(),
    caseSheetSchemaId: 'miasmatic',
    repertory: {
      enabled: true,
      searchPlaceholder:
        'Search miasmatic, family history, recurrent infection, or organ affinity clues…',
      defaultRubricWeight: 2
    },
    prescription: {
      potencyGuidance: 'Use only with documented indication, vitality check, and follow-up plan.'
    }
  },
  {
    slug: 'mother-tincture-organopathic',
    marketingSlug: 'mother-tincture-organopathic',
    methodNormalizedLabel: 'mother tincture organopathic approach',
    title: 'Mother Tincture / Organopathic Approach',
    shortDescription:
      'Supports organ affinity and functional pathology with mother tinctures or organopathic remedies.',
    focus: 'Organ support, tissue affinity, dose safety, and objective monitoring.',
    bestFor: [
      'Organ support cases',
      'Functional pathology',
      'Adjunct prescribing with measurable markers'
    ],
    processSteps: [
      'Identify target organ or system',
      'Correlate pathology and objective markers',
      'Select organopathic or mother tincture support',
      'Define dose, duration, contraindications, and monitoring'
    ],
    strengths: ['Practical for busy clinical care', 'Pairs well with objective reports'],
    limits: [
      'Can become disease-name prescribing if overused',
      'Needs medication and safety review'
    ],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildMotherTinctureOrganopathicWorkflow(),
    caseSheetSchemaId: 'pathological',
    repertory: { enabled: false },
    prescription: {
      skipRepertory: true,
      adviceTemplate: 'Organopathic support with documented dose, duration, and safety monitoring.'
    }
  },
  {
    slug: 'intercurrent-remedy-approach',
    marketingSlug: 'intercurrent-remedy',
    methodNormalizedLabel: 'intercurrent remedy approach',
    title: 'Intercurrent Remedy Approach',
    shortDescription:
      'Guides intercurrent prescribing when a well-managed case is blocked, relapsing, or miasmatically stuck.',
    focus:
      'Blocked-case analysis, miasmatic layer, and remedy timing between constitutional prescriptions.',
    bestFor: ['Stalled chronic cases', 'Relapse-prone cases', 'Clear miasmatic blocks'],
    processSteps: [
      'Confirm the case is genuinely blocked',
      'Identify obstacle, maintaining cause, or miasmatic layer',
      'Select intercurrent remedy and potency',
      'Plan timing relative to constitutional remedy',
      'Track response before returning to main plan'
    ],
    strengths: [
      'Improves difficult follow-ups',
      'Prevents premature constitutional remedy changes'
    ],
    limits: ['Should not replace poor case analysis', 'Needs disciplined follow-up interpretation'],
    workflowKind: 'MIASMATIC_LAYERED',
    steps: buildIntercurrentRemedyWorkflow(),
    caseSheetSchemaId: 'miasmatic',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search blocked-case, miasmatic, obstacle, and relapse clues…',
      defaultRubricWeight: 2,
      chapterBoosts: [GENERAL_BOOST]
    },
    prescription: {
      potencyGuidance:
        'Use when the block is documented; pause and observe before changing the main remedy.'
    }
  },
  {
    slug: 'pediatric-constitutional',
    marketingSlug: 'pediatric-constitutional',
    methodNormalizedLabel: 'pediatric constitutional approach',
    title: 'Pediatric Constitutional Approach',
    shortDescription:
      'Adapts constitutional prescribing for children using temperament, milestones, fears, food, sleep, and guardian observations.',
    focus: 'Child-specific constitution and development-aware remedy selection.',
    bestFor: [
      'Children and adolescents',
      'Recurrent pediatric complaints',
      'Family-practice follow-ups'
    ],
    processSteps: [
      'Capture guardian observations and child temperament',
      'Review milestones, pregnancy, birth, and family history',
      'Map food, sleep, fears, play, and school behavior',
      'Repertorize child-specific generals and mentals',
      'Select remedy with gentle potency planning'
    ],
    strengths: ['Child-specific case structure', 'Improves quality of guardian-led history'],
    limits: [
      'Requires separating parent interpretation from child observation',
      'Needs age-appropriate safety screening'
    ],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildPediatricConstitutionalWorkflow(),
    caseSheetSchemaId: 'constitutional',
    repertory: {
      enabled: true,
      searchPlaceholder:
        'Search pediatric temperament, fears, food, sleep, milestones, and recurrent patterns…',
      defaultRubricWeight: 2,
      chapterBoosts: [MIND_BOOST, GENERAL_BOOST],
      intakeSearchFromChapters: ['mind', 'general']
    },
    prescription: {
      potencyGuidance:
        'Use gentle potency selection and confirm remedy through stable child generals.'
    }
  },
  {
    slug: 'miasmatic-approach',
    marketingSlug: 'miasmatic',
    methodNormalizedLabel: 'miasmatic approach',
    title: 'Miasmatic Approach',
    shortDescription: 'Layers psoric, sycotic, and syphilitic patterns into remedy selection.',
    focus: 'Miasmatic background and family pattern.',
    bestFor: ['Recurrent pathology', 'Family-linked disease', 'Deep chronic cases'],
    processSteps: [
      'Map presenting layer',
      'Assess miasmatic signs',
      'Integrate constitutional clues',
      'Repertorize and prescribe'
    ],
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
    processSteps: [
      'Prioritize hierarchy',
      'Emphasize mental generals',
      'Repertorize deeply',
      'Select high-potency strategy when suitable'
    ],
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
    prescription: {
      potencyGuidance:
        'High potency may be suitable when mental generals are clear and vitality supports it.'
    }
  },
  {
    slug: 'boenninghausen-method',
    methodNormalizedLabel: 'boenninghausen method',
    title: 'Boenninghausen Method',
    developedBy: 'Clemens von Boenninghausen',
    shortDescription: 'Uses location, sensation, modality, and concomitant relationships.',
    focus: 'Complete symptom locations with modalities.',
    bestFor: ['Clear modality patterns', 'Physical particulars', 'Repertory teaching'],
    processSteps: [
      'Define location',
      'Capture sensation',
      'Record modalities',
      'Add concomitants',
      'Repertorize'
    ],
    strengths: ['Structured physical case taking'],
    limits: ['Less emphasis on mentals unless added manually'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildBoenninghausenWorkflow(),
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
    processSteps: [
      'Define pathological totality',
      'Map time patterns',
      'Repertorize with concomitants',
      'Confirm remedy'
    ],
    strengths: ['Strong in pathology-led chronic work'],
    limits: ['Needs accurate clinical correlation'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildBogerWorkflow(),
    caseSheetSchemaId: 'boger',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'sensation-method',
    methodNormalizedLabel: 'sensation method',
    title: 'Sensation Method',
    developedBy: 'Rajan Sankaran',
    shortDescription:
      'Tracks patient expression and deep sensation themes toward kingdom and family.',
    focus: 'Patient language and sensation kingdom mapping.',
    bestFor: ['Complex chronic cases', 'Rich narrative expression', 'Specialist practice'],
    processSteps: [
      'Capture patient language',
      'Extract sensation themes',
      'Map kingdom',
      'Select remedy family and remedy'
    ],
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
    prescription: {
      potencyGuidance: 'Match potency to depth and sensitivity of the sensation layer.'
    }
  },
  {
    slug: 'scholten-method',
    methodNormalizedLabel: 'scholten method',
    title: 'Scholten Method',
    developedBy: 'Jan Scholten',
    shortDescription: 'Periodic table themes and mineral family patterns for remedy selection.',
    focus: 'Element themes and series/stage mapping.',
    bestFor: ['Mineral remedy cases', 'Theme-rich interviews'],
    processSteps: [
      'Identify thematic pattern',
      'Map series/stage clues',
      'Shortlist mineral remedies',
      'Confirm with totality'
    ],
    strengths: ['Powerful for mineral pictures'],
    limits: ['Requires Scholten framework knowledge'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildScholtenWorkflow(),
    caseSheetSchemaId: 'scholten',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Validate mineral themes with confirmatory rubrics…',
      defaultRubricWeight: 2
    },
    prescription: {
      potencyGuidance: 'Confirm mineral remedy with materia medica before potency selection.'
    }
  },
  {
    slug: 'banerji-protocols',
    methodNormalizedLabel: 'banerji protocols',
    title: 'Banerji Protocols',
    developedBy: 'Prasanta Banerji',
    shortDescription: 'Standardized protocol sets for specific diseases.',
    focus: 'Protocol-driven prescribing for scale and repeatability.',
    bestFor: ['Clinic scalability', 'Telemedicine ops', 'Fast initial treatment'],
    processSteps: [
      'Select diagnosis',
      'Load protocol set',
      'Personalize if needed',
      'Prescribe and track'
    ],
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
    processSteps: [
      'Map pathology',
      'Identify predictive pattern',
      'Prescribe and forecast response'
    ],
    strengths: ['Strong follow-up framing'],
    limits: ['Needs pathology literacy'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildPredictiveWorkflow(),
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
    marketingSlug: 'integrated-hybrid',
    methodNormalizedLabel: 'integrated hybrid approach',
    title: 'Integrated Hybrid Approach',
    shortDescription: 'Combines classical, clinical, and protocol tools as the case demands.',
    focus: 'Flexible multi-path prescribing.',
    bestFor: ['Complex ops environments', 'Senior consultants', 'Teaching'],
    processSteps: [
      'Choose primary path',
      'Add supporting path if needed',
      'Document integration',
      'Prescribe'
    ],
    strengths: ['Maximum flexibility'],
    limits: ['Requires clear documentation to avoid confusion'],
    workflowKind: 'HYBRID',
    steps: buildHybridWorkflow(),
    caseSheetSchemaId: 'hybrid',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'keynote-totality',
    methodNormalizedLabel: 'keynote + totality approach',
    title: 'Keynote + Totality Approach',
    shortDescription:
      'Combines striking keynote symptoms with the broader symptom totality to reduce prescribing errors.',
    focus: 'Balance precision clues with overall case coherence.',
    bestFor: [
      'Cases with one or two striking symptoms',
      'Mixed acute-chronic patterns',
      'Difficult differentiation'
    ],
    processSteps: [
      'Identify rare, peculiar, and characteristic symptoms',
      'Cross-check with full totality for consistency',
      'Repertorize differentials',
      'Finalize remedy after materia medica confirmation'
    ],
    strengths: ['Improves remedy differentiation', 'Prevents overreliance on a single symptom'],
    limits: ['Complex in poorly documented cases', 'Needs disciplined symptom hierarchy'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildKeynoteWorkflow(),
    caseSheetSchemaId: 'keynote',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search keynotes and confirm with totality rubrics…',
      defaultRubricWeight: 4
    },
    prescription: {
      potencyGuidance:
        'Weight striking keynotes but confirm against full totality before prescribing.'
    }
  },
  {
    slug: 'pathological-prescribing',
    methodNormalizedLabel: 'pathology-based prescribing',
    title: 'Pathology-Based Prescribing',
    shortDescription: 'Uses pathology stage and disease process as a central prescribing anchor.',
    focus: 'Bridge pathology clarity with remedy choice.',
    bestFor: ['Advanced diagnosed disease', 'Integrative settings', 'Objective report trends'],
    processSteps: [
      'Map pathology stage',
      'Correlate key symptoms',
      'Select remedy strategy',
      'Track outcomes'
    ],
    strengths: ['Useful in modern diagnostics context', 'Supports specialist communication'],
    limits: ['May underweight deeper individuality if used alone'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildPathologicalWorkflow(),
    caseSheetSchemaId: 'pathological',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search rubrics aligned with pathology stage and organ affinity…',
      defaultRubricWeight: 2
    },
    prescription: {}
  },
  {
    slug: 'sehgal-method',
    methodNormalizedLabel: 'sehgal method',
    title: 'Sehgal Method',
    developedBy: 'M L Sehgal',
    shortDescription: 'Focuses on emotional disturbance as a key driver in remedy selection.',
    focus: 'Emotion-rooted interpretation of disease expression.',
    bestFor: ['Emotionally triggered symptoms', 'Mind-body overlap cases'],
    processSteps: [
      'Identify key emotional disturbance',
      'Trace symptom linkage',
      'Select remedy on emotional core',
      'Monitor shifts'
    ],
    strengths: ['Clear emotional focus', 'Helpful in psychosomatic patterns'],
    limits: ['Requires careful psychological interpretation'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildSehgalWorkflow(),
    caseSheetSchemaId: 'sehgal',
    repertory: {
      enabled: true,
      searchPlaceholder: 'Search mind/emotion rubrics linked to the emotional core…',
      defaultRubricWeight: 3,
      chapterBoosts: [{ chapterMatch: 'mind', multiplier: 1.4, defaultWeight: 3 }]
    },
    prescription: {}
  },
  {
    slug: 'integrative-follow-up',
    methodNormalizedLabel: 'integrative follow-up approach',
    title: 'Integrative Follow-up Approach',
    shortDescription:
      'Combines homeopathy with monitoring, safety flags, and referral logic for chronic digital care.',
    focus: 'Outcome tracking, safety screening, and tele-consultation continuity.',
    bestFor: [
      'Comorbid chronic patients',
      'Telemedicine follow-up',
      'Cases needing periodic reports'
    ],
    processSteps: [
      'Establish baseline symptoms and metrics',
      'Begin individualized homeopathy plan',
      'Track objective and subjective markers',
      'Use red flags for referral when needed'
    ],
    strengths: ['Better safety in digital chronic care', 'Improves accountability with follow-up'],
    limits: ['Needs consistent patient data input', 'Requires referral network'],
    workflowKind: 'HYBRID',
    steps: buildIntegrativeFollowUpWorkflow(),
    caseSheetSchemaId: 'integrative-follow-up',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {
      adviceTemplate:
        'Continue homeopathic plan with documented follow-up metrics and safety review.'
    }
  },
  {
    slug: 'fibonacci-potency-method',
    methodNormalizedLabel: 'fibonacci potency method',
    title: 'Fibonacci Potency Method',
    shortDescription: 'Uses Fibonacci potency sequencing with structured response checkpoints.',
    focus: 'Potency ladder planning and dose-interval control.',
    bestFor: ['Sensitive patients', 'Gradual chronic escalation', 'Follow-up-driven dosing'],
    processSteps: [
      'Establish baseline',
      'Select simillimum',
      'Plan Fibonacci ladder',
      'Monitor checkpoints',
      'Adjust'
    ],
    strengths: ['Structured potency progression', 'Clear follow-up cadence'],
    limits: ['Requires disciplined tracking'],
    workflowKind: 'REPERTORY_TOTALITY',
    steps: buildFibonacciWorkflow(),
    caseSheetSchemaId: 'fibonacci',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {
      potencyGuidance: 'Document Fibonacci sequence and interval before prescribing.'
    }
  },
  {
    slug: 'tautopathy-isopathy',
    methodNormalizedLabel: 'tautopathy isopathy',
    title: 'Tautopathy / Isopathy',
    shortDescription:
      'Prescribing based on causal substance or isopathic relationship to disease agent.',
    focus: 'Causal clearing and tautopathic remedy selection.',
    bestFor: ['Drug/vaccine reactions', 'Toxic exposure', 'Iatrogenic layers'],
    processSteps: [
      'Identify causal agent',
      'Map exposure timeline',
      'Select tautopathic potency',
      'Track clearing'
    ],
    strengths: ['Useful for iatrogenic cases', 'Clear causal framework'],
    limits: ['Needs accurate exposure history'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildTautopathyWorkflow(),
    caseSheetSchemaId: 'tautopathy',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: { potencyGuidance: 'Start conservatively; document clearing response.' }
  },
  {
    slug: 'eizayaga-layers',
    methodNormalizedLabel: 'eizayaga layers of health',
    title: 'Eizayaga Layers of Health',
    developedBy: 'Francisco Eizayaga',
    shortDescription:
      'Layered prescribing across lesion, functional, constitutional, and fundamental levels.',
    focus: 'Sequential layer-wise remedy planning.',
    bestFor: ['Deep chronic disease', 'Multi-layer pathology', 'Structured long-term care'],
    processSteps: [
      'Map lesion layer',
      'Assess functional layer',
      'Integrate constitution',
      'Plan fundamental layer'
    ],
    strengths: ['Explains complex chronic progression'],
    limits: ['Training-intensive'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildEizayagaWorkflow(),
    caseSheetSchemaId: 'eizayaga',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'vithoulkas-essences',
    methodNormalizedLabel: 'vithoulkas essences',
    title: 'Vithoulkas Essences',
    developedBy: 'George Vithoulkas',
    shortDescription:
      'Essence themes, level of health, and defense mechanisms in remedy selection.',
    focus: 'Essence-level understanding of the patient.',
    bestFor: ['Complex essences', 'Level-of-health assessment', 'Advanced chronic work'],
    processSteps: [
      'Identify essence theme',
      'Assess level of health',
      'Map defense',
      'Select essence-matched remedy'
    ],
    strengths: ['Deep constitutional insight'],
    limits: ['Requires advanced training'],
    workflowKind: 'STRUCTURED_CASE',
    steps: buildVithoulkasWorkflow(),
    caseSheetSchemaId: 'vithoulkas',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'drainage-organ-support',
    methodNormalizedLabel: 'drainage organ support',
    title: 'Drainage & Organ Support',
    shortDescription: 'Plans drainage and organ-support remedies alongside the simillimum.',
    focus: 'Detoxification and organ support sequencing.',
    bestFor: ['Heavy toxicity', 'Organ impairment', 'Complex polypharmacy history'],
    processSteps: [
      'Identify target organs',
      'Select drainage remedies',
      'Sequence with simillimum',
      'Monitor'
    ],
    strengths: ['Supports difficult chronic cases'],
    limits: ['Can complicate case if overused'],
    workflowKind: 'HYBRID',
    steps: buildDrainageWorkflow(),
    caseSheetSchemaId: 'drainage',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {
      adviceTemplate: 'Document drainage/support remedies separately from simillimum.'
    }
  },
  {
    slug: 'hering-law-tracker',
    methodNormalizedLabel: 'hering law tracker',
    title: "Hering's Law Tracker",
    shortDescription:
      'Follow-up approach centered on direction of cure and aggravation monitoring.',
    focus: "Hering's law and post-prescription aggravation tracking.",
    bestFor: ['Follow-up visits', 'Potency decisions', 'Teaching clinics'],
    processSteps: [
      'Record baseline',
      'Prescribe',
      'Track aggravation',
      'Assess direction of cure',
      'Adjust'
    ],
    strengths: ['Improves follow-up quality', 'Reduces premature remedy changes'],
    limits: ['Depends on consistent follow-up data'],
    workflowKind: 'HYBRID',
    steps: buildHeringWorkflow(),
    caseSheetSchemaId: 'hering',
    repertory: { enabled: true, defaultRubricWeight: 2 },
    prescription: {}
  },
  {
    slug: 'acute-fast-track',
    methodNormalizedLabel: 'acute fast track prescribing',
    title: 'Acute Fast-Track Prescribing',
    shortDescription: 'Minimal-step acute workflow for high-volume front-desk and tele-OPD.',
    focus: 'Speed without skipping essential acute clues.',
    bestFor: ['Acute OPD', 'Tele-triage', 'Walk-in clinics'],
    processSteps: [
      'Capture acute complaint',
      'Select key rubrics',
      'Choose remedy',
      'Plan potency'
    ],
    strengths: ['Very fast', 'Low cognitive load'],
    limits: ['Not for deep chronic first visits'],
    workflowKind: 'PATHOLOGY_CLINICAL',
    steps: buildAcuteFastTrackWorkflow(),
    caseSheetSchemaId: 'acute-fast',
    repertory: { enabled: true, defaultRubricWeight: 3 },
    prescription: {
      potencyGuidance: 'Favor moderate potency with clear repetition rules in acute cases.'
    }
  },
  {
    slug: 'combination-remedy-mode',
    methodNormalizedLabel: 'combination remedy mode',
    title: 'Combination / Complex Remedy Mode',
    shortDescription:
      'Structured use of complex or combination remedies with documented indication match.',
    focus: 'Complex remedy selection and personalization.',
    bestFor: ['Protocol-heavy clinics', 'Junior prescribers', 'Standardized formulae'],
    processSteps: ['Select combination', 'Match indications', 'Personalize', 'Prescribe', 'Review'],
    strengths: ['Operational consistency'],
    limits: ['Less individualized than classical'],
    workflowKind: 'PROTOCOL_DRIVEN',
    steps: buildCombinationWorkflow(),
    caseSheetSchemaId: 'combination',
    repertory: { enabled: false },
    prescription: {
      skipRepertory: true,
      adviceTemplate: 'Document combination rationale and duration.'
    }
  }
];

export const DEFAULT_APPROACH = APPROACH_DEFINITIONS[0];
