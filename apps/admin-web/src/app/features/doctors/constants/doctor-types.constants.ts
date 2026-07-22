export const HOMEOPATHIC_DOCTOR_TYPES = [
  'CHIEF_CONSULTANT',
  'JUNIOR_DOCTOR',
  'SPECIALIST_CONSULTANT',
  'VISITING_DOCTOR',
  'TELEMEDICINE_DOCTOR',
  'MEDICAL_INTERN',
  'RESIDENT_MEDICAL_OFFICER',
] as const;

export type HomeopathicDoctorType = (typeof HOMEOPATHIC_DOCTOR_TYPES)[number];

export const HOMEOPATHIC_SPECIALTY_FOCUSES = [
  'SKIN',
  'CHILD',
  'WOMENS_HEALTH',
  'CHRONIC_DISEASES',
] as const;

export type HomeopathicSpecialtyFocus = (typeof HOMEOPATHIC_SPECIALTY_FOCUSES)[number];

export const PROVIDER_TYPES = [
  'DOCTOR',
  'HOMEOPATH',
  'AYURVEDA_DOCTOR',
  'COUNSELLOR',
  'PSYCHOLOGIST',
  'PSYCHIATRIST',
  'PSYCHOTHERAPIST',
  'THERAPIST',
  'PHYSIOTHERAPIST',
  'OCCUPATIONAL_THERAPIST',
  'SPEECH_THERAPIST',
  'DIETITIAN',
  'NUTRITIONIST',
  'YOGA_INSTRUCTOR',
  'FITNESS_TRAINER',
  'HEALTH_COACH',
  'PHARMACIST',
  'NURSE',
  'MIDWIFE',
  'LAB_TECHNICIAN',
  'PHLEBOTOMIST',
  'RADIOLOGIST',
  'PATHOLOGIST',
  'DENTIST',
  'SURGEON',
  'SPECIALIST',
  'MEDICAL_SOCIAL_WORKER',
  'GENETIC_COUNSELLOR',
  'DIABETES_EDUCATOR',
  'WELLNESS_COACH',
  'CAREGIVER',
  'HOME_CARE_PROVIDER',
  'LIFE_COACH',
  'REHABILITATION_SPECIALIST',
  'OTHER',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  DOCTOR: 'Doctor',
  HOMEOPATH: 'Homeopathic Doctor',
  AYURVEDA_DOCTOR: 'Ayurvedic Doctor',
  COUNSELLOR: 'Counsellor',
  PSYCHOLOGIST: 'Psychologist',
  PSYCHIATRIST: 'Psychiatrist',
  PSYCHOTHERAPIST: 'Psychotherapist',
  THERAPIST: 'Therapist',
  PHYSIOTHERAPIST: 'Physiotherapist',
  OCCUPATIONAL_THERAPIST: 'Occupational Therapist',
  SPEECH_THERAPIST: 'Speech Therapist',
  DIETITIAN: 'Dietitian',
  NUTRITIONIST: 'Nutritionist',
  YOGA_INSTRUCTOR: 'Yoga Instructor',
  FITNESS_TRAINER: 'Fitness Trainer',
  HEALTH_COACH: 'Health Coach',
  PHARMACIST: 'Pharmacist',
  NURSE: 'Nurse',
  MIDWIFE: 'Midwife',
  LAB_TECHNICIAN: 'Lab Technician',
  PHLEBOTOMIST: 'Phlebotomist',
  RADIOLOGIST: 'Radiologist',
  PATHOLOGIST: 'Pathologist',
  DENTIST: 'Dentist',
  SURGEON: 'Surgeon',
  SPECIALIST: 'Specialist',
  MEDICAL_SOCIAL_WORKER: 'Medical Social Worker',
  GENETIC_COUNSELLOR: 'Genetic Counsellor',
  DIABETES_EDUCATOR: 'Diabetes Educator',
  WELLNESS_COACH: 'Wellness Coach',
  CAREGIVER: 'Caregiver',
  HOME_CARE_PROVIDER: 'Home Care Provider',
  LIFE_COACH: 'Life Coach',
  REHABILITATION_SPECIALIST: 'Rehabilitation Specialist',
  OTHER: 'Other Healthcare Professional',
};

export const DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathic Doctor (Chief Consultant)',
  JUNIOR_DOCTOR: 'Junior Homeopathic Doctor',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Doctor',
  TELEMEDICINE_DOCTOR: 'Telemedicine Doctor',
  MEDICAL_INTERN: 'Medical Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Medical Officer (RMO)',
};

export const SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases',
};

export const DOCTOR_TYPE_OPTIONS = HOMEOPATHIC_DOCTOR_TYPES.map((value) => ({
  value,
  label: DOCTOR_TYPE_LABELS[value],
}));

export const SPECIALTY_FOCUS_OPTIONS = HOMEOPATHIC_SPECIALTY_FOCUSES.map((value) => ({
  value,
  label: SPECIALTY_FOCUS_LABELS[value],
}));

export const PROVIDER_TYPE_OPTIONS = PROVIDER_TYPES.map((value) => ({
  value,
  label: PROVIDER_TYPE_LABELS[value],
}));
