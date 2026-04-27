import { DiseaseInfo } from '../models';

export const pilesDiseaseInfo: DiseaseInfo = {
  slug: 'piles',
  name: 'Piles (Hemorrhoids)',
  shortName: 'Piles Care',
  imageUrl:
    'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Piles consultation',
  category: 'Proctology',
  diseaseType: 'Chronic / recurrent anorectal condition',
  icdCode: 'I84 group',
  about: 'Supportive care for hemorrhoids causing pain, bleeding, and bowel discomfort.',
  summary:
    'Piles are common and often linked with constipation, straining, and prolonged sitting; many cases need lifestyle correction with medical follow-up.',
  symptoms: ['Pain during bowel movement', 'Rectal bleeding', 'Itching', 'Swelling or lump near anus'],
  causes: ['Increased venous pressure in anorectal region', 'Chronic straining', 'Constipation'],
  riskFactors: ['Low-fiber diet', 'Sedentary lifestyle', 'Pregnancy', 'Obesity', 'Chronic constipation'],
  diagnosis: 'Diagnosis is based on symptom history and anorectal examination by a qualified clinician.',
  tests: ['Usually clinical diagnosis', 'Proctoscopy in selected cases', 'Additional GI evaluation if red flags are present'],
  treatmentOptions: {
    allopathy: 'Medical therapy and procedural/surgical options may be needed based on grade and severity.',
    homeopathy: 'May be considered as supportive symptom care in selected non-emergency cases.',
    lifestyle: 'Fiber-rich diet, hydration, bowel habit correction, and avoiding prolonged straining are important.'
  },
  homeCare: ['Increase fiber and fluids', 'Avoid constipation', 'Use sitz bath where advised'],
  prevention: ['Regular bowel habits', 'Exercise', 'Limit prolonged sitting', 'Timely treatment of constipation'],
  severityLevel: 'Mild to moderate cases can be guided online; heavy bleeding or severe pain needs urgent in-person care.',
  whenToSeeDoctor: 'Consult for recurrent bleeding, painful swelling, persistent symptoms, or suspected fissure/fistula overlap.',
  emergencySigns: ['Heavy rectal bleeding', 'Severe persistent pain', 'Fever with anal swelling'],
  careApproach: [
    'Understand symptom severity and bleeding pattern',
    'Differentiate piles from other anorectal conditions',
    'Start conservative care and monitor response',
    'Escalate to specialist care when required'
  ],
  details: [
    'Early lifestyle correction can prevent recurrence in many patients.',
    'Persistent bleeding should always be clinically evaluated.',
    'Treatment depends on grade, symptoms, and quality-of-life impact.'
  ]
};
