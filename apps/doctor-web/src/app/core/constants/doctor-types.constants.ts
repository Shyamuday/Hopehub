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

export const PROVIDER_TYPE_OPTIONS = PROVIDER_TYPES.map((value) => ({
  value,
  label: PROVIDER_TYPE_LABELS[value],
}));

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

export type DoctorProfileSummary = {
  providerCategory?: string;
  providerType?: ProviderType;
  providerTypeLabel?: string;
  specialty?: string;
  specialization?: string | null;
  registrationNo?: string | null;
  isAvailable?: boolean;
  doctorType?: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  doctorTypeLabel?: string;
  specialtyFocusLabel?: string | null;
  designation?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas?: string[];
  showOnWebsite?: boolean;
  defaultMethodOptionId?: string | null;
  defaultMethodOption?: { id: string; label: string } | null;
};

export type DoctorCapabilities = {
  slots: boolean;
  earnings: boolean;
  prescribe: boolean;
  caseAnalysis: boolean;
  repertory: boolean;
  sessionNotes: boolean;
  labOrders: boolean;
  reportUploads: boolean;
  onlineConsult: boolean;
};

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorCapabilities> = {
  CHIEF_CONSULTANT: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
  JUNIOR_DOCTOR: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
  SPECIALIST_CONSULTANT: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
  VISITING_DOCTOR: {
    slots: false,
    earnings: false,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
  TELEMEDICINE_DOCTOR: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
  MEDICAL_INTERN: {
    slots: false,
    earnings: false,
    prescribe: false,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: false,
    reportUploads: false,
    onlineConsult: false,
  },
  RESIDENT_MEDICAL_OFFICER: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true,
  },
};

const nonPrescribingConsultProvider: DoctorCapabilities = {
  slots: true,
  earnings: true,
  prescribe: false,
  caseAnalysis: false,
  repertory: false,
  sessionNotes: true,
  labOrders: false,
  reportUploads: false,
  onlineConsult: true,
};

const medicalProvider: DoctorCapabilities = {
  slots: true,
  earnings: true,
  prescribe: true,
  caseAnalysis: true,
  repertory: false,
  sessionNotes: true,
  labOrders: true,
  reportUploads: false,
  onlineConsult: true,
};

export const PROVIDER_TYPE_CAPABILITIES: Record<ProviderType, DoctorCapabilities> = {
  DOCTOR: medicalProvider,
  HOMEOPATH: DOCTOR_TYPE_CAPABILITIES.JUNIOR_DOCTOR,
  AYURVEDA_DOCTOR: medicalProvider,
  COUNSELLOR: nonPrescribingConsultProvider,
  PSYCHOLOGIST: nonPrescribingConsultProvider,
  PSYCHIATRIST: medicalProvider,
  PSYCHOTHERAPIST: nonPrescribingConsultProvider,
  THERAPIST: nonPrescribingConsultProvider,
  PHYSIOTHERAPIST: nonPrescribingConsultProvider,
  OCCUPATIONAL_THERAPIST: nonPrescribingConsultProvider,
  SPEECH_THERAPIST: nonPrescribingConsultProvider,
  DIETITIAN: nonPrescribingConsultProvider,
  NUTRITIONIST: nonPrescribingConsultProvider,
  YOGA_INSTRUCTOR: nonPrescribingConsultProvider,
  FITNESS_TRAINER: nonPrescribingConsultProvider,
  HEALTH_COACH: nonPrescribingConsultProvider,
  PHARMACIST: { ...nonPrescribingConsultProvider, onlineConsult: false },
  NURSE: nonPrescribingConsultProvider,
  MIDWIFE: nonPrescribingConsultProvider,
  LAB_TECHNICIAN: {
    ...nonPrescribingConsultProvider,
    slots: false,
    onlineConsult: false,
    reportUploads: true,
  },
  PHLEBOTOMIST: {
    ...nonPrescribingConsultProvider,
    slots: false,
    onlineConsult: false,
    reportUploads: true,
  },
  RADIOLOGIST: { ...medicalProvider, onlineConsult: false, reportUploads: true },
  PATHOLOGIST: { ...medicalProvider, onlineConsult: false, reportUploads: true },
  DENTIST: medicalProvider,
  SURGEON: medicalProvider,
  SPECIALIST: medicalProvider,
  MEDICAL_SOCIAL_WORKER: nonPrescribingConsultProvider,
  GENETIC_COUNSELLOR: nonPrescribingConsultProvider,
  DIABETES_EDUCATOR: nonPrescribingConsultProvider,
  WELLNESS_COACH: nonPrescribingConsultProvider,
  CAREGIVER: { ...nonPrescribingConsultProvider, onlineConsult: false },
  HOME_CARE_PROVIDER: { ...nonPrescribingConsultProvider, onlineConsult: false },
  LIFE_COACH: nonPrescribingConsultProvider,
  REHABILITATION_SPECIALIST: nonPrescribingConsultProvider,
  OTHER: nonPrescribingConsultProvider,
};

export function capabilitiesForDoctorType(
  type?: HomeopathicDoctorType | null,
  providerType?: ProviderType | null,
): DoctorCapabilities {
  if (providerType === 'HOMEOPATH' || !providerType) {
    return DOCTOR_TYPE_CAPABILITIES[type || 'JUNIOR_DOCTOR'];
  }
  return PROVIDER_TYPE_CAPABILITIES[providerType];
}
