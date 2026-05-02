import { DiseaseInfo } from '../models';

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
  faq: [
    {
      question: 'What is the difference between osteoarthritis and rheumatoid arthritis?',
      answer:
        'Osteoarthritis is a degenerative condition caused by wear and tear of joint cartilage, most common in knees, hips, and spine in older adults. Rheumatoid arthritis is an autoimmune inflammatory condition that attacks the joint lining, typically affecting smaller joints symmetrically and occurring at a younger age. Treatment approaches differ significantly between the two.'
    },
    {
      question: 'Can joint pain be managed without surgery?',
      answer:
        'Yes, in most cases. Mild to moderate osteoarthritis and many inflammatory joint conditions can be managed with pain relief, physiotherapy, weight reduction, activity modification, and appropriate medications. Surgery (joint replacement) is considered when pain is severe, function is significantly impaired, and conservative measures have failed.'
    },
    {
      question: 'Does homeopathy help with joint and bone conditions?',
      answer:
        'Homeopathy may be considered as adjunct care for chronic joint pain, stiffness, and inflammatory tendency. Remedies like Rhus toxicodendron, Bryonia, Calcarea carbonica, and Arnica are commonly used based on individual symptom patterns. It works best as part of a combined approach with physiotherapy and lifestyle correction.'
    },
    {
      question: 'Can I consult online for joint pain?',
      answer:
        'Yes. Chronic joint pain review, medication guidance, physiotherapy advice, and follow-up are well-suited for online consultation. Acute trauma, sudden severe weakness, inability to bear weight, or fever with a hot swollen joint needs urgent in-person evaluation.'
    },
    {
      question: 'How important is exercise for joint conditions?',
      answer:
        'Exercise is one of the most effective treatments for most musculoskeletal conditions. Strengthening muscles around a joint reduces load on the joint itself. Low-impact activities like walking, swimming, and cycling are generally well-tolerated. Complete rest often worsens stiffness and muscle weakness. Your doctor or physiotherapist will guide appropriate activity levels.'
    },
    {
      question: 'What role does Vitamin D play in bone and joint health?',
      answer:
        'Vitamin D is essential for calcium absorption and bone mineralization. Deficiency is very common and contributes to bone pain, muscle weakness, and increased fracture risk. It is also associated with worsening of inflammatory joint conditions. Testing and correcting Vitamin D levels is a routine part of musculoskeletal care.'
    }
  ],
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
