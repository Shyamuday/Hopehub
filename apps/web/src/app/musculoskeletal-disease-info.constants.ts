import { DiseaseInfo } from './models';

export const musculoskeletalDiseaseInfo: DiseaseInfo = {
  slug: 'musculoskeletal-disease',
  name: 'Musculoskeletal Diseases',
  shortName: 'Joint and Bone Care',
  imageUrl:
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Joint pain and musculoskeletal consultation',
  category: 'Chronic geriatric and adult care',
  diseaseType: 'Chronic degenerative / inflammatory conditions',
  icdCode: 'M00-M99 group',
  about: 'Care support for persistent joint, spine, and bone-related chronic complaints.',
  summary:
    'Regional studies in elderly populations show musculoskeletal problems such as arthritis among the most frequent chronic morbidities.',
  symptoms: ['Joint pain and stiffness', 'Reduced mobility', 'Back or neck pain', 'Morning stiffness and activity limitation'],
  causes: ['Age-related degeneration', 'Inflammatory arthritis', 'Bone density decline', 'Postural and mechanical stress'],
  riskFactors: ['Advanced age', 'Obesity', 'Sedentary habits', 'Prior injuries', 'Vitamin D or calcium deficiency'],
  diagnosis:
    'Assessment includes symptom pattern, functional impact, duration, and previous reports; imaging may be advised offline when needed.',
  tests: ['X-ray / MRI when indicated', 'Inflammatory markers in selected cases', 'Vitamin D and calcium profile where relevant'],
  treatmentOptions: {
    allopathy: 'May include pain and inflammation control, physiotherapy guidance, and specialist referral.',
    homeopathy: 'Can be considered as adjunct chronic symptom care where suitable.',
    lifestyle: 'Posture correction, supervised activity, weight control, and ergonomic changes are important.'
  },
  homeCare: ['Daily mobility exercises', 'Joint protection techniques', 'Heat/cold measures where suitable'],
  prevention: ['Regular activity', 'Fall prevention in elderly', 'Weight management', 'Early attention to persistent pain'],
  severityLevel: 'Mild to moderate chronic symptoms are suitable for planned online guidance; severe acute pain or trauma needs in-person care.',
  whenToSeeDoctor: 'Consult when pain persists, daily activities reduce, swelling recurs, or stiffness progressively worsens.',
  emergencySigns: ['Acute trauma with deformity', 'Sudden severe weakness', 'Inability to walk', 'Fever with hot swollen joint'],
  careApproach: [
    'Map pain pattern and functional limitations',
    'Identify likely inflammatory or degenerative contributors',
    'Set practical pain-reduction and mobility goals',
    'Use follow-up to track movement and symptom control'
  ],
  details: [
    'Joint and bone issues are highly prevalent in elderly and can become disabling without early care.',
    'Long-term outcomes improve with combined symptom control and movement rehabilitation.',
    'Home routine and posture correction are as important as medicines.'
  ]
};
