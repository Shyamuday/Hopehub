import { DiseaseInfo } from '../models';

export const chronicKidneyDiseaseInfo: DiseaseInfo = {
  slug: 'chronic-kidney-disease',
  name: 'Chronic Kidney Disease (CKD)',
  shortName: 'CKD Care',
  imageUrl:
    'https://images.unsplash.com/photo-1579154203451-5c7a5f12b239?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Kidney disease consultation',
  category: 'Chronic non-communicable disease',
  diseaseType: 'Progressive chronic condition',
  icdCode: 'N18 group',
  about: 'Long-term kidney health support, especially in patients with diabetes or hypertension history.',
  summary:
    'CKD is increasing in prevalence and is commonly seen as a complication of long-standing diabetes or hypertension requiring specialized long-term care.',
  symptoms: ['Early stages may be asymptomatic', 'Swelling in legs/face', 'Fatigue and reduced appetite', 'Changes in urination pattern'],
  causes: ['Long-standing diabetes', 'Uncontrolled hypertension', 'Glomerular disease', 'Drug or toxin-related kidney injury'],
  riskFactors: ['Diabetes', 'Hypertension', 'Ageing', 'Family history', 'Repeated kidney insults'],
  diagnosis:
    'Diagnosis is made using kidney function trends, urine findings, blood pressure history, and associated comorbidity assessment.',
  tests: ['Serum creatinine and eGFR', 'Urine protein / albumin', 'Electrolyte panel', 'Renal ultrasound where indicated'],
  treatmentOptions: {
    allopathy: 'Nephrology-directed management is often required to slow progression and manage complications.',
    homeopathy: 'May be considered only as supportive adjunct care in stable, specialist-supervised chronic settings.',
    lifestyle: 'BP/sugar optimization, diet moderation, fluid advice, and medication safety counseling are central.'
  },
  homeCare: ['Track BP and sugar regularly', 'Follow kidney-friendly diet as advised', 'Avoid self-medication, especially painkillers'],
  prevention: ['Early diabetes/BP control', 'Routine kidney screening in high-risk adults', 'Prompt treatment of urinary and metabolic issues'],
  severityLevel: 'Stable CKD follow-up may be coordinated online; rapidly worsening kidney status needs urgent specialist offline care.',
  whenToSeeDoctor: 'Consult for edema, persistent fatigue, poor urine output, rising creatinine, or uncontrolled diabetes/hypertension.',
  emergencySigns: ['Breathlessness with swelling', 'Very low urine output', 'Altered sensorium', 'Severe electrolyte-related symptoms'],
  careApproach: [
    'Review CKD stage, trend, and major comorbid drivers',
    'Prioritize BP and glucose control targets',
    'Coordinate supportive long-term management and specialist referral timing',
    'Track progression and complications through routine follow-up'
  ],
  details: [
    'CKD is often silent in early stages and detected through routine monitoring.',
    'Most regional CKD burden is linked to chronic diabetes and hypertension.',
    'Consistent long-term management can slow progression and reduce complications.'
  ],
  warning:
    'Advanced CKD or acute worsening can be life-threatening. For severe swelling, breathlessness, confusion, or oliguria, seek urgent hospital care.'
};
