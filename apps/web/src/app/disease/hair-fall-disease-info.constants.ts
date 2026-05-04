import { DiseaseInfo } from '../models';

export const hairFallDiseaseInfo: DiseaseInfo = {
  slug: 'hair-fall',
  name: 'Hair Fall Treatment',
  shortName: 'Hair Fall Care',
  imageUrl:
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Hair care consultation',
  category: 'Hair and scalp',
  diseaseType: 'Chronic / recurring concern',
  icdCode: 'L65.9',
  about: 'Structured care for hair fall, thinning, dandruff, and scalp health.',
  summary:
    'We look at duration, scalp condition, family history, stress, illness, diet, and medication history before suggesting a treatment path.',
  ourApproach: {
    title: 'Root-cause, homeopathy-led hair fall care',
    intro:
      'We do not look at hair fall as only a cosmetic problem. Our doctors review scalp health, stress, nutrition, illness history, family tendency, sleep, and lifestyle so treatment can target the likely root pattern.',
    points: [
      'Understand the trigger behind shedding instead of only changing shampoo or products',
      'Use individualized homeopathy where suitable to support chronic tendency and recurrence',
      'Keep medicine load minimal and avoid unnecessary aggressive treatment',
      'Track response through follow-up rather than judging from one consultation'
    ]
  },
  symptoms: [
    'Hair fall after fever, stress, weight loss, or lifestyle changes',
    'Dandruff, itching, oily scalp, or scalp infection tendency',
    'Pattern thinning and family history of baldness',
    'Recurring hair fall despite trying multiple products'
  ],
  causes: [
    'Stress, fever, weight loss, or recent illness',
    'Dandruff, scalp inflammation, or poor scalp hygiene',
    'Hormonal tendency and family history',
    'Nutritional gaps or medication history'
  ],
  riskFactors: ['Family history', 'High stress', 'Poor sleep', 'Recent illness', 'Harsh hair products'],
  diagnosis:
    'Diagnosis is based on symptom duration, hair fall pattern, scalp condition, lifestyle history, and doctor review. Photos may be requested during consultation.',
  tests: ['CBC or iron studies if clinically needed', 'Thyroid profile if symptoms suggest', 'Vitamin D/B12 if doctor advises'],
  treatmentOptions: {
    allopathy: 'May include topical or oral medicines when medically necessary after doctor assessment.',
    ayurveda: 'May include supportive routine, diet, and scalp care practices where suitable.',
    homeopathy: 'Individualized homeopathy-led care may be used based on pattern, triggers, and constitution.',
    lifestyle: 'Sleep, protein intake, stress management, and gentle hair care are commonly reviewed.'
  },
  medications: ['Prescription depends on doctor assessment', 'Avoid self-medication or steroid-based scalp products'],
  homeCare: ['Use gentle shampoo', 'Avoid harsh chemical treatments', 'Do not over-oil an infected or itchy scalp'],
  prevention: ['Treat dandruff early', 'Maintain nutrition', 'Avoid crash dieting', 'Track hair fall triggers'],
  severityLevel: 'Mild to moderate cases are suitable for online consultation; rapidly patchy or infected scalp needs closer review.',
  whenToSeeDoctor: 'Consult if hair fall persists beyond 3-4 weeks, is patchy, or is associated with itching, dandruff, pain, or scalp lesions.',
  emergencySigns: ['Sudden painful scalp swelling', 'Pus or spreading infection', 'High fever with scalp symptoms'],
  duration: 'Improvement is usually tracked over weeks to months depending on cause and consistency.',
  stages: ['Initial intake', 'Doctor assessment', 'Prescription and care plan', 'Follow-up review'],
  commonIn: {
    ageGroup: 'Teens to adults',
    gender: 'All genders'
  },
  faq: [
    {
      question: 'Can hair fall stop quickly?',
      answer: 'It depends on the cause. Some shedding improves quickly, while chronic or pattern hair fall needs longer follow-up.'
    },
    {
      question: 'Do I need to upload photos?',
      answer: 'The doctor may request scalp or hairline photos during chat for better assessment.'
    }
  ],
  reviewedBy: 'Vitalis Care and Research Centre care team',
  lastUpdated: '2026-04-27',
  references: ['Clinical review by consultation doctor', 'Patient-provided history and symptom tracking'],
  careApproach: [
    'Short symptom intake before consultation',
    'Doctor-led chat consultation',
    'Homeopathy-led, low-medicine care where suitable',
    'Prescription and follow-up guidance'
  ],
  details: [
    'Hair fall often needs pattern tracking rather than only product changes.',
    'Your doctor may ask for scalp photos, lifestyle history, recent illness history, and family history.',
    'Follow-up helps track shedding, density changes, dandruff, and treatment response.'
  ]
};
