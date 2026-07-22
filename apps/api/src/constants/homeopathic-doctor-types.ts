import {
  HomeopathicDoctorType,
  HomeopathicSpecialtyFocus,
  ProviderCategory,
  ProviderType
} from '@prisma/client';
import { z } from 'zod';

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  MEDICAL: 'Medical',
  AYUSH: 'AYUSH',
  MENTAL_HEALTH: 'Mental Health',
  REHAB: 'Rehabilitation',
  DENTAL: 'Dental',
  NURSING: 'Nursing',
  PHARMACY: 'Pharmacy',
  NUTRITION: 'Nutrition',
  DIAGNOSTICS: 'Diagnostics',
  IMAGING: 'Imaging',
  WELLNESS: 'Wellness',
  HOME_CARE: 'Home Care',
  PUBLIC_HEALTH: 'Public Health',
  OTHER: 'Other'
};

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
  OTHER: 'Other Healthcare Professional'
};

export const PROVIDER_TYPE_CATEGORY: Record<ProviderType, ProviderCategory> = {
  DOCTOR: ProviderCategory.MEDICAL,
  HOMEOPATH: ProviderCategory.AYUSH,
  AYURVEDA_DOCTOR: ProviderCategory.AYUSH,
  COUNSELLOR: ProviderCategory.MENTAL_HEALTH,
  PSYCHOLOGIST: ProviderCategory.MENTAL_HEALTH,
  PSYCHIATRIST: ProviderCategory.MENTAL_HEALTH,
  PSYCHOTHERAPIST: ProviderCategory.MENTAL_HEALTH,
  THERAPIST: ProviderCategory.MENTAL_HEALTH,
  PHYSIOTHERAPIST: ProviderCategory.REHAB,
  OCCUPATIONAL_THERAPIST: ProviderCategory.REHAB,
  SPEECH_THERAPIST: ProviderCategory.REHAB,
  DIETITIAN: ProviderCategory.NUTRITION,
  NUTRITIONIST: ProviderCategory.NUTRITION,
  YOGA_INSTRUCTOR: ProviderCategory.WELLNESS,
  FITNESS_TRAINER: ProviderCategory.WELLNESS,
  HEALTH_COACH: ProviderCategory.WELLNESS,
  PHARMACIST: ProviderCategory.PHARMACY,
  NURSE: ProviderCategory.NURSING,
  MIDWIFE: ProviderCategory.NURSING,
  LAB_TECHNICIAN: ProviderCategory.DIAGNOSTICS,
  PHLEBOTOMIST: ProviderCategory.DIAGNOSTICS,
  RADIOLOGIST: ProviderCategory.IMAGING,
  PATHOLOGIST: ProviderCategory.DIAGNOSTICS,
  DENTIST: ProviderCategory.DENTAL,
  SURGEON: ProviderCategory.MEDICAL,
  SPECIALIST: ProviderCategory.MEDICAL,
  MEDICAL_SOCIAL_WORKER: ProviderCategory.PUBLIC_HEALTH,
  GENETIC_COUNSELLOR: ProviderCategory.MEDICAL,
  DIABETES_EDUCATOR: ProviderCategory.NUTRITION,
  WELLNESS_COACH: ProviderCategory.WELLNESS,
  CAREGIVER: ProviderCategory.HOME_CARE,
  HOME_CARE_PROVIDER: ProviderCategory.HOME_CARE,
  LIFE_COACH: ProviderCategory.WELLNESS,
  REHABILITATION_SPECIALIST: ProviderCategory.REHAB,
  OTHER: ProviderCategory.OTHER
};

export const HOMEOPATHIC_DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathic Doctor (Chief Consultant)',
  JUNIOR_DOCTOR: 'Junior Homeopathic Doctor',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Doctor',
  TELEMEDICINE_DOCTOR: 'Telemedicine Doctor',
  MEDICAL_INTERN: 'Medical Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Medical Officer (RMO)'
};

export const HOMEOPATHIC_SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases'
};

export const homeopathicDoctorTypeSchema = z.nativeEnum(HomeopathicDoctorType);
export const homeopathicSpecialtyFocusSchema = z.nativeEnum(HomeopathicSpecialtyFocus);

export type DoctorTypeCapabilities = {
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

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorTypeCapabilities> = {
  CHIEF_CONSULTANT: {
    slots: true,
    earnings: true,
    prescribe: true,
    caseAnalysis: true,
    repertory: true,
    sessionNotes: true,
    labOrders: true,
    reportUploads: false,
    onlineConsult: true
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
    onlineConsult: true
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
    onlineConsult: true
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
    onlineConsult: true
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
    onlineConsult: true
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
    onlineConsult: false
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
    onlineConsult: true
  }
};

const MEDICAL_PROVIDER_CAPABILITIES: DoctorTypeCapabilities = {
  slots: true,
  earnings: true,
  prescribe: true,
  caseAnalysis: true,
  repertory: false,
  sessionNotes: true,
  labOrders: true,
  reportUploads: false,
  onlineConsult: true
};

const NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES: DoctorTypeCapabilities = {
  slots: true,
  earnings: true,
  prescribe: false,
  caseAnalysis: false,
  repertory: false,
  sessionNotes: true,
  labOrders: false,
  reportUploads: false,
  onlineConsult: true
};

export const PROVIDER_TYPE_CAPABILITIES: Record<ProviderType, DoctorTypeCapabilities> = {
  DOCTOR: MEDICAL_PROVIDER_CAPABILITIES,
  HOMEOPATH: DOCTOR_TYPE_CAPABILITIES.JUNIOR_DOCTOR,
  AYURVEDA_DOCTOR: MEDICAL_PROVIDER_CAPABILITIES,
  COUNSELLOR: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  PSYCHOLOGIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  PSYCHIATRIST: MEDICAL_PROVIDER_CAPABILITIES,
  PSYCHOTHERAPIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  THERAPIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  PHYSIOTHERAPIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  OCCUPATIONAL_THERAPIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  SPEECH_THERAPIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  DIETITIAN: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  NUTRITIONIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  YOGA_INSTRUCTOR: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  FITNESS_TRAINER: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  HEALTH_COACH: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  PHARMACIST: { ...NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES, onlineConsult: false },
  NURSE: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  MIDWIFE: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  LAB_TECHNICIAN: {
    ...NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
    slots: false,
    onlineConsult: false,
    reportUploads: true
  },
  PHLEBOTOMIST: {
    ...NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
    slots: false,
    onlineConsult: false,
    reportUploads: true
  },
  RADIOLOGIST: { ...MEDICAL_PROVIDER_CAPABILITIES, onlineConsult: false, reportUploads: true },
  PATHOLOGIST: { ...MEDICAL_PROVIDER_CAPABILITIES, onlineConsult: false, reportUploads: true },
  DENTIST: MEDICAL_PROVIDER_CAPABILITIES,
  SURGEON: MEDICAL_PROVIDER_CAPABILITIES,
  SPECIALIST: MEDICAL_PROVIDER_CAPABILITIES,
  MEDICAL_SOCIAL_WORKER: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  GENETIC_COUNSELLOR: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  DIABETES_EDUCATOR: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  WELLNESS_COACH: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  CAREGIVER: { ...NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES, onlineConsult: false },
  HOME_CARE_PROVIDER: { ...NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES, onlineConsult: false },
  LIFE_COACH: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  REHABILITATION_SPECIALIST: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES,
  OTHER: NON_PRESCRIBING_CONSULT_PROVIDER_CAPABILITIES
};

export const doctorProfileSelect = {
  specialty: true,
  registrationNo: true,
  isAvailable: true,
  doctorType: true,
  specialtyFocus: true,
  providerCategory: true,
  providerType: true,
  specialization: true,
  designation: true,
  bio: true,
  showOnWebsite: true,
  websiteOrder: true,
  yearsOfExperience: true,
  focusAreas: true,
  defaultMethodOptionId: true,
  defaultMethodOption: { select: { id: true, label: true } }
} as const;

export function specialtyFocusLabel(focus: HomeopathicSpecialtyFocus | null | undefined) {
  return focus ? HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[focus] : null;
}

export function doctorTypeLabel(type: HomeopathicDoctorType | null | undefined) {
  return type ? HOMEOPATHIC_DOCTOR_TYPE_LABELS[type] : HOMEOPATHIC_DOCTOR_TYPE_LABELS.JUNIOR_DOCTOR;
}

export function providerTypeLabel(type: ProviderType | null | undefined) {
  return type ? PROVIDER_TYPE_LABELS[type] : PROVIDER_TYPE_LABELS.HOMEOPATH;
}

export function providerCategoryLabel(category: ProviderCategory | null | undefined) {
  return category ? PROVIDER_CATEGORY_LABELS[category] : PROVIDER_CATEGORY_LABELS.AYUSH;
}

export function capabilitiesForProvider(input: {
  providerType?: ProviderType | null;
  doctorType?: HomeopathicDoctorType | null;
}) {
  if (input.providerType === ProviderType.HOMEOPATH || !input.providerType) {
    return DOCTOR_TYPE_CAPABILITIES[input.doctorType || HomeopathicDoctorType.JUNIOR_DOCTOR];
  }
  return PROVIDER_TYPE_CAPABILITIES[input.providerType];
}

export function resolveDoctorSpecialty(input: {
  doctorType: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  specialty?: string | null;
}) {
  if (input.doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && input.specialtyFocus) {
    return `${HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[input.specialtyFocus]} Specialist`;
  }
  return input.specialty?.trim() || 'Homeopathy';
}

export function doctorProfileSchema() {
  return z
    .object({
      providerType: z.nativeEnum(ProviderType).optional(),
      providerCategory: z.nativeEnum(ProviderCategory).optional(),
      specialization: z.string().min(2).optional().or(z.literal('')),
      doctorType: homeopathicDoctorTypeSchema.optional(),
      specialtyFocus: homeopathicSpecialtyFocusSchema.nullable().optional(),
      specialty: z.string().min(2).optional().or(z.literal('')),
      registrationNo: z.string().optional().or(z.literal('')),
      isAvailable: z.boolean().optional()
    })
    .superRefine((body, ctx) => {
      const doctorType = body.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
      if (doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && !body.specialtyFocus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Specialty focus is required for specialist consultants.',
          path: ['specialtyFocus']
        });
      }
      if (doctorType !== HomeopathicDoctorType.SPECIALIST_CONSULTANT && body.specialtyFocus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Specialty focus applies only to specialist consultants.',
          path: ['specialtyFocus']
        });
      }
    });
}

export function toDoctorProfilePayload(body: z.infer<ReturnType<typeof doctorProfileSchema>>) {
  const providerType = body.providerType ?? ProviderType.HOMEOPATH;
  const providerCategory = body.providerCategory ?? PROVIDER_TYPE_CATEGORY[providerType];
  const doctorType = body.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
  const specialtyFocus =
    doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT
      ? (body.specialtyFocus ?? null)
      : null;
  const specialization = body.specialization?.trim() || null;

  return {
    providerType,
    providerCategory,
    doctorType,
    specialtyFocus,
    specialty:
      body.specialty?.trim() ||
      specialization ||
      (providerType === ProviderType.HOMEOPATH
        ? resolveDoctorSpecialty({ doctorType, specialtyFocus, specialty: body.specialty })
        : PROVIDER_TYPE_LABELS[providerType]),
    specialization,
    registrationNo: body.registrationNo || null,
    isAvailable: body.isAvailable ?? true
  };
}
