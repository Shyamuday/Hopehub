import { DiseaseInfo } from './models';

export const hypertensionDiseaseInfo: DiseaseInfo = {
  slug: 'hypertension',
  name: 'Hypertension',
  shortName: 'BP Care',
  imageUrl:
    'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Blood pressure checkup',
  category: 'Non-communicable disease (NCD)',
  diseaseType: 'Chronic cardiovascular risk condition',
  icdCode: 'I10-I15 group',
  about: 'Structured long-term blood pressure care for urban and semi-urban adults.',
  summary:
    'Hypertension is a leading chronic condition in Ranchi across urban and semi-urban populations and usually requires sustained long-term management.',
  symptoms: ['Often asymptomatic', 'Headache in some patients', 'Dizziness', 'Palpitations or fatigue in uncontrolled cases'],
  causes: ['Primary (essential) hypertension', 'Kidney or endocrine causes in select patients', 'Dietary sodium excess and stress'],
  riskFactors: ['Family history', 'High salt intake', 'Obesity', 'Low physical activity', 'Alcohol and tobacco use'],
  diagnosis: 'Diagnosis is based on repeated BP measurements and risk profiling, along with comorbidity review.',
  tests: ['Serial BP charting', 'Kidney function tests', 'ECG where indicated', 'Urine examination', 'Lipid and sugar profile'],
  treatmentOptions: {
    allopathy: 'Regular antihypertensive medication may be needed according to physician advice.',
    homeopathy: 'May be used as supportive chronic care in selected non-emergency settings.',
    lifestyle: 'Salt reduction, stress management, exercise, sleep correction, and weight control are critical.'
  },
  homeCare: ['Maintain BP log', 'Reduce salt intake', 'Adhere to fixed medicine schedule', 'Avoid missed doses'],
  prevention: ['Routine screening after adulthood', 'Early treatment of elevated BP', 'Control obesity and metabolic risk'],
  severityLevel: 'Routine chronic management can be followed online; hypertensive urgency or emergency requires immediate offline care.',
  whenToSeeDoctor: 'Consult for repeatedly elevated readings, medicine side effects, or uncontrolled BP despite treatment.',
  emergencySigns: ['Very high BP with severe headache', 'Chest pain', 'Neurological deficit', 'Breathlessness'],
  careApproach: [
    'Confirm BP pattern and stage',
    'Identify associated cardiovascular and kidney risk',
    'Optimize medicine and lifestyle adherence',
    'Track outcomes with periodic follow-up'
  ],
  details: [
    'Hypertension often remains silent until complications appear, so early detection matters.',
    'Consistent monitoring and adherence significantly reduce stroke and heart risks.',
    'Care should be integrated with diabetes and lipid control when present.'
  ]
};
