import type { ProviderType } from '../../../core/constants/doctor-types.constants';

export type ProfessionProfileField = {
  key: string;
  label: string;
  kind: 'text' | 'textarea';
  placeholder: string;
  hint?: string;
};

const GENERAL_MEDICAL_FIELDS: ProfessionProfileField[] = [
  {
    key: 'clinicalInterests',
    label: 'Clinical interests',
    kind: 'textarea',
    placeholder: 'Chronic care, preventive health, women health, child health',
  },
  {
    key: 'treatmentApproach',
    label: 'Consultation approach',
    kind: 'textarea',
    placeholder: 'How you assess, counsel, follow up, and coordinate care',
  },
  {
    key: 'languages',
    label: 'Consultation languages',
    kind: 'text',
    placeholder: 'English, Hindi, Marathi',
  },
  {
    key: 'consultationLimitations',
    label: 'Online consultation limitations',
    kind: 'textarea',
    placeholder: 'Cases that need urgent, emergency, or in-person care',
  },
];

const FIELD_SETS: Partial<Record<ProviderType, ProfessionProfileField[]>> = {
  COUNSELLOR: [
    {
      key: 'counsellingApproaches',
      label: 'Counselling approaches',
      kind: 'textarea',
      placeholder: 'CBT-informed, person-centred, family counselling, grief counselling',
    },
    {
      key: 'ageGroups',
      label: 'Age groups supported',
      kind: 'text',
      placeholder: 'Adults, couples, adolescents, parents',
    },
    {
      key: 'sessionLanguages',
      label: 'Session languages',
      kind: 'text',
      placeholder: 'English, Hindi, Gujarati',
    },
    {
      key: 'crisisEscalationPlan',
      label: 'Crisis escalation notes',
      kind: 'textarea',
      placeholder: 'How you handle high-risk cases and emergency referrals',
    },
  ],
  PSYCHOLOGIST: [
    {
      key: 'assessmentAreas',
      label: 'Assessment areas',
      kind: 'textarea',
      placeholder: 'Anxiety, depression, child behaviour, relationship stress',
    },
    {
      key: 'therapyApproaches',
      label: 'Therapy approaches',
      kind: 'textarea',
      placeholder: 'CBT, DBT-informed, ACT, mindfulness-based therapy',
    },
    {
      key: 'ageGroups',
      label: 'Age groups supported',
      kind: 'text',
      placeholder: 'Children, adolescents, adults',
    },
    {
      key: 'supervisionOrLicense',
      label: 'License or supervision details',
      kind: 'text',
      placeholder: 'RCI license, supervisor name, registration body',
    },
  ],
  PSYCHIATRIST: [
    {
      key: 'medicalRegistrationAuthority',
      label: 'Medical registration authority',
      kind: 'text',
      placeholder: 'NMC, state medical council, registration body',
    },
    {
      key: 'psychiatrySpecialInterests',
      label: 'Psychiatry focus areas',
      kind: 'textarea',
      placeholder: 'Mood disorders, anxiety, sleep, addiction, child psychiatry',
    },
    {
      key: 'therapyApproaches',
      label: 'Therapy or counselling approach',
      kind: 'textarea',
      placeholder: 'Medication review, psychoeducation, family counselling',
    },
    {
      key: 'controlledMedicationPolicy',
      label: 'Medication policy notes',
      kind: 'textarea',
      placeholder: 'Online prescribing boundaries and required follow-up notes',
    },
  ],
  PSYCHOTHERAPIST: [
    {
      key: 'therapyApproaches',
      label: 'Therapy approaches',
      kind: 'textarea',
      placeholder: 'CBT, psychodynamic, trauma-informed, couples therapy',
    },
    {
      key: 'clientGroups',
      label: 'Client groups',
      kind: 'text',
      placeholder: 'Adults, couples, families, adolescents',
    },
    {
      key: 'sessionStructure',
      label: 'Session structure',
      kind: 'textarea',
      placeholder: 'Intake process, goal setting, review cadence',
    },
  ],
  THERAPIST: [
    {
      key: 'therapySpecialties',
      label: 'Therapy specialties',
      kind: 'textarea',
      placeholder: 'Stress, trauma, relationships, behavioural change',
    },
    {
      key: 'sessionStructure',
      label: 'Session structure',
      kind: 'textarea',
      placeholder: 'Assessment, goals, session duration, follow-up style',
    },
  ],
  LIFE_COACH: [
    {
      key: 'coachingFocus',
      label: 'Coaching focus',
      kind: 'textarea',
      placeholder: 'Career clarity, confidence, habits, relationships, productivity',
    },
    {
      key: 'coachingMethod',
      label: 'Coaching method',
      kind: 'textarea',
      placeholder: 'Goal setting, accountability, exercises, review cadence',
    },
  ],
  DIETITIAN: [
    {
      key: 'nutritionSpecialties',
      label: 'Nutrition specialties',
      kind: 'textarea',
      placeholder: 'Weight, diabetes, PCOS, kidney diet, gut health',
    },
    {
      key: 'dietPlanStyle',
      label: 'Diet plan style',
      kind: 'textarea',
      placeholder: 'Indian meals, vegetarian, Jain, high-protein, budget-friendly',
    },
    {
      key: 'followUpCadence',
      label: 'Follow-up cadence',
      kind: 'text',
      placeholder: 'Weekly, fortnightly, monthly',
    },
  ],
  NUTRITIONIST: [
    {
      key: 'nutritionSpecialties',
      label: 'Nutrition specialties',
      kind: 'textarea',
      placeholder: 'Lifestyle nutrition, sports nutrition, weight goals, gut health',
    },
    {
      key: 'dietPlanStyle',
      label: 'Diet plan style',
      kind: 'textarea',
      placeholder: 'Practical meal planning, grocery guidance, habit coaching',
    },
  ],
  DIABETES_EDUCATOR: [
    {
      key: 'diabetesSupportScope',
      label: 'Diabetes support scope',
      kind: 'textarea',
      placeholder: 'Glucose monitoring, meal planning, insulin education, foot care',
    },
    {
      key: 'educationTools',
      label: 'Education tools',
      kind: 'textarea',
      placeholder: 'Logbook review, CGM review, goal cards, family education',
    },
  ],
  PHYSIOTHERAPIST: [
    {
      key: 'therapySpecialties',
      label: 'Therapy specialties',
      kind: 'textarea',
      placeholder: 'Back pain, sports injury, neuro rehab, post-operative rehab',
    },
    {
      key: 'assessmentTools',
      label: 'Assessment tools',
      kind: 'textarea',
      placeholder: 'Movement screen, pain score, range of motion, functional tests',
    },
    {
      key: 'exercisePrescriptionScope',
      label: 'Exercise prescription scope',
      kind: 'textarea',
      placeholder: 'Home exercises, progression plans, precautions',
    },
  ],
  OCCUPATIONAL_THERAPIST: [
    {
      key: 'therapySpecialties',
      label: 'Therapy specialties',
      kind: 'textarea',
      placeholder: 'ADL training, sensory integration, hand therapy, neuro rehab',
    },
    {
      key: 'assessmentTools',
      label: 'Assessment tools',
      kind: 'textarea',
      placeholder: 'Functional assessment, home safety, workplace ergonomics',
    },
  ],
  SPEECH_THERAPIST: [
    {
      key: 'speechLanguageAreas',
      label: 'Speech-language areas',
      kind: 'textarea',
      placeholder: 'Speech delay, stammering, voice therapy, swallowing therapy',
    },
    {
      key: 'ageGroups',
      label: 'Age groups supported',
      kind: 'text',
      placeholder: 'Children, adults, post-stroke patients',
    },
  ],
  REHABILITATION_SPECIALIST: [
    {
      key: 'rehabPrograms',
      label: 'Rehabilitation programs',
      kind: 'textarea',
      placeholder: 'Neuro rehab, post-surgical rehab, chronic pain, disability support',
    },
    {
      key: 'careCoordination',
      label: 'Care coordination scope',
      kind: 'textarea',
      placeholder: 'Family training, therapy plans, assistive device guidance',
    },
  ],
  YOGA_INSTRUCTOR: [
    {
      key: 'yogaStyles',
      label: 'Yoga styles',
      kind: 'text',
      placeholder: 'Hatha, restorative, prenatal, therapeutic yoga',
    },
    {
      key: 'safetyLimitations',
      label: 'Safety limitations',
      kind: 'textarea',
      placeholder: 'Conditions that need medical clearance before sessions',
    },
  ],
  FITNESS_TRAINER: [
    {
      key: 'trainingFocus',
      label: 'Training focus',
      kind: 'textarea',
      placeholder: 'Strength, mobility, weight loss, senior fitness',
    },
    {
      key: 'certifications',
      label: 'Certifications',
      kind: 'text',
      placeholder: 'ACE, ACSM, K11, CPR, first aid',
    },
  ],
  HEALTH_COACH: [
    {
      key: 'coachingFocus',
      label: 'Coaching focus',
      kind: 'textarea',
      placeholder: 'Habit change, sleep, stress, metabolic health, adherence',
    },
    {
      key: 'coachingMethod',
      label: 'Coaching method',
      kind: 'textarea',
      placeholder: 'Goal setting, trackers, nudges, review cadence',
    },
  ],
  WELLNESS_COACH: [
    {
      key: 'wellnessFocus',
      label: 'Wellness focus',
      kind: 'textarea',
      placeholder: 'Stress, sleep, meditation, lifestyle balance',
    },
    {
      key: 'sessionFormat',
      label: 'Session format',
      kind: 'text',
      placeholder: 'One-to-one, group sessions, guided practice',
    },
  ],
  LAB_TECHNICIAN: [
    {
      key: 'sampleCollectionScope',
      label: 'Sample collection scope',
      kind: 'textarea',
      placeholder: 'Blood, urine, home collection, fasting samples',
    },
    {
      key: 'turnaroundTime',
      label: 'Turnaround time',
      kind: 'text',
      placeholder: 'Same day, 24 hours, 48 hours',
    },
  ],
  PHLEBOTOMIST: [
    {
      key: 'sampleCollectionScope',
      label: 'Sample collection scope',
      kind: 'textarea',
      placeholder: 'Home blood collection, pediatric samples, fasting samples',
    },
    {
      key: 'serviceArea',
      label: 'Service area',
      kind: 'text',
      placeholder: 'Mumbai western line, Navi Mumbai, Pune',
    },
  ],
  RADIOLOGIST: [
    {
      key: 'modalities',
      label: 'Reporting modalities',
      kind: 'textarea',
      placeholder: 'X-ray, ultrasound, CT, MRI, mammography',
    },
    {
      key: 'reportingScope',
      label: 'Reporting scope',
      kind: 'textarea',
      placeholder: 'Emergency reporting, second opinion, specialist reporting',
    },
  ],
  PATHOLOGIST: [
    {
      key: 'labSpecialties',
      label: 'Pathology specialties',
      kind: 'textarea',
      placeholder: 'Histopathology, cytology, hematology, microbiology',
    },
    {
      key: 'reportingScope',
      label: 'Reporting scope',
      kind: 'textarea',
      placeholder: 'Report validation, second opinion, critical value policy',
    },
  ],
  DENTIST: [
    {
      key: 'dentalSpecialties',
      label: 'Dental specialties',
      kind: 'textarea',
      placeholder: 'Root canal, orthodontics, pediatric dentistry, implants',
    },
    {
      key: 'proceduresOffered',
      label: 'Procedures offered',
      kind: 'textarea',
      placeholder: 'Online triage, treatment planning, post-procedure follow-up',
    },
  ],
  CAREGIVER: [
    {
      key: 'careServices',
      label: 'Care services',
      kind: 'textarea',
      placeholder: 'Elder care, mobility support, medicine reminders, companionship',
    },
    {
      key: 'patientHandlingTraining',
      label: 'Patient handling training',
      kind: 'textarea',
      placeholder: 'Bedridden care, transfer support, dementia care, fall prevention',
    },
  ],
  HOME_CARE_PROVIDER: [
    {
      key: 'homeCareServices',
      label: 'Home care services',
      kind: 'textarea',
      placeholder: 'Nursing care, post-operative support, palliative support',
    },
    {
      key: 'serviceArea',
      label: 'Service area',
      kind: 'text',
      placeholder: 'Mumbai, Thane, Navi Mumbai',
    },
  ],
};

const ALIASES: Partial<Record<ProviderType, ProviderType>> = {
  MEDICAL_SOCIAL_WORKER: 'COUNSELLOR',
  GENETIC_COUNSELLOR: 'COUNSELLOR',
  PHARMACIST: 'DIABETES_EDUCATOR',
  NURSE: 'HOME_CARE_PROVIDER',
  MIDWIFE: 'HOME_CARE_PROVIDER',
  SURGEON: 'DOCTOR',
  SPECIALIST: 'DOCTOR',
  AYURVEDA_DOCTOR: 'DOCTOR',
  HOMEOPATH: 'DOCTOR',
  OTHER: 'DOCTOR',
};

export function professionFieldsForProvider(providerType: ProviderType | null | undefined) {
  if (!providerType) return GENERAL_MEDICAL_FIELDS;

  const alias = ALIASES[providerType] ?? providerType;
  return FIELD_SETS[alias] ?? GENERAL_MEDICAL_FIELDS;
}
