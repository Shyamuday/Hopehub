import { type DiseaseInfo } from '../../interfaces';

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
  faq: [
    {
      question: 'Can liver cirrhosis be reversed?',
      answer:
        'Early-stage fibrosis (scarring before true cirrhosis) can partially reverse if the underlying cause is removed — such as stopping alcohol or treating hepatitis. Established cirrhosis is generally not reversible, but progression can be halted and complications prevented with proper management. Early diagnosis and cause removal give the best outcomes.'
    },
    {
      question: 'What is the difference between fatty liver and cirrhosis?',
      answer:
        'Fatty liver (hepatic steatosis) is an early, often reversible stage where fat accumulates in liver cells. If the cause continues — alcohol, obesity, diabetes — it can progress to inflammation (hepatitis), then fibrosis, and finally cirrhosis, which is advanced scarring with loss of normal liver function. Not all fatty livers progress to cirrhosis.'
    },
    {
      question: 'Can I consult online for liver cirrhosis?',
      answer:
        'Yes. Stable cirrhosis follow-up, medication review, dietary guidance, and complication monitoring planning are suitable for online consultation. Acute decompensation — vomiting blood, confusion, severe swelling, or jaundice worsening rapidly — requires urgent in-person or emergency care.'
    },
    {
      question: 'What diet should I follow with liver cirrhosis?',
      answer:
        'Avoid alcohol completely — even small amounts accelerate damage. Eat adequate protein (unless your doctor advises restriction for encephalopathy risk). Reduce salt if you have ascites (abdominal fluid). Eat small, frequent meals. Avoid raw shellfish and unpasteurized foods due to infection risk. Your doctor will tailor dietary advice to your stage.'
    },
    {
      question: 'What are the warning signs of liver decompensation?',
      answer:
        'Key warning signs include increasing abdominal swelling (ascites), yellowing of skin or eyes (jaundice), confusion or drowsiness (hepatic encephalopathy), vomiting blood or black stools (variceal bleeding), and significant leg swelling. Any of these needs urgent medical attention.'
    },
    {
      question: 'Does homeopathy help in liver cirrhosis?',
      answer:
        'Homeopathy may be considered as supportive care for symptom management — fatigue, appetite, and general well-being — in stable, hepatologist-supervised cirrhosis. It does not replace specialist hepatology care or essential medications. Treatment should always be coordinated with your liver specialist.'
    }
  ],
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
