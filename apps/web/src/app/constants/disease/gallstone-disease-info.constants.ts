import { type DiseaseInfo } from '../../interfaces';

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
  faq: [
    {
      question: 'Do all gallstones need surgery?',
      answer:
        'No. Silent gallstones (found incidentally with no symptoms) often do not need immediate surgery and can be monitored. Surgery is recommended when stones cause recurrent pain, acute cholecystitis, biliary obstruction, or pancreatitis. Your doctor will assess symptom burden and imaging to guide the decision.'
    },
    {
      question: 'What triggers gallstone pain?',
      answer:
        'Gallstone pain (biliary colic) is typically triggered by fatty, fried, or heavy meals that stimulate the gallbladder to contract. Pain usually starts 30–60 minutes after eating, is felt in the right upper abdomen or back, and can last from 30 minutes to several hours. Avoiding fatty meals reduces the frequency of attacks.'
    },
    {
      question: 'Can gallstones dissolve on their own?',
      answer:
        'Cholesterol gallstones can occasionally dissolve with oral bile acid therapy (ursodeoxycholic acid), but this works only for small, non-calcified stones and takes months to years. Most stones do not dissolve on their own. Pigment stones do not respond to dissolution therapy.'
    },
    {
      question: 'Can I consult online for gallstone symptoms?',
      answer:
        'Yes. Symptom review, dietary guidance, trigger management, and follow-up planning are suitable for online consultation. Acute severe pain, fever with jaundice, or persistent vomiting needs urgent in-person or emergency care.'
    },
    {
      question: 'What diet should I follow with gallstones?',
      answer:
        'Avoid high-fat, fried, and greasy foods as they trigger gallbladder contractions. Eat smaller, more frequent meals. Include fiber-rich foods, fruits, and vegetables. Maintain a healthy weight — rapid weight loss can actually increase stone formation risk. Stay well hydrated.'
    },
    {
      question: 'What is the difference between gallstones and kidney stones?',
      answer:
        'Gallstones form in the gallbladder from cholesterol or bile pigments and cause right upper abdominal pain after meals. Kidney stones form in the kidneys from minerals in urine and cause severe flank or back pain radiating to the groin. They are different conditions requiring different investigations and treatment.'
    }
  ],
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
