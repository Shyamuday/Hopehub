import type { ApproachDataPayload, ApproachStepComponent, ApproachFieldDef } from './types';
import { approachField } from './approach-field-helpers';

export type StructuredPanelFieldDef = ApproachFieldDef;
export type StructuredPanelLayer = 'capture' | 'clarify' | 'extract';

export type ApproachStructuredPanelSectionDef = {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  fieldKeys: string[];
  layerHints?: Partial<Record<StructuredPanelLayer, string>>;
};

export type ApproachStructuredPanelDef = {
  title: string;
  hint: string;
  fields: StructuredPanelFieldDef[];
  sections?: ApproachStructuredPanelSectionDef[];
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

const CONSTITUTION_OPTIONS = [
  {
    title: 'Build',
    options: [
      'lean',
      'stout',
      'flabby',
      'muscular',
      'emaciated',
      'obese',
      'tall thin',
      'short stocky'
    ]
  },
  {
    title: 'Vitality',
    options: [
      'high vitality',
      'low vitality',
      'tires easily',
      'morning low',
      'evening low',
      'post-illness weakness'
    ]
  },
  {
    title: 'Temperament',
    options: [
      'anxious',
      'hurried',
      'reserved',
      'sensitive',
      'irritable',
      'yielding',
      'obstinate',
      'perfectionist'
    ]
  }
];

const LSMC_OPTIONS = [
  {
    title: 'Location',
    options: [
      'right-sided',
      'left-sided',
      'alternating sides',
      'radiating',
      'localized',
      'shifting',
      'deep',
      'superficial'
    ]
  },
  {
    title: 'Sensation',
    options: [
      'burning',
      'stitching',
      'throbbing',
      'pressing',
      'cramping',
      'cutting',
      'numbness',
      'heaviness'
    ]
  },
  {
    title: 'Modalities',
    options: [
      'worse morning',
      'worse evening',
      'worse night',
      'worse heat',
      'worse cold',
      'better rest',
      'better motion',
      'better pressure'
    ]
  },
  {
    title: 'Concomitants',
    options: ['nausea', 'sweat', 'chill', 'anxiety', 'vertigo', 'weakness', 'thirst', 'urination']
  }
];

const CAUSATION_OPTIONS = [
  {
    title: 'Causation',
    options: [
      'after grief',
      'after fright',
      'after anger',
      'after humiliation',
      'after injury',
      'after infection',
      'after exposure',
      'after suppression'
    ]
  },
  {
    title: 'Course',
    options: [
      'sudden onset',
      'gradual onset',
      'progressive',
      'periodic',
      'relapsing',
      'alternating complaints',
      'one-sided',
      'metastatic shift'
    ]
  },
  {
    title: 'Maintaining',
    options: [
      'stress',
      'poor sleep',
      'diet trigger',
      'sedentary',
      'overwork',
      'current medication',
      'hormonal factor',
      'environmental exposure'
    ]
  }
];

const MIASM_OPTIONS = [
  {
    title: 'Miasm',
    options: [
      'psoric',
      'sycotic',
      'syphilitic',
      'tubercular',
      'cancerinic',
      'mixed miasm',
      'suppressed eruption',
      'drug layer'
    ]
  },
  {
    title: 'Family Load',
    options: [
      'diabetes',
      'hypertension',
      'asthma',
      'TB',
      'cancer',
      'autoimmune',
      'mental illness',
      'skin disease'
    ]
  },
  {
    title: 'Suppression',
    options: [
      'steroids',
      'antibiotics repeated',
      'hormonal pills',
      'surgery',
      'topical ointments',
      'vaccination layer',
      'painkiller overuse'
    ]
  }
];

const MIND_OPTIONS = [
  {
    title: 'Fears',
    options: [
      'fear of death',
      'fear of disease',
      'fear of alone',
      'fear of dark',
      'fear of failure',
      'fear of poverty',
      'anticipatory anxiety'
    ]
  },
  {
    title: 'Reactions',
    options: [
      'anger suppressed',
      'anger explosive',
      'weeps easily',
      'consolation better',
      'consolation worse',
      'jealousy',
      'guilt',
      'humiliation'
    ]
  },
  {
    title: 'State',
    options: [
      'hurried',
      'indecisive',
      'perfectionist',
      'responsibility heavy',
      'suspicious',
      'sensitive to criticism',
      'desires company',
      'aversion company'
    ]
  }
];

const GENERAL_OPTIONS = [
  {
    title: 'Thermal',
    options: [
      'chilly',
      'hot patient',
      'cold hands/feet',
      'heat in palms/soles',
      'worse sun',
      'worse damp',
      'worse cold wind',
      'better warmth'
    ]
  },
  {
    title: 'Food',
    options: [
      'thirstless',
      'large thirst',
      'desire sweets',
      'desire salt',
      'desire sour',
      'desire spicy',
      'aversion milk',
      'aggravation fatty food'
    ]
  },
  {
    title: 'Sleep/Sweat',
    options: [
      'sleepless before midnight',
      'wakes 3 am',
      'unrefreshing sleep',
      'profuse sweat',
      'night sweat',
      'offensive sweat',
      'dreams vivid'
    ]
  }
];

const PARTICULAR_OPTIONS = [
  {
    title: 'Systems',
    options: [
      'head',
      'ENT',
      'respiratory',
      'cardiac',
      'gastric',
      'urinary',
      'skin',
      'joints',
      'neuro',
      'female'
    ]
  },
  {
    title: 'Objective',
    options: [
      'swelling',
      'redness',
      'discharge',
      'ulceration',
      'crack',
      'eruption',
      'stiffness',
      'tremor',
      'fever',
      'weight change'
    ]
  },
  {
    title: 'Pattern',
    options: [
      'periodic',
      'seasonal',
      'right to left',
      'left to right',
      'ascending',
      'descending',
      'alternating',
      'recurring same time'
    ]
  }
];

const PLAN_OPTIONS = [
  {
    title: 'Safety',
    options: [
      'red flag absent',
      'red flag present',
      'needs lab',
      'needs imaging',
      'refer urgently',
      'co-management needed',
      'monitor vitals'
    ]
  },
  {
    title: 'Strategy',
    options: [
      'constitutional remedy',
      'acute remedy',
      'intercurrent',
      'drainage support',
      'LM potency',
      'single dose',
      'watch and wait',
      'follow-up in 7 days'
    ]
  },
  {
    title: 'Hierarchy',
    options: [
      'mental generals lead',
      'physical generals lead',
      'particulars lead',
      'pathology lead',
      'miasm lead',
      'keynote lead',
      'low vitality caution'
    ]
  }
];

const EIGHT_BOX_GUIDED_FIELDS = fields(
  approachField('patientConstitution', 'Raw constitution notes', {
    rows: 4,
    wide: true,
    required: true,
    captureLayer: 'capture',
    description:
      'Patient identity, build, baseline vitality, temperament, occupation, daily rhythm, and first impression.',
    placeholder:
      'Age/sex, occupation, build, posture, complexion, pace, vitality, thermal tendency, temperament, patient language…',
    promptKey: 'eightBox.patientConstitution',
    optionGroups: CONSTITUTION_OPTIONS,
    extractFrom: ['intake']
  }),
  approachField('patientConstitutionClarify', 'Constitution details to clarify', {
    rows: 4,
    wide: true,
    captureLayer: 'clarify',
    description: 'Complete the constitutional frame before interpreting symptoms.',
    placeholder:
      'Build: lean/stout/flabby/muscular. Energy: morning/evening, fatigue pattern. Thermal: chilly/hot/both. Sensitivity: noise/light/touch/weather. Temperament: reserved, hurried, anxious, yielding, obstinate…',
    promptKey: 'eightBox.patientConstitution.clarify',
    optionGroups: [...CONSTITUTION_OPTIONS, ...GENERAL_OPTIONS.slice(0, 1)]
  }),
  approachField('patientConstitutionExtract', 'Constitution summary & clinical weight', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Distil what should influence remedy selection.',
    placeholder:
      'Stable constitutional generals, reliability, peculiar observations, vitality level, susceptibility, likely remedy families or kingdoms if evident…',
    rubricSearchable: true,
    promptKey: 'eightBox.patientConstitution.extract',
    optionGroups: [...CONSTITUTION_OPTIONS, ...PLAN_OPTIONS.slice(2)]
  }),

  approachField('chiefComplaints', 'Chief complaint in patient words', {
    rows: 4,
    wide: true,
    required: true,
    captureLayer: 'capture',
    description: 'Capture every main complaint exactly as the patient presents it.',
    placeholder:
      'Complaint, onset, duration, patient words, current severity, what worries them most, associated diagnosis if known…',
    rubricSearchable: true,
    promptKey: 'eightBox.chiefComplaints',
    suggestEndpoint: 'ai-extract-intake',
    optionGroups: LSMC_OPTIONS,
    extractFrom: ['intake']
  }),
  approachField('chiefComplaintsClarify', 'Location, sensation, modality, concomitant', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Boenninghausen-style completion of each main complaint.',
    placeholder:
      'For each complaint: location, extension, sensation, onset, causation, duration, periodicity, intensity, better/worse, position, weather, food, rest/motion, time, concomitants, red flags…',
    rubricSearchable: true,
    promptKey: 'eightBox.chiefComplaints.clarify',
    optionGroups: [...LSMC_OPTIONS, ...CAUSATION_OPTIONS.slice(0, 2)]
  }),
  approachField('chiefComplaintsExtract', 'Chief complaint rubrics & anchors', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Convert the complaint into prescribing anchors.',
    placeholder:
      'Top rubrics, characteristic modalities, concomitants, strange/rare/peculiar symptoms, pathology anchors, symptoms to verify in repertory…',
    rubricSearchable: true,
    suggestEndpoint: 'ai-complete',
    promptKey: 'eightBox.chiefComplaints.extract',
    optionGroups: [...LSMC_OPTIONS, ...PLAN_OPTIONS.slice(2)]
  }),

  approachField('presentIllness', 'Timeline of present illness', {
    rows: 4,
    wide: true,
    captureLayer: 'capture',
    description: 'How the present illness began and unfolded.',
    placeholder:
      'First onset, exact sequence, acute episodes, relapses, seasonal pattern, current treatment, investigations, diagnosis timeline…',
    promptKey: 'eightBox.presentIllness',
    optionGroups: CAUSATION_OPTIONS
  }),
  approachField('presentIllnessClarify', 'Causation, progression & maintaining factors', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Identify the maintaining cause and clinical layer.',
    placeholder:
      'Causation: grief, fright, anger, injury, infection, exposure, suppression, drugs, hormones, vaccination, lifestyle, sleep, diet, stress. Course: improving/worsening, periodicity, alternations, one-sidedness…',
    promptKey: 'eightBox.presentIllness.clarify',
    optionGroups: [...CAUSATION_OPTIONS, ...MIASM_OPTIONS.slice(2)]
  }),
  approachField('presentIllnessExtract', 'Illness layer & prescribing implications', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Summarize the clinical layer to treat first.',
    placeholder:
      'Acute/chronic layer, maintaining cause, obstacle to cure, suppression history, pathological depth, investigation gaps, first target for prescription…',
    rubricSearchable: true,
    promptKey: 'eightBox.presentIllness.extract',
    optionGroups: [...CAUSATION_OPTIONS, ...PLAN_OPTIONS]
  }),

  approachField('pastFamilyHistory', 'Past, family & treatment history', {
    rows: 4,
    wide: true,
    captureLayer: 'capture',
    description: 'Collect personal disease history, family tendencies, and treatment exposures.',
    placeholder:
      'Childhood illness, recurrent infections, allergies, skin eruptions, surgery, steroids, antibiotics, family TB/diabetes/cancer/autoimmune/mental illness…',
    promptKey: 'eightBox.pastFamilyHistory',
    optionGroups: MIASM_OPTIONS,
    extractFrom: ['intake']
  }),
  approachField('pastFamilyHistoryClarify', 'Miasmatic and suppression clues', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Look for inherited tendency and suppressed disease expression.',
    placeholder:
      'Psora: itch/allergy/functional. Sycosis: warts, overgrowth, recurrent catarrh, PCOS. Syphilis: ulceration, destruction, degeneration. Tubercular: changeability, recurrent respiratory, restlessness. Cancerinic: control, perfectionism, family malignancy…',
    promptKey: 'eightBox.pastFamilyHistory.clarify',
    optionGroups: MIASM_OPTIONS
  }),
  approachField('pastFamilyHistoryExtract', 'Miasmatic load & obstacles', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Distil inherited and acquired loads relevant to remedy selection.',
    placeholder:
      'Dominant miasm, family tendency, suppressed layer, iatrogenic factors, obstacles to cure, need for intercurrent or drainage support…',
    rubricSearchable: true,
    promptKey: 'eightBox.pastFamilyHistory.extract',
    optionGroups: [...MIASM_OPTIONS, ...PLAN_OPTIONS.slice(1)]
  }),

  approachField('mentalEmotional', 'Mental and emotional story', {
    rows: 4,
    wide: true,
    required: true,
    captureLayer: 'capture',
    description:
      'Record temperament, emotions, fears, stress response, relationships, and patient language.',
    placeholder:
      'Mood, fears, anger, grief, anxiety, confidence, work stress, family dynamics, loneliness, consolation, company/aversion…',
    rubricSearchable: true,
    promptKey: 'eightBox.mentalEmotional',
    suggestEndpoint: 'ai-extract-intake',
    optionGroups: MIND_OPTIONS,
    extractFrom: ['intake', 'chat']
  }),
  approachField('mentalEmotionalClarify', 'Mental generals, dreams & reactivity', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Elicit the individual emotional pattern, not only diagnosis labels.',
    placeholder:
      'Fears, delusions, jealousy, guilt, humiliation, anger style, weeping, consolation, company, responsibility, control, hurry, indecision, sensitivity, dreams, sleep emotion, trauma, coping, addictions…',
    rubricSearchable: true,
    promptKey: 'eightBox.mentalEmotional.clarify',
    optionGroups: MIND_OPTIONS
  }),
  approachField('mentalEmotionalExtract', 'Mental rubrics & essence', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Capture the most prescribing-grade mental symptoms.',
    placeholder:
      'Highest-value mental rubrics, essence/theme, compensated/decompensated state, peculiar emotional modalities, confirming questions, remedies to compare…',
    rubricSearchable: true,
    suggestEndpoint: 'ai-complete',
    promptKey: 'eightBox.mentalEmotional.extract',
    optionGroups: [...MIND_OPTIONS, ...PLAN_OPTIONS.slice(2)]
  }),

  approachField('physicalGenerals', 'Physical generals', {
    rows: 4,
    wide: true,
    required: true,
    captureLayer: 'capture',
    description: 'Capture the patient-wide general symptoms.',
    placeholder:
      'Thermal, appetite, thirst, cravings, aversions, sleep, sweat, stool, urine, menses, libido, energy, weather, bathing, clothing…',
    rubricSearchable: true,
    promptKey: 'eightBox.physicalGenerals',
    optionGroups: GENERAL_OPTIONS
  }),
  approachField('physicalGeneralsClarify', 'General modalities and systems review', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Clarify general symptoms with modalities and reliability.',
    placeholder:
      'Thermal: chilly/hot/local heat/cold. Thirst: quantity/frequency. Food: desire/aversion/aggravation. Sleep: position, dreams, waking. Sweat: part/odor/stain. Stool/urine. Female generals. Weather, season, sea, sun, exertion…',
    rubricSearchable: true,
    promptKey: 'eightBox.physicalGenerals.clarify',
    optionGroups: GENERAL_OPTIONS
  }),
  approachField('physicalGeneralsExtract', 'General rubrics & ranking', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Rank generals by stability and prescribing value.',
    placeholder:
      'Top generals, contradictory generals, high-confidence rubrics, low-confidence rubrics, modalities that confirm or exclude remedies…',
    rubricSearchable: true,
    suggestEndpoint: 'ai-complete',
    promptKey: 'eightBox.physicalGenerals.extract',
    optionGroups: [...GENERAL_OPTIONS, ...PLAN_OPTIONS.slice(2)]
  }),

  approachField('particulars', 'Particular/local symptoms', {
    rows: 4,
    wide: true,
    captureLayer: 'capture',
    description: 'Capture local symptoms by organ/system.',
    placeholder:
      'Head, eyes, ENT, chest, abdomen, urinary, skin, joints, neuro, endocrine, female/male, side, extension, objective signs…',
    rubricSearchable: true,
    promptKey: 'eightBox.particulars',
    optionGroups: [...PARTICULAR_OPTIONS, ...LSMC_OPTIONS.slice(0, 2)]
  }),
  approachField('particularsClarify', 'Complete each particular symptom', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Turn local complaints into complete symptoms.',
    placeholder:
      'For each local symptom: location, side, sensation, onset, duration, periodicity, causation, better/worse, concomitant, discharge/color/odor, objective finding, investigation correlation…',
    rubricSearchable: true,
    promptKey: 'eightBox.particulars.clarify',
    optionGroups: [...PARTICULAR_OPTIONS, ...LSMC_OPTIONS]
  }),
  approachField('particularsExtract', 'Characteristic particulars & SRP symptoms', {
    rows: 4,
    wide: true,
    captureLayer: 'extract',
    description: 'Select the local symptoms that deserve repertory weight.',
    placeholder:
      'Peculiar particulars, SRP symptoms, objective signs, pathology-specific rubrics, symptoms not useful for repertory, follow-up markers…',
    rubricSearchable: true,
    suggestEndpoint: 'ai-complete',
    promptKey: 'eightBox.particulars.extract',
    optionGroups: [...PARTICULAR_OPTIONS, ...PLAN_OPTIONS.slice(2)]
  }),

  approachField('diagnosisPlan', 'Diagnosis, totality and plan', {
    rows: 4,
    wide: true,
    captureLayer: 'capture',
    description: 'Record diagnosis, investigations, risk, and provisional direction.',
    placeholder:
      'Working diagnosis, differential, investigations, red flags, current medicines, clinical priorities, patient goals…',
    promptKey: 'eightBox.diagnosisPlan',
    optionGroups: PLAN_OPTIONS
  }),
  approachField('diagnosisPlanClarify', 'Safety, hierarchy and strategy', {
    rows: 5,
    wide: true,
    captureLayer: 'clarify',
    description: 'Confirm what must be treated, referred, monitored, or excluded.',
    placeholder:
      'Red flags, referral needs, lab/imaging needs, remedy hierarchy: mental vs generals vs particulars, acute vs chronic, pathology depth, obstacles, patient sensitivity, potency risk…',
    promptKey: 'eightBox.diagnosisPlan.clarify',
    optionGroups: [...PLAN_OPTIONS, ...MIASM_OPTIONS.slice(0, 1)]
  }),
  approachField('diagnosisPlanExtract', 'Final totality & prescription handoff', {
    rows: 5,
    wide: true,
    captureLayer: 'extract',
    description: 'Create the final pre-repertory synthesis.',
    placeholder:
      'Final totality, must-have rubrics, remedy shortlist, potency logic, repetition plan, accessory measures, follow-up markers, what would change prescription, next visit questions…',
    rubricSearchable: true,
    suggestEndpoint: 'ai-complete',
    promptKey: 'eightBox.diagnosisPlan.extract',
    optionGroups: [...PLAN_OPTIONS, ...MIND_OPTIONS.slice(0, 1), ...GENERAL_OPTIONS.slice(0, 1)]
  })
);

const EIGHT_BOX_GUIDED_SECTIONS: ApproachStructuredPanelSectionDef[] = [
  {
    id: 'constitution',
    title: 'Patient identity & constitution',
    shortLabel: 'Constitution',
    description: 'Establish who the patient is before interpreting disease.',
    fieldKeys: ['patientConstitution', 'patientConstitutionClarify', 'patientConstitutionExtract'],
    layerHints: {
      capture: 'Capture first impression and baseline constitution without forcing interpretation.',
      clarify: 'Ask the missing constitutional questions that make the case individual.',
      extract: 'Distil stable constitutional symptoms and their prescribing weight.'
    }
  },
  {
    id: 'chief-complaints',
    title: 'Chief complaints',
    shortLabel: 'Complaint',
    description: 'Complete the main complaint into usable homeopathic symptoms.',
    fieldKeys: ['chiefComplaints', 'chiefComplaintsClarify', 'chiefComplaintsExtract'],
    layerHints: {
      capture: 'Record the complaint in the patient’s words.',
      clarify: 'Complete location, sensation, modality, concomitant, causation and time.',
      extract: 'Select rubrics and anchors that should drive repertorization.'
    }
  },
  {
    id: 'present-illness',
    title: 'Present illness',
    shortLabel: 'Timeline',
    description: 'Understand causation, progression, and active disease layer.',
    fieldKeys: ['presentIllness', 'presentIllnessClarify', 'presentIllnessExtract'],
    layerHints: {
      capture: 'Build the illness timeline from first onset to today.',
      clarify: 'Identify maintaining causes, suppressions, and active layer.',
      extract: 'Define what must be treated first and what may block cure.'
    }
  },
  {
    id: 'past-family',
    title: 'Past & family history',
    shortLabel: 'History',
    description: 'Expose inherited tendency, suppressions, and obstacles.',
    fieldKeys: ['pastFamilyHistory', 'pastFamilyHistoryClarify', 'pastFamilyHistoryExtract'],
    layerHints: {
      capture: 'Collect personal, family, and treatment history.',
      clarify: 'Look for miasmatic patterns and iatrogenic/suppression clues.',
      extract: 'Summarize miasmatic load, inherited tendency, and obstacles.'
    }
  },
  {
    id: 'mental-emotional',
    title: 'Mental / emotional',
    shortLabel: 'Mind',
    description: 'Find the patient’s individual emotional pattern.',
    fieldKeys: ['mentalEmotional', 'mentalEmotionalClarify', 'mentalEmotionalExtract'],
    layerHints: {
      capture:
        'Listen for patient language, fears, stress response, relationships and temperament.',
      clarify: 'Explore mental generals, dreams, compensation, trauma and reactivity.',
      extract: 'Choose the mental rubrics and core theme worth repertory weight.'
    }
  },
  {
    id: 'physical-generals',
    title: 'Physical generals',
    shortLabel: 'Generals',
    description: 'Capture symptoms that belong to the whole patient.',
    fieldKeys: ['physicalGenerals', 'physicalGeneralsClarify', 'physicalGeneralsExtract'],
    layerHints: {
      capture:
        'Record thermal, appetite, thirst, sleep, sweat, stool, urine and general modalities.',
      clarify: 'Make each general precise and check reliability.',
      extract: 'Rank stable generals and mark contradictory or low-confidence data.'
    }
  },
  {
    id: 'particulars',
    title: 'Particular symptoms',
    shortLabel: 'Particulars',
    description: 'Complete local symptoms by organ/system.',
    fieldKeys: ['particulars', 'particularsClarify', 'particularsExtract'],
    layerHints: {
      capture: 'List local symptoms, objective signs, systems, sides and extensions.',
      clarify: 'Complete each particular with location, sensation, modality and concomitant.',
      extract: 'Select peculiar particulars, SRP symptoms and pathology anchors.'
    }
  },
  {
    id: 'diagnosis-plan',
    title: 'Diagnosis & plan',
    shortLabel: 'Plan',
    description: 'Convert the full case into totality, safety plan and prescription direction.',
    fieldKeys: ['diagnosisPlan', 'diagnosisPlanClarify', 'diagnosisPlanExtract'],
    layerHints: {
      capture: 'Record diagnosis, investigations, red flags and current clinical plan.',
      clarify: 'Check safety, hierarchy, pathology depth and remedy strategy.',
      extract: 'Create final totality, remedy shortlist, potency logic and follow-up markers.'
    }
  }
];

export const STRUCTURED_APPROACH_PANELS: Record<
  ApproachStepComponent,
  StructuredPanelBinding | undefined
> = {
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
        approachField('location', 'Location', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Anatomical site, laterality, radiation.',
          placeholder: 'Site, side, radiation…',
          rubricSearchable: true,
          promptKey: 'boenninghausen.location'
        }),
        approachField('sensation', 'Sensation', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Quality of the symptom (LSM framework).',
          placeholder: 'Burning, stitching, numbness…',
          rubricSearchable: true,
          promptKey: 'boenninghausen.sensation'
        }),
        approachField('modalities', 'Modalities (better / worse)', {
          rows: 3,
          wide: true,
          description: 'What ameliorates or aggravates the symptom.',
          placeholder: 'Better rest / worse motion…',
          rubricSearchable: true,
          promptKey: 'boenninghausen.modalities'
        }),
        approachField('concomitants', 'Concomitants', {
          rows: 2,
          wide: true,
          description: 'Symptoms accompanying the main complaint.',
          placeholder: 'Thirst with fever, nausea with pain…',
          rubricSearchable: true,
          promptKey: 'boenninghausen.concomitants'
        }),
        approachField('timeAggravation', 'Time aggravation', {
          rows: 2,
          description: 'Periodic or clock-time patterns.',
          placeholder: '3 a.m. waking, every 14 days…',
          promptKey: 'boenninghausen.timeAggravation'
        })
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
        approachField('pathologicalTotality', 'Pathological totality', {
          rows: 4,
          wide: true,
          required: true,
          description: 'Pathological generals that define the case.',
          placeholder: 'Chronic inflammation, periodicity, tissue affinity…',
          rubricSearchable: true,
          promptKey: 'boger.pathologicalTotality'
        }),
        approachField('timePatterns', 'Time patterns', {
          rows: 2,
          wide: true,
          description: 'Clock-time, seasonal, or periodic aggravations.',
          placeholder: 'Worse 2–4 a.m., every spring…',
          promptKey: 'boger.timePatterns'
        }),
        approachField('concomitants', 'Concomitants', {
          rows: 2,
          wide: true,
          description: 'Associated symptoms in Boger’s concomitant sense.',
          placeholder: 'Thirst with chill, restlessness with pain…',
          rubricSearchable: true,
          promptKey: 'boger.concomitants'
        }),
        approachField('clinicalCorrelation', 'Clinical / investigation correlation', {
          rows: 3,
          wide: true,
          description: 'Objective findings supporting pathological totality.',
          placeholder: 'Labs, imaging, physical exam…',
          promptKey: 'boger.clinicalCorrelation',
          extractFrom: ['intake', 'media']
        })
      ),
      requiredKeys: ['pathologicalTotality']
    }
  },
  'constitutional-profile': {
    dataKey: 'constitutionalProfile',
    def: {
      title: 'Constitutional profile',
      hint: 'Map temperament, thermal state, and generals before particulars.',
      fields: fields(
        approachField('temperament', 'Temperament & constitution', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Innate constitution and reactive style.',
          placeholder: 'Sanguine, phlegmatic, lean, stout…',
          promptKey: 'constitutional.temperament'
        }),
        approachField('thermalState', 'Thermal preference', {
          rows: 2,
          required: true,
          description: 'Heat/cold tolerance and weather sensitivity.',
          placeholder: 'Chilly, wants covers, worse summer…',
          rubricSearchable: true,
          promptKey: 'constitutional.thermalState'
        }),
        approachField('appetiteThirst', 'Appetite & thirst', {
          rows: 2,
          description: 'Hunger patterns, cravings, aversions, thirst.',
          placeholder: 'Loss of appetite, desires sweets, thirstless…',
          rubricSearchable: true,
          promptKey: 'constitutional.appetiteThirst'
        }),
        approachField('sleepDreams', 'Sleep & dreams', {
          rows: 2,
          wide: true,
          description: 'Sleep quality, position, dreams, nightmares.',
          placeholder: 'Sleepless after 3 a.m., vivid dreams of water…',
          rubricSearchable: true,
          promptKey: 'constitutional.sleepDreams'
        }),
        approachField('mentalPicture', 'Mental picture', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Core mental/emotional portrait of the patient.',
          placeholder: 'Timid, conscientious, fear of poverty…',
          rubricSearchable: true,
          promptKey: 'constitutional.mentalPicture',
          suggestEndpoint: 'ai-extract-intake',
          extractFrom: ['intake', 'chat']
        })
      ),
      requiredKeys: ['temperament', 'thermalState', 'mentalPicture']
    }
  },
  'clinical-acute': {
    dataKey: 'clinicalAcute',
    def: {
      title: 'Acute clinical snapshot',
      hint: 'Fast OPD capture: diagnosis context, key symptoms, and organ affinity.',
      fields: fields(
        approachField('acutePresentation', 'Acute presentation', {
          rows: 2,
          wide: true,
          required: true,
          description: 'How the acute illness presents right now.',
          placeholder: 'Sudden high fever with chill and body ache…',
          rubricSearchable: true,
          promptKey: 'clinical.acutePresentation',
          suggestEndpoint: 'ai-extract-intake',
          extractFrom: ['intake']
        }),
        approachField('clinicalDiagnosis', 'Working clinical diagnosis', {
          rows: 2,
          description: 'Provisional or confirmed diagnosis.',
          placeholder: 'Viral fever / URTI / gastritis…',
          promptKey: 'clinical.clinicalDiagnosis'
        }),
        approachField('keyPrescribingSymptoms', 'Key prescribing symptoms', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Symptoms that will drive remedy choice.',
          placeholder: 'Restlessness, thirst, profuse sweat…',
          rubricSearchable: true,
          promptKey: 'clinical.keyPrescribingSymptoms',
          suggestEndpoint: 'ai-complete'
        }),
        approachField('organAffinity', 'Organ affinity', {
          rows: 2,
          description: 'Primary organ or system involved.',
          placeholder: 'Respiratory, GI, musculoskeletal…',
          rubricSearchable: true,
          promptKey: 'clinical.organAffinity'
        }),
        approachField('urgencyNotes', 'Urgency / red flags', {
          rows: 2,
          wide: true,
          description: 'Safety concerns or referral triggers.',
          placeholder: 'Chest pain, neuro deficit, dehydration…',
          promptKey: 'clinical.urgencyNotes'
        })
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
        approachField('pathologyStage', 'Pathology stage', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Stage and nature of underlying disease process.',
          placeholder: 'Early functional / established structural…',
          promptKey: 'predictive.pathologyStage'
        }),
        approachField('tissueAffinity', 'Tissue / organ affinity', {
          rows: 2,
          wide: true,
          description: 'Primary tissue or organ involved.',
          placeholder: 'Connective tissue, liver, nervous system…',
          rubricSearchable: true,
          promptKey: 'predictive.tissueAffinity'
        }),
        approachField('predictedResponse', 'Predicted remedy response', {
          rows: 3,
          wide: true,
          description: 'Expected direction and pace of cure.',
          placeholder: 'Slow structural recovery, quick functional shift…',
          promptKey: 'predictive.predictedResponse'
        }),
        approachField('followUpForecast', 'Follow-up forecast', {
          rows: 3,
          wide: true,
          description: 'What to expect at each follow-up milestone.',
          placeholder: 'Aggravation window 3–7 days, then energy lift…',
          promptKey: 'predictive.followUpForecast'
        }),
        approachField('suppressionHistory', 'Suppression / palliation history', {
          rows: 2,
          wide: true,
          description: 'Prior suppressive treatments affecting prognosis.',
          placeholder: 'Long steroid course, suppressed skin eruptions…',
          promptKey: 'predictive.suppressionHistory',
          extractFrom: ['intake', 'priorCase']
        })
      ),
      requiredKeys: ['pathologyStage']
    }
  },
  'pathological-anchor': {
    dataKey: 'pathologicalAnchor',
    def: {
      title: 'Pathology prescribing anchor',
      hint: 'Anchor remedy selection on pathology stage and correlated objective findings.',
      fields: fields(
        approachField('pathologyStage', 'Pathology stage', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Stage and nature of disease process.',
          placeholder: 'Degenerative joint disease, chronic inflammation…',
          promptKey: 'pathologicalAnchor.pathologyStage'
        }),
        approachField('investigationTrends', 'Investigation trends', {
          rows: 3,
          wide: true,
          description: 'Lab/imaging trends over time.',
          placeholder: 'CRP declining, MRI stable, Hb improving…',
          promptKey: 'pathologicalAnchor.investigationTrends',
          extractFrom: ['intake', 'media']
        }),
        approachField('anchorSymptoms', 'Anchor prescribing symptoms', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Symptoms anchoring remedy to pathology.',
          placeholder: 'Burning pains, night aggravation, restlessness…',
          rubricSearchable: true,
          promptKey: 'pathologicalAnchor.anchorSymptoms',
          suggestEndpoint: 'ai-complete'
        }),
        approachField('differentialPathology', 'Differential pathology notes', {
          rows: 2,
          wide: true,
          description: 'Alternative pathological interpretations considered.',
          placeholder: 'Autoimmune vs degenerative vs infective…',
          promptKey: 'pathologicalAnchor.differentialPathology'
        })
      ),
      requiredKeys: ['pathologyStage', 'anchorSymptoms']
    }
  },
  'eight-box-guided': {
    dataKey: 'eightBoxGuided',
    def: {
      title: '8-box clinical cockpit',
      hint: 'Move through each box with Capture, Clarify, and Extract layers. Use the box map for quick switching and the extracted layer for repertory-ready totality.',
      fields: EIGHT_BOX_GUIDED_FIELDS,
      sections: EIGHT_BOX_GUIDED_SECTIONS,
      requiredKeys: [
        'patientConstitution',
        'chiefComplaints',
        'chiefComplaintsClarify',
        'mentalEmotional',
        'mentalEmotionalExtract',
        'physicalGenerals',
        'physicalGeneralsExtract',
        'diagnosisPlanExtract'
      ]
    }
  },
  'fibonacci-potency': {
    dataKey: 'fibonacciPotency',
    def: {
      title: 'Fibonacci potency plan',
      hint: 'Plan potency ladder, interval, and response checkpoints using Fibonacci sequencing.',
      fields: fields(
        approachField('startingPotency', 'Starting potency', {
          rows: 2,
          required: true,
          description: 'First potency in the Fibonacci ladder.',
          placeholder: '6C, 12C, 30C…',
          promptKey: 'fibonacci.startingPotency'
        }),
        approachField('fibonacciSequence', 'Fibonacci sequence plan', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Planned potency progression following Fibonacci numbers.',
          placeholder: 'e.g. 6C → 10C → 16C → 26C…',
          promptKey: 'fibonacci.fibonacciSequence'
        }),
        approachField('doseInterval', 'Dose interval', {
          rows: 2,
          description: 'Time between potency steps.',
          placeholder: 'Weekly, every 10 days, monthly…',
          promptKey: 'fibonacci.doseInterval'
        }),
        approachField('responseCheckpoints', 'Response checkpoints', {
          rows: 3,
          wide: true,
          description: 'Markers to assess before advancing potency.',
          placeholder: 'Energy up, sleep better, old symptoms return…',
          promptKey: 'fibonacci.responseCheckpoints'
        }),
        approachField('adjustmentRules', 'Adjustment rules', {
          rows: 2,
          wide: true,
          description: 'When to pause, repeat, or step back.',
          placeholder: 'Hold if aggravation > 3 days; repeat same if plateau…',
          promptKey: 'fibonacci.adjustmentRules'
        })
      ),
      requiredKeys: ['startingPotency', 'fibonacciSequence']
    }
  },
  'tautopathy-isopathy': {
    dataKey: 'tautopathyIsopathy',
    def: {
      title: 'Tautopathy / isopathy',
      hint: 'Document causal substance, potency rationale, and clearing timeline.',
      fields: fields(
        approachField('causalSubstance', 'Causal substance / agent', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Drug, vaccine, toxin, or substance causing illness.',
          placeholder: 'Fluoroquinolone, HPV vaccine, mercury exposure…',
          promptKey: 'tautopathy.causalSubstance',
          suggestEndpoint: 'ai-extract-intake',
          extractFrom: ['intake']
        }),
        approachField('exposureTimeline', 'Exposure timeline', {
          rows: 2,
          wide: true,
          description: 'When exposure occurred and duration.',
          placeholder: 'Ciprofloxacin course March 2024, 10 days…',
          promptKey: 'tautopathy.exposureTimeline'
        }),
        approachField('potencyRationale', 'Potency rationale', {
          rows: 2,
          wide: true,
          description: 'Why this potency and repetition for clearing.',
          placeholder: 'Start 30C tautopathic, sensitive patient…',
          promptKey: 'tautopathy.potencyRationale'
        }),
        approachField('clearingPlan', 'Clearing / detox plan', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Step-by-step tautopathic/isopathic plan.',
          placeholder: 'Potentized agent 30C weekly × 4, then assess…',
          promptKey: 'tautopathy.clearingPlan'
        }),
        approachField('followUpMarkers', 'Follow-up markers', {
          rows: 2,
          wide: true,
          description: 'Signs of clearing or aggravation to monitor.',
          placeholder: 'Tendon pain reducing, energy returning…',
          promptKey: 'tautopathy.followUpMarkers'
        })
      ),
      requiredKeys: ['causalSubstance', 'clearingPlan']
    }
  },
  'eizayaga-layers': {
    dataKey: 'eizayagaLayers',
    def: {
      title: 'Eizayaga layers of health',
      hint: 'Map lesion, functional, constitutional, and fundamental layers.',
      fields: fields(
        approachField('lesionLayer', 'Lesion layer', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Structural/organic damage layer.',
          placeholder: 'Joint deformity, fibrosis, organ damage…',
          promptKey: 'eizayaga.lesionLayer'
        }),
        approachField('functionalLayer', 'Functional layer', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Functional disturbance without fixed lesion.',
          placeholder: 'Dyspepsia, functional pain, reversible inflammation…',
          promptKey: 'eizayaga.functionalLayer'
        }),
        approachField('constitutionalLayer', 'Constitutional layer', {
          rows: 2,
          wide: true,
          description: 'Deep constitutional and inherited tendencies.',
          placeholder: 'Chilly, timid, family TB, suppressed eruptions…',
          promptKey: 'eizayaga.constitutionalLayer',
          extractFrom: ['intake']
        }),
        approachField('fundamentalLayer', 'Fundamental / miasmatic layer', {
          rows: 2,
          wide: true,
          description: 'Underlying miasmatic or fundamental layer.',
          placeholder: 'Sycotic base, tubercular inheritance…',
          promptKey: 'eizayaga.fundamentalLayer'
        }),
        approachField('layerPrescribingPlan', 'Layer-wise prescribing plan', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Which layer to treat first and sequencing.',
          placeholder: 'Functional layer first, then constitutional…',
          promptKey: 'eizayaga.layerPrescribingPlan'
        })
      ),
      requiredKeys: ['lesionLayer', 'functionalLayer', 'layerPrescribingPlan']
    }
  },
  'vithoulkas-essences': {
    dataKey: 'vithoulkasEssences',
    def: {
      title: 'Vithoulkas essences & levels',
      hint: 'Capture essence themes, level of health, and defense mechanism.',
      fields: fields(
        approachField('essenceTheme', 'Essence / central theme', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Central essence or theme of the patient.',
          placeholder: 'Need for approval, fear of failure, victimhood…',
          promptKey: 'vithoulkas.essenceTheme',
          suggestEndpoint: 'ai-extract-intake',
          extractFrom: ['intake', 'chat']
        }),
        approachField('levelOfHealth', 'Level of health', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Estimated level of health (A–F scale).',
          placeholder: 'Level C — good vitality, moderate pathology…',
          promptKey: 'vithoulkas.levelOfHealth'
        }),
        approachField('defenseMechanism', 'Defense mechanism', {
          rows: 2,
          wide: true,
          description: 'How the organism defends against stress.',
          placeholder: 'Suppression to skin, anxiety, somatization…',
          promptKey: 'vithoulkas.defenseMechanism'
        }),
        approachField('stressTimeline', 'Stress / shock timeline', {
          rows: 2,
          wide: true,
          description: 'Major shocks or stresses affecting health.',
          placeholder: 'Grief 2023, financial shock, surgery…',
          promptKey: 'vithoulkas.stressTimeline'
        }),
        approachField('remedyEssenceMatch', 'Remedy essence match', {
          rows: 2,
          wide: true,
          description: 'Remedy whose essence matches the patient.',
          placeholder: 'Lycopodium — performance anxiety, fear of failure…',
          promptKey: 'vithoulkas.remedyEssenceMatch'
        })
      ),
      requiredKeys: ['essenceTheme', 'levelOfHealth']
    }
  },
  'drainage-support': {
    dataKey: 'drainageSupport',
    def: {
      title: 'Drainage & organ support',
      hint: 'Plan drainage remedies, organ support, and sequencing with the simillimum.',
      fields: fields(
        approachField('targetOrgans', 'Target organs / systems', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Organs or systems needing drainage support.',
          placeholder: 'Sluggish liver, congested lymph, weak kidneys…',
          promptKey: 'drainage.targetOrgans'
        }),
        approachField('drainageRemedies', 'Drainage remedies', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Remedies chosen for drainage.',
          placeholder: 'Chelidonium, Berberis, lymphatic combo…',
          promptKey: 'drainage.drainageRemedies'
        }),
        approachField('supportRemedies', 'Organ support remedies', {
          rows: 2,
          wide: true,
          description: 'Tissue or organ support remedies.',
          placeholder: 'Carduus marianus for liver, Solidago for kidney…',
          promptKey: 'drainage.supportRemedies'
        }),
        approachField('sequencingNotes', 'Sequencing with simillimum', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Order of drainage, support, and simillimum.',
          placeholder: 'Drainage 2 weeks → simillimum → reassess…',
          promptKey: 'drainage.sequencingNotes'
        }),
        approachField('monitoringPlan', 'Monitoring plan', {
          rows: 2,
          wide: true,
          description: 'What to monitor during drainage phase.',
          placeholder: 'LFTs, energy, stool, skin eruptions…',
          promptKey: 'drainage.monitoringPlan'
        })
      ),
      requiredKeys: ['targetOrgans', 'drainageRemedies', 'sequencingNotes']
    }
  },
  'hering-tracking': {
    dataKey: 'heringTracking',
    def: {
      title: "Hering's law & aggravation tracker",
      hint: 'Track direction of cure, aggravations, and ameliorations after prescribing.',
      fields: fields(
        approachField('prePrescriptionState', 'Pre-prescription state', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Symptom baseline before the prescription.',
          placeholder: 'Headache 8/10 daily, poor sleep, low energy…',
          promptKey: 'hering.prePrescriptionState'
        }),
        approachField('aggravationPhase', 'Aggravation phase', {
          rows: 2,
          wide: true,
          description: 'Initial aggravation after remedy.',
          placeholder: 'Mild headache aggravation days 2–4, then easing…',
          promptKey: 'hering.aggravationPhase'
        }),
        approachField('directionOfCure', "Direction of cure (Hering's law)", {
          rows: 3,
          wide: true,
          required: true,
          description: 'Whether cure follows Hering’s law (above→below, within→out, recent→old).',
          placeholder: 'Skin eruption returning, old joint pain resurfaced…',
          promptKey: 'hering.directionOfCure'
        }),
        approachField('ameliorations', 'Ameliorations observed', {
          rows: 2,
          wide: true,
          description: 'Improvements noted since prescription.',
          placeholder: 'Sleep better, energy up, headache less frequent…',
          promptKey: 'hering.ameliorations'
        }),
        approachField('nextAction', 'Next action / potency decision', {
          rows: 2,
          wide: true,
          description: 'Whether to wait, repeat, change potency, or antidote.',
          placeholder: 'Wait — clear direction of cure; repeat 30C if plateau…',
          promptKey: 'hering.nextAction'
        })
      ),
      requiredKeys: ['prePrescriptionState', 'directionOfCure']
    }
  },
  'acute-fast-track': {
    dataKey: 'acuteFastTrack',
    def: {
      title: 'Acute fast-track',
      hint: 'Minimal acute workflow: complaint → key rubrics → remedy → potency.',
      fields: fields(
        approachField('acuteComplaint', 'Acute complaint', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Quick snapshot of the acute presentation.',
          placeholder: 'Sudden high fever with chill since yesterday…',
          rubricSearchable: true,
          promptKey: 'acuteFast.acuteComplaint',
          suggestEndpoint: 'ai-extract-intake',
          extractFrom: ['intake']
        }),
        approachField('onsetIntensity', 'Onset & intensity', {
          rows: 2,
          description: 'How sudden and how severe.',
          placeholder: 'Sudden onset, intensity 8/10…',
          promptKey: 'acuteFast.onsetIntensity'
        }),
        approachField('keyRubricSummary', 'Key rubric summary', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Minimum rubrics driving acute remedy choice.',
          placeholder: 'Restlessness, thirst, profuse sweat…',
          rubricSearchable: true,
          promptKey: 'acuteFast.keyRubricSummary',
          suggestEndpoint: 'ai-complete'
        }),
        approachField('selectedRemedy', 'Selected remedy', {
          rows: 1,
          required: true,
          description: 'Acute remedy chosen.',
          placeholder: 'e.g. Aconite, Belladonna, Arsenicum…',
          promptKey: 'acuteFast.selectedRemedy'
        }),
        approachField('potencyPlan', 'Potency & repetition plan', {
          rows: 2,
          wide: true,
          description: 'Potency and how often to repeat.',
          placeholder: '30C every 2 hours × 3 doses, then assess…',
          promptKey: 'acuteFast.potencyPlan'
        })
      ),
      requiredKeys: ['acuteComplaint', 'keyRubricSummary', 'selectedRemedy']
    }
  },
  'combination-remedy': {
    dataKey: 'combinationRemedy',
    def: {
      title: 'Combination / complex remedy',
      hint: 'Document complex remedy composition, indications, and personalization.',
      fields: fields(
        approachField('combinationName', 'Combination / complex name', {
          rows: 2,
          wide: true,
          required: true,
          description: 'Name of the complex or combination remedy.',
          placeholder: 'Complex for URTI, joint formula, etc.',
          promptKey: 'combination.combinationName'
        }),
        approachField('componentRemedies', 'Component remedies', {
          rows: 3,
          wide: true,
          description: 'Individual remedies in the combination.',
          placeholder: 'Aconite + Bryonia + Eupatorium…',
          promptKey: 'combination.componentRemedies'
        }),
        approachField('indicationMatch', 'Indication match', {
          rows: 3,
          wide: true,
          required: true,
          description: 'Why this combination fits the case.',
          placeholder: 'Acute URTI with cough, congestion, fever…',
          promptKey: 'combination.indicationMatch'
        }),
        approachField('personalizationNotes', 'Personalization notes', {
          rows: 2,
          wide: true,
          description: 'Adaptations for this specific patient.',
          placeholder: 'Reduce frequency in sensitive patient…',
          promptKey: 'combination.personalizationNotes'
        }),
        approachField('durationPlan', 'Duration & review plan', {
          rows: 2,
          wide: true,
          description: 'How long to use and when to review.',
          placeholder: '5 days, review if no improvement in 48h…',
          promptKey: 'combination.durationPlan'
        })
      ),
      requiredKeys: ['combinationName', 'indicationMatch']
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
  const binding = Object.values(STRUCTURED_APPROACH_PANELS).find(
    (item) => item?.dataKey === dataKey
  );
  const block = approachData?.[dataKey] as Record<string, string> | undefined;
  if (!block) return false;
  const requiredKeys = binding?.def.requiredKeys?.length
    ? binding.def.requiredKeys
    : binding?.def.fields.filter((field) => field.required).map((field) => field.key);
  if (!requiredKeys?.length) {
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
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (char) => char.toUpperCase());
}
