export type DiseaseCategoryListItem = {
  id: string;
  label: string;
  subSections: Array<{
    id: string;
    label: string;
    diseaseNames: string[];
  }>;
};

export const diseaseCategoryList: DiseaseCategoryListItem[] = [
  {
    id: 'mental-disease',
    label: 'Mental disease',
    subSections: [
      {
        id: 'mental-behavior',
        label: 'Behavior and mood',
        diseaseNames: ['Absent mindedness', 'Abusiveness', 'Alcoholism', 'Irritability', 'Mood swings', 'Depression']
      },
      {
        id: 'mental-anxiety',
        label: 'Anxiety and stress',
        diseaseNames: ['Anxiety disorder', 'Panic tendency', 'Fear and phobias', 'Insomnia']
      }
    ]
  },
  {
    id: 'nervous-system',
    label: 'Nervous system',
    subSections: [
      {
        id: 'nervous-headache',
        label: 'Head and nerve disorders',
        diseaseNames: ['Migraine', 'Neuralgia', 'Vertigo', 'Trigeminal pain']
      },
      {
        id: 'nervous-neuro',
        label: 'Neurological weakness',
        diseaseNames: ['Neuropathy', 'Tremors', 'Epileptic tendency', 'Nerve weakness']
      }
    ]
  },
  {
    id: 'eye-vision',
    label: 'Eye and vision',
    subSections: [
      {
        id: 'eye-common',
        label: 'Common vision issues',
        diseaseNames: ['Weak vision', 'Eye strain', 'Dry eyes', 'Watering eyes']
      }
    ]
  },
  {
    id: 'ear-hearing',
    label: 'Ear and hearing',
    subSections: [
      {
        id: 'ear-common',
        label: 'General ear problems',
        diseaseNames: ['Ear pain', 'Ear discharge', 'Tinnitus', 'Hearing weakness']
      }
    ]
  },
  {
    id: 'nose-throat-larynx',
    label: 'Nose throat larynx',
    subSections: [
      {
        id: 'ntl-sinus',
        label: 'Nose and sinus',
        diseaseNames: ['Sinusitis', 'Rhinitis', 'Nasal allergy', 'Post nasal drip']
      },
      {
        id: 'ntl-throat',
        label: 'Throat and voice',
        diseaseNames: ['Tonsillitis', 'Pharyngitis', 'Laryngitis', 'Voice strain']
      }
    ]
  },
  {
    id: 'gums-mouth-teeth-tongue',
    label: 'Gums mouth teeth tongue',
    subSections: [
      {
        id: 'oral-gums',
        label: 'Gums and teeth',
        diseaseNames: ['Gingivitis', 'Bleeding gums', 'Toothache tendency', 'Dental sensitivity']
      },
      {
        id: 'oral-mouth',
        label: 'Mouth and tongue',
        diseaseNames: ['Mouth ulcers', 'Bad breath', 'Tongue coating', 'Dry mouth']
      }
    ]
  },
  {
    id: 'chest-lungs-cough',
    label: 'Chest lungs cough',
    subSections: [
      {
        id: 'chest-respiratory',
        label: 'Respiratory diseases',
        diseaseNames: ['Chronic cough', 'Bronchitis', 'Asthmatic tendency', 'Chest congestion', 'Breathlessness']
      }
    ]
  },
  {
    id: 'heart-blood-vessel',
    label: 'Heart blood vessel',
    subSections: [
      {
        id: 'heart-cardiac',
        label: 'Heart concerns',
        diseaseNames: ['Palpitations', 'Cardiac weakness tendency', 'Raised cholesterol']
      },
      {
        id: 'heart-bp',
        label: 'Blood pressure',
        diseaseNames: ['Hypertension', 'Fluctuating BP', 'Stress-linked BP rise']
      }
    ]
  },
  {
    id: 'digestive-system',
    label: 'Digestive system',
    subSections: [
      {
        id: 'digestive-upper',
        label: 'Upper digestive',
        diseaseNames: ['Acidity', 'Gastritis tendency', 'Gallstone tendency', 'Liver cirrhosis support']
      },
      {
        id: 'digestive-lower',
        label: 'Lower digestive',
        diseaseNames: ['Piles', 'Constipation', 'IBS tendency', 'Bloating tendency']
      }
    ]
  },
  {
    id: 'urinary-system',
    label: 'Urinary system',
    subSections: [
      {
        id: 'urinary-general',
        label: 'Urinary diseases',
        diseaseNames: ['UTI tendency', 'Burning urination', 'Frequent urination', 'Chronic kidney disease support']
      }
    ]
  },
  {
    id: 'genitals',
    label: 'Genitals',
    subSections: [
      {
        id: 'genitals-general',
        label: 'Genital health',
        diseaseNames: ['Sexual weakness', 'Low libido', 'Menstrual irregularity', 'Leucorrhoea', 'PCOS tendency']
      }
    ]
  },
  {
    id: 'bones-joints-muscles',
    label: 'Bones joints muscles',
    subSections: [
      {
        id: 'musculo-general',
        label: 'Musculoskeletal diseases',
        diseaseNames: ['Joint pain', 'Arthritis tendency', 'Back pain', 'Neck pain', 'Sciatica', 'Muscle spasm']
      }
    ]
  },
  {
    id: 'skin-hair-nail',
    label: 'Skin hair nail',
    subSections: [
      {
        id: 'skin-group',
        label: 'Skin',
        diseaseNames: ['Acne', 'Eczema tendency', 'Psoriasis tendency', 'Rashes', 'Pigmentation']
      },
      {
        id: 'hair-group',
        label: 'Hair',
        diseaseNames: ['Hair fall', 'Dandruff', 'Alopecia tendency', 'Premature greying']
      },
      {
        id: 'nail-group',
        label: 'Nail',
        diseaseNames: ['Brittle nails', 'Nail fungal tendency', 'Nail discoloration']
      }
    ]
  },
  {
    id: 'fever',
    label: 'Fever',
    subSections: [
      {
        id: 'fever-general',
        label: 'Fever diseases',
        diseaseNames: ['Recurrent fever tendency', 'Post-viral weakness', 'Seasonal fever susceptibility']
      }
    ]
  },
  {
    id: 'miscellaneous',
    label: 'Miscellaneous',
    subSections: [
      {
        id: 'misc-chronic',
        label: 'Chronic and metabolic',
        diseaseNames: ['Chronic care (general)', 'Diabetes mellitus support', 'Metabolic imbalance', 'Long-standing unexplained symptoms']
      }
    ]
  }
];
