import { DiseaseInfo } from '../models';

export const liverCirrhosisDiseaseInfo: DiseaseInfo = {
  slug: 'liver-cirrhosis',
  name: 'Liver Cirrhosis',
  shortName: 'Liver Cirrhosis Care',
  imageUrl:
    'https://images.unsplash.com/photo-1579154203451-5c7a5f12b239?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Liver disease consultation',
  category: 'Hepatology',
  diseaseType: 'Chronic progressive liver condition',
  icdCode: 'K74 group',
  about: 'Long-term care support for chronic liver damage and cirrhosis-related complications.',
  summary:
    'Liver cirrhosis is a progressive chronic condition needing continuous monitoring, complication screening, and specialist-coordinated care.',
  symptoms: ['Fatigue', 'Abdominal swelling', 'Loss of appetite', 'Jaundice', 'Leg swelling'],
  causes: ['Chronic viral hepatitis', 'Alcohol-related liver injury', 'Fatty liver progression', 'Autoimmune or metabolic liver disease'],
  riskFactors: ['Alcohol misuse', 'Chronic hepatitis', 'Metabolic syndrome', 'Uncontrolled diabetes'],
  diagnosis:
    'Diagnosis is based on history, liver tests, imaging, and specialist assessment. Ongoing stage and complication review is important.',
  tests: ['Liver function tests', 'Ultrasound / elastography', 'CBC and coagulation profile', 'Endoscopy where indicated'],
  treatmentOptions: {
    allopathy: 'Hepatology-led management is required for complication prevention and treatment.',
    lifestyle: 'Alcohol abstinence, nutrition optimization, and strict follow-up are critical.'
  },
  homeCare: ['Avoid alcohol completely', 'Follow low-salt plan when advised', 'Track swelling and weight changes'],
  prevention: ['Early fatty liver management', 'Hepatitis prevention/treatment', 'Metabolic risk control'],
  severityLevel: 'Stable follow-up can be coordinated online; decompensated symptoms need urgent in-person care.',
  whenToSeeDoctor: 'Consult urgently for increasing swelling, jaundice, confusion, GI bleeding signs, or appetite decline.',
  emergencySigns: ['Vomiting blood', 'Black stools', 'Confusion/drowsiness', 'Breathing difficulty from fluid overload'],
  careApproach: [
    'Assess current liver status and decompensation risk',
    'Review ongoing medicines and nutrition',
    'Coordinate specialist investigations and referrals',
    'Monitor progression through close follow-up'
  ],
  details: [
    'Cirrhosis management focuses on preventing and detecting complications early.',
    'Regular monitoring can reduce hospitalization and improve outcomes.',
    'Emergency warning signs should never be ignored.'
  ],
  warning:
    'Suspected bleeding, altered consciousness, or severe swelling in liver cirrhosis is an emergency. Seek hospital care immediately.'
};
