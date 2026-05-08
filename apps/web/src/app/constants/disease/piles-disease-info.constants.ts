import { type DiseaseInfo } from '../../interfaces';

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
  faq: [
    {
      question: 'What is the difference between internal and external piles?',
      answer:
        'Internal piles develop inside the rectum and are usually painless but may bleed. External piles develop under the skin around the anus and can be painful, especially if a clot forms (thrombosed hemorrhoid). Many people have both. Grade and type determine the treatment approach.'
    },
    {
      question: 'Can piles be treated without surgery?',
      answer:
        'Yes. Most mild to moderate piles (Grade 1 and 2) respond well to dietary changes, fiber supplementation, hydration, sitz baths, and topical or oral medications. Grade 3 and 4 piles, or those that do not respond to conservative care, may need procedures like rubber band ligation, sclerotherapy, or surgery. Your doctor will assess the grade and guide the appropriate path.'
    },
    {
      question: 'Does homeopathy help with piles?',
      answer:
        'Homeopathy has a well-established role in piles management. Remedies like Aesculus hippocastanum, Hamamelis, Nux vomica, Collinsonia, and Aloe socotrina are commonly used based on the symptom pattern — bleeding, pain, burning, prolapse tendency, and associated constipation. Constitutional treatment helps reduce recurrence.'
    },
    {
      question: 'Is rectal bleeding always from piles?',
      answer:
        'No. While piles are a common cause of rectal bleeding, other conditions — anal fissure, polyps, inflammatory bowel disease, or colorectal cancer — can also cause bleeding. Any rectal bleeding should be evaluated by a doctor, especially if it is persistent, associated with change in bowel habits, or occurs in people above 40.'
    },
    {
      question: 'Can I consult online for piles?',
      answer:
        'Yes. Symptom review, dietary guidance, medication advice, and follow-up are suitable for online consultation. Heavy or persistent bleeding, severe pain, fever with anal swelling, or suspected fistula needs in-person clinical examination.'
    },
    {
      question: 'What dietary changes help with piles?',
      answer:
        'Increase dietary fiber through fruits, vegetables, whole grains, and legumes. Drink at least 2–2.5 litres of water daily. Avoid straining during bowel movements — do not delay when you feel the urge. Reduce spicy, processed, and low-fiber foods. Regular physical activity also helps maintain bowel regularity.'
    }
  ],
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
