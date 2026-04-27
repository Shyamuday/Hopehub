import { HomeopathyApproach } from '../models';

export const eightBoxCaseStructureApproach: HomeopathyApproach = {
  slug: 'eight-box-case-structure',
  title: '8-Box Case Structure',
  shortDescription:
    'A structured case-taking format that organizes a patient profile into eight clinical boxes before repertorization and prescription.',
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
    'Easy to convert into digital case forms and wizard flows'
  ],
  limits: [
    'Not a strict universal standard in all schools',
    'By itself, it does not define a full treatment doctrine'
  ],
  digitalMapping: [
    'patientInfo',
    'chiefComplaints',
    'presentHistory',
    'pastHistory',
    'familyHistory',
    'mentalState',
    'physicalGenerals',
    'particularsAndDiagnosis',
    'prescription'
  ]
};
