import { DiseaseInfo } from '../models';

export const sexualHealthDiseaseInfo: DiseaseInfo = {
  slug: 'sexual-health',
  name: 'Sexual Health Conditions',
  shortName: 'Sexual Health Care',
  imageUrl:
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Sexual health consultation',
  category: 'Sexual and reproductive health',
  diseaseType: 'Chronic / recurrent and psychosomatic concerns',
  icdCode: 'N and F category varies by diagnosis',
  about: 'Confidential care support for common sexual health concerns in adults.',
  summary:
    'Sexual health problems are common and often underreported due to stigma. Structured, confidential consultation helps identify physical and psychological contributors.',
  symptoms: ['Low libido', 'Erectile difficulties', 'Performance anxiety', 'Painful intercourse', 'Premature ejaculation concerns'],
  causes: ['Psychological stress', 'Hormonal factors', 'Vascular/metabolic causes', 'Relationship and lifestyle issues'],
  riskFactors: ['Diabetes', 'Hypertension', 'Anxiety/depression', 'Substance use', 'Poor sleep and chronic stress'],
  diagnosis: 'Diagnosis requires sensitive history-taking and focused evaluation of medical, psychological, and relationship factors.',
  tests: ['Blood sugar and lipid profile', 'Hormonal profile where indicated', 'Targeted investigations based on symptoms'],
  treatmentOptions: {
    allopathy: 'Medical therapy may be used when indicated after diagnosis.',
    homeopathy: 'May be considered for supportive individualized chronic symptom care where suitable.',
    lifestyle: 'Stress reduction, sleep optimization, and relationship counseling support are often beneficial.'
  },
  homeCare: ['Follow privacy-safe counseling plan', 'Reduce stress and substance triggers', 'Track symptom pattern and triggers'],
  prevention: ['Control chronic diseases', 'Mental health support', 'Open communication and early consultation'],
  severityLevel: 'Most non-emergency concerns are suitable for confidential online consultation and follow-up.',
  whenToSeeDoctor: 'Consult when symptoms persist, affect confidence/relationships, or co-exist with chronic disease.',
  faq: [
    {
      question: 'Is it safe to consult online for sexual health concerns?',
      answer:
        'Yes. Online consultation provides a confidential, non-judgmental space to discuss sexual health concerns without the discomfort of face-to-face disclosure. Your information is kept private. Many sexual health concerns — erectile difficulties, low libido, performance anxiety, and premature ejaculation — can be effectively assessed and managed through structured online consultation.'
    },
    {
      question: 'Can diabetes or hypertension cause sexual health problems?',
      answer:
        'Yes. Diabetes is one of the most common causes of erectile dysfunction — it damages blood vessels and nerves that are essential for sexual function. Hypertension and some antihypertensive medications can also affect sexual function. Managing these underlying conditions is often the most important step in improving sexual health.'
    },
    {
      question: 'Does homeopathy help with sexual health conditions?',
      answer:
        'Homeopathy may be considered for supportive individualized care in sexual health concerns, particularly where psychological, stress-related, or constitutional factors are prominent. Remedies are selected based on the full symptom picture. It works best as part of a combined approach that also addresses underlying medical and psychological contributors.'
    },
    {
      question: 'Is premature ejaculation a medical condition?',
      answer:
        'Yes. Premature ejaculation is a recognized medical condition affecting a significant proportion of men. It can be lifelong (primary) or acquired (secondary, often linked to anxiety, relationship stress, or other health issues). Effective treatments include behavioral techniques, counseling, and in some cases medication. It is not a character flaw and responds well to structured care.'
    },
    {
      question: 'Can stress and anxiety cause sexual health problems?',
      answer:
        'Yes. Psychological factors — performance anxiety, relationship stress, work pressure, and depression — are among the most common contributors to sexual health difficulties. The mind-body connection in sexual function is strong. Addressing mental health alongside any physical contributors gives the best outcomes.'
    },
    {
      question: 'When should I see a doctor for sexual health concerns?',
      answer:
        'Consult when symptoms persist for more than a few weeks, significantly affect your confidence or relationship, or are associated with other health changes like fatigue, weight change, or urinary symptoms. Early consultation prevents the anxiety-avoidance cycle that often makes sexual health concerns worse over time.'
    }
  ],
  careApproach: [
    'Create a confidential and non-judgmental consultation setting',
    'Assess physical, hormonal, and psychological contributors',
    'Build a stepwise treatment and counseling plan',
    'Track improvement through follow-up'
  ],
  details: [
    'Sexual health concerns frequently overlap with stress and chronic metabolic disease.',
    'Evidence-based counseling and medical care can significantly improve quality of life.',
    'Early care prevents worsening anxiety and relationship strain.'
  ]
};
