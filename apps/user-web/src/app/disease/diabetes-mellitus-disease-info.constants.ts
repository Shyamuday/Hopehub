import { DiseaseInfo } from '../models';

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
  about:
    'Long-term diabetes management support for adults with blood sugar fluctuations and comorbidity risk.',
  summary:
    'Diabetes is highly prevalent among both men and women in the region and is commonly seen as a major co-morbidity in adult patients.',
  symptoms: [
    'Frequent urination and increased thirst',
    'Unexplained fatigue',
    'Blurred vision',
    'Delayed wound healing or recurrent infections',
  ],
  causes: [
    'Insulin resistance',
    'Beta-cell dysfunction',
    'Genetic tendency',
    'Diet and lifestyle factors',
  ],
  riskFactors: [
    'Family history',
    'Abdominal obesity',
    'Sedentary lifestyle',
    'Previous gestational diabetes',
    'Hypertension',
  ],
  diagnosis:
    'Diagnosis is made through sugar profile trends, symptom history, and provider assessment with previous treatment review.',
  tests: [
    'Fasting / post-prandial glucose',
    'HbA1c',
    'Kidney profile',
    'Lipid profile',
    'Urine microalbumin where needed',
  ],
  treatmentOptions: {
    allopathy: 'Standard sugar-lowering medicines may be needed as per physician advice.',
    homeopathy:
      'May be considered for supportive symptom and constitution-based chronic care where suitable.',
    lifestyle:
      'Diet discipline, activity plan, sleep correction, and weight management are essential.',
  },
  homeCare: ['Home glucose tracking', 'Meal timing consistency', 'Foot care and hydration'],
  prevention: [
    'Weight control',
    'Early screening in high-risk adults',
    'Regular follow-up to prevent complications',
  ],
  severityLevel:
    'Controlled patients are suitable for planned online follow-up; severe sugar extremes require urgent in-person care.',
  whenToSeeDoctor:
    'Consult for persistent high sugars, hypoglycemia episodes, recurrent infections, or signs of complications.',
  emergencySigns: [
    'Confusion',
    'Vomiting with very high sugar',
    'Loss of consciousness',
    'Severe hypoglycemia symptoms',
  ],
  faq: [
    {
      question: 'What is the difference between Type 1 and Type 2 diabetes?',
      answer:
        'Type 1 diabetes is an autoimmune condition where the body produces no insulin and requires lifelong insulin therapy. Type 2 diabetes is far more common and involves insulin resistance — the body produces insulin but cannot use it effectively. Type 2 is strongly linked to lifestyle, obesity, and family history and is managed with diet, exercise, and medications.',
    },
    {
      question: 'What is a good HbA1c target?',
      answer:
        'For most adults with Type 2 diabetes, an HbA1c below 7% is the general target. However, targets are individualized — older patients or those with frequent hypoglycemia may have a relaxed target of 7.5–8%. Your provider will set a target based on your age, duration of diabetes, and comorbidities.',
    },
    {
      question: 'Can diabetes be reversed?',
      answer:
        'Type 2 diabetes can go into remission — meaning blood sugar returns to normal without medication — through significant weight loss, dietary change, and exercise, especially in early-stage disease. This is not a cure; the tendency remains and monitoring should continue. Type 1 diabetes cannot be reversed.',
    },
    {
      question: 'Can I consult online for diabetes management?',
      answer:
        'Yes. Routine diabetes follow-up, sugar pattern review, medication adjustment guidance, and lifestyle planning are well-suited for online consultation. Severe hypoglycemia, diabetic ketoacidosis, or acute complications need emergency in-person care.',
    },
    {
      question: 'Does homeopathy help with diabetes?',
      answer:
        'Homeopathy may be considered as supportive care for symptom management and constitutional treatment in stable diabetes. It does not replace essential diabetes medications. Any homeopathic treatment should be coordinated with your treating physician and should not lead to stopping prescribed medicines.',
    },
    {
      question: 'What are the early signs of diabetic complications?',
      answer:
        'Early warning signs include protein in urine (kidney involvement), numbness or tingling in feet (neuropathy), blurred vision (retinopathy), and slow wound healing. Regular screening — kidney function, eye check, foot examination — is essential to catch complications early when they are still manageable.',
    },
    {
      question: 'How often should I check my blood sugar at home?',
      answer:
        'Frequency depends on your treatment. Patients on insulin may need to check 2–4 times daily. Those on oral medications may check fasting and post-meal readings a few times a week. Your provider will advise a monitoring schedule based on your control and treatment plan.',
    },
  ],
  careApproach: [
    'Review sugar pattern and medication adherence',
    'Screen for related comorbidities and complications',
    'Build a realistic daily routine plan',
    'Follow progress with repeat metrics and follow-up',
  ],
  details: [
    'Diabetes frequently co-exists with hypertension, lipid imbalance, and kidney risk.',
    'Long-term control is improved by routine, monitoring, and early correction of deviations.',
    'Care plans should be individualized by age, risk, and comorbid burden.',
  ],
};
