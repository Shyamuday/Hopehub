export const HOMEOPATHIC_DOCTOR_TYPES = [
  'CHIEF_CONSULTANT',
  'JUNIOR_DOCTOR',
  'SPECIALIST_CONSULTANT',
  'VISITING_DOCTOR',
  'TELEMEDICINE_DOCTOR',
  'MEDICAL_INTERN',
  'RESIDENT_MEDICAL_OFFICER'
] as const;

export type HomeopathicDoctorType = (typeof HOMEOPATHIC_DOCTOR_TYPES)[number];

export const HOMEOPATHIC_SPECIALTY_FOCUSES = ['SKIN', 'CHILD', 'WOMENS_HEALTH', 'CHRONIC_DISEASES'] as const;

export type HomeopathicSpecialtyFocus = (typeof HOMEOPATHIC_SPECIALTY_FOCUSES)[number];

export const DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathic Doctor (Chief Consultant)',
  JUNIOR_DOCTOR: 'Junior Homeopathic Doctor',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Doctor',
  TELEMEDICINE_DOCTOR: 'Telemedicine Doctor',
  MEDICAL_INTERN: 'Medical Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Medical Officer (RMO)'
};

export const SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases'
};

export const DOCTOR_TYPE_OPTIONS = HOMEOPATHIC_DOCTOR_TYPES.map((value) => ({
  value,
  label: DOCTOR_TYPE_LABELS[value]
}));

export const SPECIALTY_FOCUS_OPTIONS = HOMEOPATHIC_SPECIALTY_FOCUSES.map((value) => ({
  value,
  label: SPECIALTY_FOCUS_LABELS[value]
}));

export function doctorTypeLabel(type?: HomeopathicDoctorType | null) {
  return type ? DOCTOR_TYPE_LABELS[type] : 'Doctor';
}

export function specialtyFocusLabel(focus?: HomeopathicSpecialtyFocus | null) {
  return focus ? SPECIALTY_FOCUS_LABELS[focus] : '';
}
