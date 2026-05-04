import { DiseaseInfo } from '../models';

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
  faq: [
    {
      question: 'What is the difference between a heart attack and cardiac arrest?',
      answer:
        'A heart attack (myocardial infarction) occurs when a blocked artery cuts off blood supply to part of the heart muscle. The heart usually keeps beating. Cardiac arrest is when the heart suddenly stops beating entirely, causing loss of consciousness and no pulse. A heart attack can trigger cardiac arrest. Both are emergencies — call for help immediately.'
    },
    {
      question: 'Can cardiovascular disease be prevented?',
      answer:
        'Yes, significantly. Most cardiovascular disease is driven by modifiable risk factors — high blood pressure, high cholesterol, diabetes, smoking, obesity, and physical inactivity. Controlling these through lifestyle changes and medication when needed can dramatically reduce the risk of heart attack and stroke. Early screening and consistent follow-up are key.'
    },
    {
      question: 'What cholesterol levels should I aim for?',
      answer:
        'General targets: LDL (bad cholesterol) below 100 mg/dL for most adults, below 70 mg/dL for those with existing heart disease or high risk. HDL (good cholesterol) above 40 mg/dL for men and above 50 mg/dL for women. Triglycerides below 150 mg/dL. Your doctor will set personalized targets based on your overall cardiovascular risk.'
    },
    {
      question: 'Can I consult online for cardiovascular care?',
      answer:
        'Yes. Stable chronic cardiovascular follow-up, risk factor management, medication review, and lifestyle guidance are well-suited for online consultation. Acute chest pain, sudden breathlessness, fainting, or stroke-like symptoms (face drooping, arm weakness, speech difficulty) require immediate emergency care — do not wait for an online consultation.'
    },
    {
      question: 'Does homeopathy help with cardiovascular conditions?',
      answer:
        'Homeopathy may be considered as supportive care for stress-related symptoms, palpitations, and constitutional management in stable cardiovascular conditions. It does not replace essential cardiac medications. Never stop prescribed heart or blood pressure medicines to try homeopathy alone — this can be life-threatening.'
    },
    {
      question: 'How does obesity affect heart health?',
      answer:
        'Obesity increases the workload on the heart, raises blood pressure, worsens cholesterol levels, promotes insulin resistance, and triggers chronic inflammation — all of which accelerate cardiovascular disease. Even a 5–10% reduction in body weight significantly improves blood pressure, cholesterol, and blood sugar, reducing cardiovascular risk.'
    }
  ],
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
