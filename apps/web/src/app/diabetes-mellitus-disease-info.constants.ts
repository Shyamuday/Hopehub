import { DiseaseInfo } from './models';

export const diabetesMellitusDiseaseInfo: DiseaseInfo = {
  slug: 'diabetes-mellitus',
  name: 'Diabetes Mellitus',
  shortName: 'Diabetes Care',
  imageUrl:
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Diabetes consultation and blood sugar monitoring',
  category: 'Non-communicable disease (NCD)',
  diseaseType: 'Chronic metabolic condition',
  icdCode: 'E10-E14 group',
  about: 'Long-term diabetes management support for adults with blood sugar fluctuations and comorbidity risk.',
  summary:
    'Diabetes is highly prevalent among both men and women in the region and is commonly seen as a major co-morbidity in adult patients.',
  symptoms: [
    'Frequent urination and increased thirst',
    'Unexplained fatigue',
    'Blurred vision',
    'Delayed wound healing or recurrent infections'
  ],
  causes: ['Insulin resistance', 'Beta-cell dysfunction', 'Genetic tendency', 'Diet and lifestyle factors'],
  riskFactors: ['Family history', 'Abdominal obesity', 'Sedentary lifestyle', 'Previous gestational diabetes', 'Hypertension'],
  diagnosis:
    'Diagnosis is made through sugar profile trends, symptom history, and doctor assessment with previous treatment review.',
  tests: ['Fasting / post-prandial glucose', 'HbA1c', 'Kidney profile', 'Lipid profile', 'Urine microalbumin where needed'],
  treatmentOptions: {
    allopathy: 'Standard sugar-lowering medicines may be needed as per physician advice.',
    homeopathy: 'May be considered for supportive symptom and constitution-based chronic care where suitable.',
    lifestyle: 'Diet discipline, activity plan, sleep correction, and weight management are essential.'
  },
  homeCare: ['Home glucose tracking', 'Meal timing consistency', 'Foot care and hydration'],
  prevention: ['Weight control', 'Early screening in high-risk adults', 'Regular follow-up to prevent complications'],
  severityLevel: 'Controlled patients are suitable for planned online follow-up; severe sugar extremes require urgent in-person care.',
  whenToSeeDoctor: 'Consult for persistent high sugars, hypoglycemia episodes, recurrent infections, or signs of complications.',
  emergencySigns: ['Confusion', 'Vomiting with very high sugar', 'Loss of consciousness', 'Severe hypoglycemia symptoms'],
  careApproach: [
    'Review sugar pattern and medication adherence',
    'Screen for related comorbidities and complications',
    'Build a realistic daily routine plan',
    'Follow progress with repeat metrics and follow-up'
  ],
  details: [
    'Diabetes frequently co-exists with hypertension, lipid imbalance, and kidney risk.',
    'Long-term control is improved by routine, monitoring, and early correction of deviations.',
    'Care plans should be individualized by age, risk, and comorbid burden.'
  ]
};
