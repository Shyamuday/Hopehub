import { DiseaseInfo } from '../models';

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
  faq: [
    {
      question: 'What blood pressure reading is considered high?',
      answer:
        'A reading of 130/80 mmHg or above is considered elevated. Stage 1 hypertension is 130–139/80–89 mmHg. Stage 2 is 140/90 mmHg or above. A single high reading does not confirm hypertension — diagnosis requires repeated measurements on different occasions. A reading above 180/120 mmHg is a hypertensive crisis requiring immediate care.'
    },
    {
      question: 'Can hypertension be cured?',
      answer:
        'Primary (essential) hypertension cannot be cured but can be very well controlled with medication and lifestyle changes. Some secondary hypertension cases (caused by kidney disease or hormonal conditions) may improve if the underlying cause is treated. Stopping medication without medical advice usually causes BP to rise again.'
    },
    {
      question: 'Can I stop my BP medicines if my readings are normal?',
      answer:
        'No. Normal readings on medication mean the treatment is working, not that hypertension is gone. Stopping medicines without doctor guidance almost always leads to BP rising again. Any change to your medication should only be made in consultation with your doctor.'
    },
    {
      question: 'Does homeopathy help with hypertension?',
      answer:
        'Homeopathy may be considered as supportive care for stress-related symptoms and constitutional management in selected non-emergency hypertension cases. It does not replace antihypertensive medications. Never stop prescribed BP medicines to try homeopathy alone — this can be dangerous.'
    },
    {
      question: 'Can I consult online for blood pressure management?',
      answer:
        'Yes. Routine BP follow-up, medication review, lifestyle guidance, and comorbidity management are well-suited for online consultation. Hypertensive urgency (very high BP with symptoms) or emergency (with chest pain, stroke signs, or breathlessness) requires immediate in-person care.'
    },
    {
      question: 'How does high blood pressure damage the body?',
      answer:
        'Sustained high BP damages blood vessel walls over time, increasing risk of stroke, heart attack, heart failure, kidney disease, and vision problems. It is often called the "silent killer" because damage accumulates without obvious symptoms until a serious event occurs. This is why consistent control and monitoring matter even when you feel well.'
    }
  ],
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
