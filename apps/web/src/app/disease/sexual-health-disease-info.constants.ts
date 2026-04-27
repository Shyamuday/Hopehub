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
