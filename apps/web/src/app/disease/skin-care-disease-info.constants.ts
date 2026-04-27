import { DiseaseInfo } from '../models';

export const skinCareDiseaseInfo: DiseaseInfo = {
  slug: 'skin-care',
  name: 'Skin Care',
  shortName: 'Skin Care',
  imageUrl:
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Skin care consultation',
  category: 'Skin',
  diseaseType: 'Recurring / inflammatory concern',
  icdCode: 'L70 / L30 group',
  about: 'Care for recurring skin issues, sensitivity, acne, pigmentation, and allergies.',
  summary:
    'Skin concerns often need history, triggers, routine review, and follow-up. We focus on practical care with a gentle treatment approach.',
  ourApproach: {
    title: 'Treat the skin tendency, not just the surface flare',
    intro:
      'We study recurring triggers such as products, stress, hormones, weather, digestion, allergy tendency, and previous cream use. The goal is to reduce repeated flare-ups with gentle, individualized care.',
    points: [
      'Identify triggers and habits that keep the skin condition active',
      'Use homeopathy-led support where suitable for recurring skin tendency',
      'Avoid unnecessary steroid or harsh product dependency',
      'Guide simple routine correction and follow-up tracking'
    ]
  },
  symptoms: [
    'Acne and recurring breakouts',
    'Rashes, itching, and allergy tendency',
    'Pigmentation and uneven skin tone',
    'Sensitive skin and product reactions'
  ],
  causes: ['Hormonal tendency', 'Product reactions', 'Allergy tendency', 'Stress and sleep disturbance', 'Weather or diet triggers'],
  riskFactors: ['Sensitive skin', 'Harsh cosmetics', 'Repeated steroid cream use', 'Sweating and friction', 'Family tendency'],
  diagnosis:
    'Diagnosis is based on visual pattern, symptom history, triggers, previous product use, and doctor assessment. Clear photos are often helpful.',
  tests: ['Usually not required for mild cases', 'Allergy or infection evaluation may be advised if symptoms suggest'],
  treatmentOptions: {
    allopathy: 'May be needed for infection, severe inflammation, or acne depending on doctor review.',
    ayurveda: 'Supportive routine and diet correction may be discussed where relevant.',
    homeopathy: 'Individualized care may be used for recurring tendency and chronic skin patterns.',
    lifestyle: 'Skin routine simplification, trigger avoidance, and hygiene correction are important.'
  },
  medications: ['Avoid unsupervised steroid creams', 'Prescription depends on severity and diagnosis'],
  homeCare: ['Use gentle cleanser', 'Avoid new products during flare', 'Do not scratch or pick lesions'],
  prevention: ['Patch test products', 'Avoid known triggers', 'Maintain simple skincare routine'],
  severityLevel: 'Mild and recurring concerns are suitable online; severe swelling or infection needs urgent offline care.',
  whenToSeeDoctor: 'Consult if symptoms recur, spread, itch severely, leave marks, or do not improve with routine correction.',
  emergencySigns: ['Breathing difficulty', 'Rapid facial swelling', 'High fever', 'Spreading painful redness'],
  duration: 'Depends on cause; follow-up may be needed for recurring acne, pigmentation, or allergy tendency.',
  stages: ['Photo/history review', 'Trigger identification', 'Prescription/routine plan', 'Follow-up'],
  commonIn: {
    ageGroup: 'Children, teens, and adults',
    gender: 'All genders'
  },
  faq: [
    {
      question: 'Can I send skin photos?',
      answer: 'Yes. Clear photos in good lighting help the doctor understand the pattern better.'
    }
  ],
  reviewedBy: 'Betelgeuse Clinic care team',
  lastUpdated: '2026-04-27',
  references: ['Clinical review by consultation doctor'],
  careApproach: [
    'Understand triggers and previous product/medicine use',
    'Review severity, duration, and recurring patterns',
    'Use low-medicine care where appropriate',
    'Guide follow-up and routine correction'
  ],
  details: [
    'Skin problems can be linked to routine, sensitivity, hormones, stress, diet, and weather.',
    'Clear photos and timeline help the doctor understand the case better.',
    'The goal is long-term control, not only short-term suppression.'
  ],
  warning:
    'Severe swelling, breathing difficulty, spreading infection, high fever, burns, or rapidly worsening skin symptoms need urgent offline medical care.'
};
