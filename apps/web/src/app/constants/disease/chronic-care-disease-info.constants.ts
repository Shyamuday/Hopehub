import { type DiseaseInfo } from '../../interfaces';

export const chronicCareDiseaseInfo: DiseaseInfo = {
  slug: 'chronic-care',
  name: 'Chronic and Rare Care',
  shortName: 'Chronic Care',
  imageUrl:
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Chronic care consultation',
  category: 'Chronic care',
  diseaseType: 'Long-running / rare care',
  icdCode: 'Varies by condition',
  about: 'For long-running symptoms that need patience, pattern tracking, and follow-up.',
  summary:
    'Chronic and rare concerns often cannot be understood in one line. We focus on detailed history, symptom patterns, triggers, and continuity of care.',
  ourApproach: {
    title: 'Deep case history for chronic and rare patterns',
    intro:
      'Chronic symptoms often have a pattern across sleep, stress, appetite, weather, past illness, family tendency, and emotional state. Our homeopathy-led approach focuses on the whole case, not only the current complaint.',
    points: [
      'Build a full timeline of symptoms, triggers, past treatment, and recurrence',
      'Look for constitutional patterns that may explain chronic tendency',
      'Use low-medicine care where appropriate without stopping essential existing treatment',
      'Review progress through structured follow-up and symptom tracking'
    ]
  },
  symptoms: [
    'Recurring symptoms over weeks, months, or years',
    'Symptoms that keep returning after temporary relief',
    'Confusing or rare complaints that need deeper history',
    'Cases where follow-up and tracking are important'
  ],
  causes: ['Varies by condition', 'Constitutional tendency', 'Lifestyle and stress patterns', 'Previous illness or treatment history'],
  riskFactors: ['Long symptom duration', 'Multiple previous treatments', 'Family tendency', 'Poor sleep or stress'],
  diagnosis:
    'Chronic care starts with detailed history. The doctor may ask for previous reports, prescriptions, symptom timeline, and trigger patterns.',
  tests: ['Depends on symptoms and previous reports', 'Doctor may request offline tests if needed'],
  treatmentOptions: {
    allopathy: 'Existing allopathic treatment should not be stopped without the treating doctor advice.',
    ayurveda: 'Supportive lifestyle practices may be discussed where appropriate.',
    homeopathy: 'Homeopathy-led care may be considered based on total symptom pattern and chronic tendency.',
    lifestyle: 'Sleep, stress, diet, routine, and trigger tracking are often important.'
  },
  medications: ['Depends on condition and doctor review', 'Do not stop current medicines without medical advice'],
  homeCare: ['Maintain symptom diary', 'Track triggers', 'Keep previous reports ready'],
  prevention: ['Early follow-up', 'Avoid known triggers', 'Do not ignore recurring symptoms'],
  severityLevel: 'Chronic stable cases can be reviewed online; acute worsening needs offline medical care.',
  whenToSeeDoctor: 'Consult when symptoms recur, persist, affect daily life, or remain unexplained despite previous care.',
  emergencySigns: ['Chest pain', 'Breathing difficulty', 'Fainting', 'Severe weakness', 'Sudden neurological symptoms'],
  duration: 'Chronic care is usually tracked over multiple follow-ups.',
  stages: ['Deep case history', 'Pattern assessment', 'Care plan', 'Periodic follow-up'],
  commonIn: {
    ageGroup: 'All age groups depending on condition',
    gender: 'All genders'
  },
  faq: [
    {
      question: 'Can rare or unusual cases be managed online?',
      answer:
        'Online care can support detailed history review, pattern analysis, and follow-up for many chronic and rare cases. Some cases may require offline examination or specific tests that cannot be done remotely. The doctor will guide you on what can be managed online and when an in-person visit is needed.'
    },
    {
      question: 'Should I stop my current medicines before starting homeopathic treatment?',
      answer:
        'No. Never stop existing medicines without the advice of your treating doctor. Homeopathic treatment can be started alongside current medications in most cases. The doctor will review your current treatment and advise on any adjustments over time based on your response.'
    },
    {
      question: 'How long does chronic care take to show results?',
      answer:
        'Chronic conditions that have developed over months or years typically need weeks to months of consistent treatment to show meaningful improvement. Progress is tracked through follow-up consultations. Improvement in sleep, energy, and general well-being often appears before the main complaint resolves.'
    },
    {
      question: 'What information should I bring to a chronic care consultation?',
      answer:
        'Bring a timeline of your symptoms — when they started, what makes them better or worse, what treatments you have tried, and how you responded. Previous reports, prescriptions, and test results are very helpful. The more complete your history, the better the doctor can understand your case.'
    },
    {
      question: 'Can homeopathy help with conditions that have not responded to other treatments?',
      answer:
        'Homeopathy takes a different approach — it looks at the whole person, not just the diagnosis. Cases that have not responded to standard treatment sometimes do well with individualized homeopathic prescribing, particularly when the constitutional and mental-emotional picture is clear. Results depend on case quality, chronicity, and consistency of follow-up.'
    }
  ],
  reviewedBy: 'Vitalis Care and Research Centre care team',
  lastUpdated: '2026-04-27',
  references: ['Patient history', 'Previous medical records when shared', 'Doctor consultation review'],
  careApproach: [
    'Listen deeply to the full case history',
    'Track triggers, timing, recurrence, and response',
    'Create a care plan with follow-up',
    'Use homeopathy-led, low-medicine support where suitable'
  ],
  details: [
    'Chronic cases need continuity and structured notes.',
    'The doctor may ask about sleep, stress, appetite, past illness, family tendency, and previous treatments.',
    'Progress is reviewed over follow-ups rather than judged from a single interaction.'
  ]
};
