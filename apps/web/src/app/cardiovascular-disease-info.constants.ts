import { DiseaseInfo } from './models';

export const cardiovascularDiseaseInfo: DiseaseInfo = {
  slug: 'cardiovascular-disease',
  name: 'Cardiovascular Diseases (CVD)',
  shortName: 'Cardiovascular Care',
  imageUrl:
    'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Cardiovascular health consultation',
  category: 'Non-communicable disease (NCD)',
  diseaseType: 'Chronic condition',
  icdCode: 'I00-I99 group',
  about: 'Long-term care support for common cardiovascular conditions and risk profiles.',
  summary:
    'Cardiovascular disease is one of the most reported NCD patterns in tertiary care settings in Ranchi, often associated with abnormal lipid profile and obesity.',
  symptoms: [
    'Chest discomfort or pressure',
    'Breathlessness on exertion',
    'Palpitations or irregular heartbeat',
    'Fatigue, reduced stamina, or leg swelling'
  ],
  causes: ['Atherosclerosis and metabolic risk', 'Long-standing hypertension', 'Abnormal lipid profile', 'Lifestyle and obesity-related factors'],
  riskFactors: ['Obesity', 'High LDL/triglycerides', 'Sedentary routine', 'Smoking', 'Family history of heart disease'],
  diagnosis:
    'Clinical assessment is based on symptom history, risk profile, previous records, and doctor review. Offline investigations can be advised when required.',
  tests: ['Lipid profile', 'Blood sugar panel', 'ECG / Echo as advised', 'Kidney and liver function tests when relevant'],
  treatmentOptions: {
    allopathy: 'May include guideline-based medication and specialist referral when indicated.',
    homeopathy: 'Can be considered as supportive chronic care where clinically suitable.',
    lifestyle: 'Weight management, activity correction, sleep improvement, and nutrition planning are key.'
  },
  homeCare: ['Track BP and weight regularly', 'Follow a low-salt and balanced diet', 'Avoid smoking and alcohol excess'],
  prevention: ['Routine lipid and sugar screening', 'Physical activity', 'Early intervention for obesity and BP issues'],
  severityLevel: 'Stable chronic cases can be guided online; acute chest pain or sudden breathlessness needs emergency offline care.',
  whenToSeeDoctor: 'Consult early for recurrent chest symptoms, low exercise tolerance, high BP history, or known lipid abnormalities.',
  emergencySigns: ['Severe chest pain', 'Sudden breathlessness', 'Fainting', 'Stroke-like symptoms'],
  careApproach: [
    'Assess overall cardiovascular risk and current symptoms',
    'Review comorbid conditions and medication history',
    'Create a long-term plan focused on control and prevention',
    'Monitor response with structured follow-up'
  ],
  details: [
    'CVD burden in Ranchi is closely linked with metabolic and obesity-related risk factors.',
    'Care is usually multidisciplinary and requires consistent follow-up for better outcomes.',
    'Early risk correction can reduce progression and future complications.'
  ],
  warning:
    'This page is for planned chronic care guidance. For suspected heart attack, stroke signs, severe chest pain, or collapse, seek immediate emergency care.'
};
