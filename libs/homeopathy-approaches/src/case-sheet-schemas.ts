import type { CaseSheetFieldDef, CaseSheetSchemaId } from './types';

const CLASSICAL_FIELDS: CaseSheetFieldDef[] = [
  { key: 'chiefComplaint', label: 'Chief complaint', rows: 2 },
  { key: 'onset', label: 'Onset & duration', rows: 2 },
  { key: 'location', label: 'Location / side', rows: 2 },
  { key: 'sensation', label: 'Sensation & character', rows: 2 },
  { key: 'modalitiesBetter', label: 'Better from', rows: 2 },
  { key: 'modalitiesWorse', label: 'Worse from', rows: 2 },
  { key: 'concomitants', label: 'Concomitants', rows: 2 },
  { key: 'mentalEmotional', label: 'Mental / emotional', rows: 3 },
  { key: 'pastHistory', label: 'Past history', rows: 2 },
  { key: 'familyHistory', label: 'Family history', rows: 2 },
  { key: 'examination', label: 'Examination / investigations', rows: 2 }
];

const EIGHT_BOX_FIELDS: CaseSheetFieldDef[] = [
  { key: 'patientInfo', label: 'Patient identity & constitution', rows: 2, wide: true },
  { key: 'chiefComplaints', label: 'Chief complaints (duration & modalities)', rows: 3, wide: true },
  { key: 'presentHistory', label: 'Present illness progression & triggers', rows: 3, wide: true },
  { key: 'pastHistory', label: 'Past history', rows: 2 },
  { key: 'familyHistory', label: 'Family history', rows: 2 },
  { key: 'mentalState', label: 'Mental / emotional state', rows: 3 },
  { key: 'physicalGenerals', label: 'Physical generals', rows: 3 },
  { key: 'particularsAndDiagnosis', label: 'Particulars & clinical diagnosis', rows: 3, wide: true }
];

const CONSTITUTIONAL_FIELDS: CaseSheetFieldDef[] = [
  { key: 'temperament', label: 'Temperament & constitution', rows: 2 },
  { key: 'thermalState', label: 'Thermal preference', rows: 2 },
  { key: 'appetiteThirst', label: 'Appetite & thirst', rows: 2 },
  { key: 'sleepDreams', label: 'Sleep & dreams', rows: 2 },
  { key: 'mentalPicture', label: 'Mental picture', rows: 3, wide: true },
  { key: 'chiefComplaint', label: 'Chief complaint', rows: 2 },
  { key: 'modalities', label: 'Modalities', rows: 2 },
  { key: 'pastFamilyHistory', label: 'Past & family history', rows: 3 }
];

const KENTIAN_FIELDS: CaseSheetFieldDef[] = [
  { key: 'mentalGenerals', label: 'Mental generals (priority)', rows: 4, wide: true, hint: 'Fears, anxieties, delusions, will/affection/intellect.' },
  { key: 'physicalGenerals', label: 'Physical generals', rows: 3, wide: true },
  { key: 'particularSymptoms', label: 'Particular symptoms', rows: 3, wide: true },
  { key: 'strikingKeynotes', label: 'Striking / peculiar keynotes', rows: 3, wide: true },
  { key: 'causation', label: 'Causation & timeline', rows: 2 },
  { key: 'potencyStrategy', label: 'Potency strategy notes', rows: 2 }
];

const BOENNINGHAUSEN_FIELDS: CaseSheetFieldDef[] = [
  { key: 'location', label: 'Location', rows: 2 },
  { key: 'sensation', label: 'Sensation', rows: 2 },
  { key: 'modalities', label: 'Modalities (better / worse)', rows: 3 },
  { key: 'concomitants', label: 'Concomitants', rows: 2 },
  { key: 'timeAggravation', label: 'Time aggravation', rows: 2 },
  { key: 'extensions', label: 'Extensions / radiation', rows: 2 }
];

const BOGER_FIELDS: CaseSheetFieldDef[] = [
  { key: 'pathologicalTotality', label: 'Pathological totality', rows: 3, wide: true },
  { key: 'timePatterns', label: 'Time patterns', rows: 2 },
  { key: 'modalities', label: 'Modalities', rows: 2 },
  { key: 'concomitants', label: 'Concomitants', rows: 2 },
  { key: 'clinicalFindings', label: 'Clinical findings', rows: 2 }
];

const SENSATION_FIELDS: CaseSheetFieldDef[] = [
  { key: 'patientLanguage', label: 'Patient’s own words', rows: 4, wide: true },
  { key: 'coreSensation', label: 'Core sensation theme', rows: 3, wide: true },
  { key: 'activePassive', label: 'Active / passive experience', rows: 2 },
  { key: 'kingdomClues', label: 'Kingdom clues', rows: 2 },
  { key: 'miasmHints', label: 'Miasm hints', rows: 2 },
  { key: 'remedyFamilyNotes', label: 'Remedy family notes', rows: 3 }
];

const MIASMATIC_FIELDS: CaseSheetFieldDef[] = [
  { key: 'presentingLayer', label: 'Presenting layer', rows: 2 },
  { key: 'dominantMiasm', label: 'Dominant miasm', rows: 2 },
  { key: 'psoraSigns', label: 'Psora signs', rows: 3 },
  { key: 'sycosisSigns', label: 'Sycosis signs', rows: 3 },
  { key: 'syphilisSigns', label: 'Syphilis signs', rows: 3 },
  { key: 'familyMiasm', label: 'Family miasm pattern', rows: 2 },
  { key: 'constitutionalOverlay', label: 'Constitutional overlay', rows: 3 }
];

const PROTOCOL_FIELDS: CaseSheetFieldDef[] = [
  { key: 'confirmedDiagnosis', label: 'Confirmed diagnosis', rows: 2 },
  { key: 'protocolNotes', label: 'Protocol personalization', rows: 3, wide: true },
  { key: 'contraindications', label: 'Contraindications / cautions', rows: 2 },
  { key: 'followUpPlan', label: 'Follow-up plan', rows: 2 }
];

const CLINICAL_FIELDS: CaseSheetFieldDef[] = [
  { key: 'clinicalDiagnosis', label: 'Clinical diagnosis', rows: 2 },
  { key: 'pathologyFindings', label: 'Pathology / investigation findings', rows: 3 },
  { key: 'keySymptoms', label: 'Key prescribing symptoms', rows: 3 },
  { key: 'organAffinity', label: 'Organ affinity', rows: 2 },
  { key: 'acuteChronicContext', label: 'Acute vs chronic context', rows: 2 }
];

const HYBRID_FIELDS: CaseSheetFieldDef[] = [
  { key: 'primaryPath', label: 'Primary approach path used', rows: 2 },
  { key: 'secondaryPath', label: 'Secondary / supportive path', rows: 2 },
  { key: 'integrationNotes', label: 'How approaches are integrated', rows: 4, wide: true },
  { key: 'chiefComplaint', label: 'Chief complaint summary', rows: 2 }
];

const ORGANON_LM_FIELDS: CaseSheetFieldDef[] = [
  { key: 'baselineTotality', label: 'Baseline totality summary', rows: 4, wide: true },
  { key: 'vitalitySensitivity', label: 'Vitality & sensitivity profile', rows: 3, wide: true, hint: 'Assess if patient is hypersensitive, depleted, or robust before LM dosing.' },
  { key: 'previousPotencyResponse', label: 'Previous potency / remedy response', rows: 3 },
  { key: 'aggravationHistory', label: 'Aggravation / proving history', rows: 2 },
  { key: 'followUpObservations', label: 'Follow-up observations to monitor', rows: 3 }
];

export const CASE_SHEET_SCHEMAS: Record<CaseSheetSchemaId, CaseSheetFieldDef[]> = {
  classical: CLASSICAL_FIELDS,
  'eight-box': EIGHT_BOX_FIELDS,
  constitutional: CONSTITUTIONAL_FIELDS,
  kentian: KENTIAN_FIELDS,
  boenninghausen: BOENNINGHAUSEN_FIELDS,
  boger: BOGER_FIELDS,
  sensation: SENSATION_FIELDS,
  miasmatic: MIASMATIC_FIELDS,
  protocol: PROTOCOL_FIELDS,
  clinical: CLINICAL_FIELDS,
  hybrid: HYBRID_FIELDS,
  'organon-lm': ORGANON_LM_FIELDS
};

export function caseSheetFieldsForSchema(schemaId: CaseSheetSchemaId): CaseSheetFieldDef[] {
  return CASE_SHEET_SCHEMAS[schemaId] || CLASSICAL_FIELDS;
}

export function emptyCaseSheetForSchema(schemaId: CaseSheetSchemaId): Record<string, string> {
  const fields = caseSheetFieldsForSchema(schemaId);
  const sheet: Record<string, string> = {
    _schema: schemaId,
    _version: '1'
  };
  for (const field of fields) {
    sheet[field.key] = '';
  }
  return sheet;
}

export function hydrateCaseSheetForSchema(
  schemaId: CaseSheetSchemaId,
  raw?: Record<string, string> | null
): Record<string, string> {
  const sheet = emptyCaseSheetForSchema(schemaId);
  if (!raw) return sheet;
  for (const field of caseSheetFieldsForSchema(schemaId)) {
    sheet[field.key] = raw[field.key]?.trim() || '';
  }
  if (raw['_schema']) sheet['_schema'] = raw['_schema'];
  if (raw['_version']) sheet['_version'] = raw['_version'];
  return sheet;
}
