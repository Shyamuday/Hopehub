/** Standard clinic disease names grouped by `publicCategory` — used to seed/sync the Disease table. */
export const DISEASE_CATALOG_TEMPLATE: Array<{ publicCategory: string; names: string[] }> = [
  {
    publicCategory: 'mental-disease',
    names: ['Absent mindedness', 'Abusiveness', 'Alcoholism', 'Irritability', 'Mood swings', 'Depression', 'Anxiety disorder', 'Panic tendency', 'Fear and phobias', 'Insomnia']
  },
  {
    publicCategory: 'nervous-system',
    names: ['Migraine', 'Neuralgia', 'Vertigo', 'Trigeminal pain', 'Neuropathy', 'Tremors', 'Epileptic tendency', 'Nerve weakness']
  },
  {
    publicCategory: 'eye-vision',
    names: ['Weak vision', 'Eye strain', 'Dry eyes', 'Watering eyes']
  },
  {
    publicCategory: 'ear-hearing',
    names: ['Ear pain', 'Ear discharge', 'Tinnitus', 'Hearing weakness']
  },
  {
    publicCategory: 'nose-throat-larynx',
    names: ['Sinusitis', 'Rhinitis', 'Nasal allergy', 'Post nasal drip', 'Tonsillitis', 'Pharyngitis', 'Laryngitis', 'Voice strain']
  },
  {
    publicCategory: 'gums-mouth-teeth-tongue',
    names: ['Gingivitis', 'Bleeding gums', 'Toothache tendency', 'Dental sensitivity', 'Mouth ulcers', 'Bad breath', 'Tongue coating', 'Dry mouth']
  },
  {
    publicCategory: 'chest-lungs-cough',
    names: ['Chronic cough', 'Bronchitis', 'Asthmatic tendency', 'Chest congestion', 'Breathlessness']
  },
  {
    publicCategory: 'heart-blood-vessel',
    names: ['Palpitations', 'Cardiac weakness tendency', 'Raised cholesterol', 'Hypertension', 'Fluctuating BP', 'Stress-linked BP rise']
  },
  {
    publicCategory: 'digestive-system',
    names: ['Acidity', 'Gastritis tendency', 'Gallstone tendency', 'Liver cirrhosis support', 'Piles', 'Constipation', 'IBS tendency', 'Bloating tendency']
  },
  {
    publicCategory: 'urinary-system',
    names: ['UTI tendency', 'Burning urination', 'Frequent urination', 'Chronic kidney disease support']
  },
  {
    publicCategory: 'genitals',
    names: ['Sexual weakness', 'Low libido', 'Menstrual irregularity', 'Leucorrhoea', 'PCOS tendency']
  },
  {
    publicCategory: 'bones-joints-muscles',
    names: ['Joint pain', 'Arthritis tendency', 'Back pain', 'Neck pain', 'Sciatica', 'Muscle spasm']
  },
  {
    publicCategory: 'skin-hair-nail',
    names: ['Acne', 'Eczema tendency', 'Psoriasis tendency', 'Rashes', 'Pigmentation', 'Hair fall', 'Dandruff', 'Alopecia tendency', 'Premature greying', 'Brittle nails', 'Nail fungal tendency', 'Nail discoloration', 'Hair Fall Treatment', 'Skin Issues']
  },
  {
    publicCategory: 'fever',
    names: ['Recurrent fever tendency', 'Post-viral weakness', 'Seasonal fever susceptibility']
  },
  {
    publicCategory: 'miscellaneous',
    names: ['Chronic care (general)', 'Diabetes mellitus support', 'Metabolic imbalance', 'Long-standing unexplained symptoms']
  }
];
