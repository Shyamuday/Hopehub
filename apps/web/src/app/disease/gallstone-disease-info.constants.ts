import { DiseaseInfo } from '../models';

export const gallstoneDiseaseInfo: DiseaseInfo = {
  slug: 'gallstone',
  name: 'Gallstone Disease',
  shortName: 'Gallstone Care',
  imageUrl:
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Gallstone consultation',
  category: 'Gastrointestinal',
  diseaseType: 'Chronic / recurrent biliary condition',
  icdCode: 'K80 group',
  about: 'Care support for symptomatic gallstones and recurrent biliary discomfort.',
  summary:
    'Gallstones can remain silent for long periods, but recurrent pain, nausea, and digestive discomfort need timely evaluation and follow-up.',
  symptoms: ['Right upper abdominal pain', 'Pain after fatty meals', 'Nausea or bloating', 'Episodes of severe abdominal discomfort'],
  causes: ['Cholesterol stone formation', 'Pigment stones', 'Impaired bile flow'],
  riskFactors: ['Obesity', 'Female sex', 'Middle age', 'High-fat diet', 'Family tendency'],
  diagnosis: 'Diagnosis is based on symptom pattern and imaging, usually ultrasound, along with clinical review.',
  tests: ['Abdominal ultrasound', 'Liver function tests', 'CBC where infection is suspected'],
  treatmentOptions: {
    allopathy: 'Pain control and surgical referral may be needed in recurrent or complicated cases.',
    lifestyle: 'Low-fat diet, meal pattern correction, and weight management are commonly advised.'
  },
  homeCare: ['Avoid heavy fatty meals', 'Hydrate adequately', 'Track pain episodes and triggers'],
  prevention: ['Weight optimization', 'Balanced diet', 'Early consultation for recurrent pain'],
  severityLevel: 'Stable symptom cases can be evaluated online, but acute severe pain needs urgent offline review.',
  whenToSeeDoctor: 'Consult if pain recurs, worsens, or is associated with fever, vomiting, or jaundice.',
  emergencySigns: ['High fever with abdominal pain', 'Persistent vomiting', 'Jaundice', 'Severe continuous pain'],
  careApproach: [
    'Review symptom history and trigger pattern',
    'Assess severity and complication risk',
    'Guide investigation and next-step management',
    'Provide follow-up safety monitoring'
  ],
  details: [
    'Many gallstones are incidental, but symptomatic disease needs active follow-up.',
    'Delay in care can increase risk of infection or biliary obstruction.',
    'Treatment planning depends on symptom burden and imaging findings.'
  ]
};
