import { DiseaseInfo } from './models';

export const respiratoryDiseaseInfo: DiseaseInfo = {
  slug: 'respiratory-disease',
  name: 'Respiratory Diseases',
  shortName: 'Respiratory Care',
  imageUrl:
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Respiratory consultation',
  category: 'Chronic airway conditions',
  diseaseType: 'Recurring / seasonal and chronic respiratory concern',
  icdCode: 'J40-J47 group',
  about: 'Care support for recurrent breathing issues including asthma and COPD patterns.',
  summary:
    'Asthma and COPD are commonly reported in Ranchi, with seasonal upticks in respiratory complaints observed in clinical settings.',
  symptoms: ['Breathlessness', 'Wheezing', 'Chronic cough', 'Chest tightness', 'Sputum in chronic airway disease'],
  causes: ['Airway inflammation', 'Environmental exposure', 'Smoking history', 'Allergic tendency', 'Prior respiratory infections'],
  riskFactors: ['Smoking / passive smoke', 'Air pollution exposure', 'Dust and occupational triggers', 'Allergy history', 'Ageing lungs'],
  diagnosis:
    'Diagnosis is based on symptom timeline, trigger pattern, prior episodes, and doctor evaluation; lung function testing may be advised.',
  tests: ['Spirometry when available', 'Chest imaging if indicated', 'Allergy assessment in selected cases', 'Oxygen saturation monitoring'],
  treatmentOptions: {
    allopathy: 'Inhaler-based treatment and exacerbation care may be required as per physician guidance.',
    homeopathy: 'May be considered as supportive care for recurring symptom tendency in stable patients.',
    lifestyle: 'Trigger avoidance, breathing exercises, smoke avoidance, and vaccination counseling are important.'
  },
  homeCare: ['Use inhalers correctly if prescribed', 'Track trigger exposures', 'Maintain hydration', 'Follow action plan during seasonal changes'],
  prevention: ['Avoid smoke and pollutants', 'Early care for recurrent cough/wheeze', 'Vaccination where recommended'],
  severityLevel: 'Stable chronic follow-up can be managed online; acute severe breathlessness requires urgent offline emergency care.',
  whenToSeeDoctor: 'Consult for repeated wheeze, persistent cough, night symptoms, or reduced exercise tolerance.',
  emergencySigns: ['Severe breathlessness at rest', 'Bluish lips', 'Inability to speak full sentences', 'Low oxygen signs'],
  careApproach: [
    'Identify disease pattern and seasonal triggers',
    'Review prior exacerbations and current control level',
    'Build preventive and maintenance strategy',
    'Track recurrence through periodic follow-up'
  ],
  details: [
    'Respiratory illnesses may worsen seasonally and need anticipatory care planning.',
    'In chronic airway disease, adherence and inhaler technique strongly affect outcomes.',
    'Early intervention reduces severe exacerbations and hospitalization risk.'
  ],
  warning:
    'This service is not for acute respiratory distress. For severe breathlessness or low-oxygen symptoms, seek immediate emergency care.'
};
