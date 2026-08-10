import {
  CareTeamMemberType,
  HomeopathicDoctorType,
  HomeopathicSpecialtyFocus
} from '@prisma/client';
import { z } from 'zod';

export const HOMEOPATHIC_DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathy Chief Consultant',
  JUNIOR_DOCTOR: 'Homeopathy Provider',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Homeopathy Provider',
  TELEMEDICINE_DOCTOR: 'Telemedicine Homeopathy Provider',
  MEDICAL_INTERN: 'Homeopathy Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Care Officer (RMO)',
  PSYCHOLOGIST: 'Hope Hub Provider'
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
  onlineConsult: boolean;
  treatmentPages: boolean;
  prescribe: boolean;
  caseAnalysis: boolean;
  scan: boolean;
  content: boolean;
  diseaseSpecialtySettings: boolean;
  clinicalMentalHealth: boolean;
  listenerSupport: boolean;
  coachGuide: boolean;
};

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorTypeCapabilities> = {
  CHIEF_CONSULTANT: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  JUNIOR_DOCTOR: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  SPECIALIST_CONSULTANT: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  VISITING_DOCTOR: {
    slots: false,
    earnings: false,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  TELEMEDICINE_DOCTOR: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  MEDICAL_INTERN: {
    slots: false,
    earnings: false,
    onlineConsult: false,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: true,
    scan: true,
    content: false,
    diseaseSpecialtySettings: false,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  RESIDENT_MEDICAL_OFFICER: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    scan: true,
    content: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false
  },
  PSYCHOLOGIST: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: false,
    scan: false,
    content: false,
    diseaseSpecialtySettings: false,
    clinicalMentalHealth: true,
    listenerSupport: false,
    coachGuide: false
  }
};

export const CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES = [
  CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
  CareTeamMemberType.QUALIFIED_COUNSELLOR
] as const;

export const LISTENER_CARE_TEAM_TYPES = [
  CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER,
  CareTeamMemberType.PEER_SUPPORT_VOLUNTEER
] as const;

export const COACH_GUIDE_CARE_TEAM_TYPES = [
  CareTeamMemberType.NLP_COACH,
  CareTeamMemberType.LIFE_COACH,
  CareTeamMemberType.MEDITATION_BREATHWORK_GUIDE,
  CareTeamMemberType.CAREER_STUDY_MENTOR
] as const;

export const HOPE_HUB_SUPPORT_PATH_TYPES = {
  PROFESSIONAL_CARE: CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES,
  COACH_MENTOR: COACH_GUIDE_CARE_TEAM_TYPES,
  EMOTIONAL_LISTENER: LISTENER_CARE_TEAM_TYPES
} as const;

export type HopeHubSupportPath = keyof typeof HOPE_HUB_SUPPORT_PATH_TYPES;

export function hopeHubCareTeamTypesForSupportPath(path?: string | null): CareTeamMemberType[] {
  if (!path || !(path in HOPE_HUB_SUPPORT_PATH_TYPES)) return [];
  return [...HOPE_HUB_SUPPORT_PATH_TYPES[path as HopeHubSupportPath]];
}

export function isClinicalMentalHealthCareTeamType(type?: CareTeamMemberType | null) {
  return CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES.includes(type as any);
}

export function isListenerCareTeamType(type?: CareTeamMemberType | null) {
  return LISTENER_CARE_TEAM_TYPES.includes(type as any);
}

export function isCoachGuideCareTeamType(type?: CareTeamMemberType | null) {
  return COACH_GUIDE_CARE_TEAM_TYPES.includes(type as any);
}

export function capabilitiesForDoctorProfile(input?: {
  doctorType?: HomeopathicDoctorType | null;
  mentalHealthProfile?: {
    careTeamType?: CareTeamMemberType | null;
    careTeamTypes?: CareTeamMemberType[] | null;
  } | null;
}) {
  const doctorType = input?.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
  const base = DOCTOR_TYPE_CAPABILITIES[doctorType];
  if (doctorType !== HomeopathicDoctorType.PSYCHOLOGIST) return base;

  const careTeamTypes = input?.mentalHealthProfile?.careTeamTypes?.length
    ? input.mentalHealthProfile.careTeamTypes
    : input?.mentalHealthProfile?.careTeamType
      ? [input.mentalHealthProfile.careTeamType]
      : [];
  const clinical =
    careTeamTypes.length === 0 ||
    careTeamTypes.some((type) => isClinicalMentalHealthCareTeamType(type));
  const listener = careTeamTypes.some((type) => isListenerCareTeamType(type));
  const coachGuide = careTeamTypes.some((type) => isCoachGuideCareTeamType(type));

  return {
    ...base,
    clinicalMentalHealth: clinical,
    listenerSupport: listener,
    coachGuide,
    scan: false,
    content: false,
    diseaseSpecialtySettings: false,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: false
  };
}

export const doctorProfileSelect = {
  specialty: true,
  registrationNo: true,
  isAvailable: true,
  doctorType: true,
  specialtyFocus: true,
  designation: true,
  department: true,
  bio: true,
  showOnWebsite: true,
  websiteOrder: true,
  yearsOfExperience: true,
  focusAreas: true,
  mentalHealthProfile: {
    select: {
      qualifications: true,
      qualifiedFrom: true,
      careTeamType: true,
      careTeamTypes: true,
      licenseNumber: true,
      licenseCouncil: true,
      languages: true,
      modalities: true,
      sessionTypes: true,
      ageGroups: true,
      concernsHandled: true,
      introSessionTitle: true,
      counsellingApproach: true,
      safetyEscalationNote: true,
      listenerSafetyAcknowledgedAt: true,
      listenerSafetyAcknowledgedVersion: true,
      acceptsHighRiskCases: true,
      autoMatchEnabled: true,
      acceptingNewUsers: true,
      maxSessionsPerDay: true,
      maxSessionsPerWeek: true,
      services: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          pricingMode: true,
          priceInPaise: true,
          firstSessionPriceInPaise: true,
          followUpPriceInPaise: true,
          introSessionLimit: true,
          packageSessionCount: true,
          packagePriceInPaise: true,
          freeMinutes: true,
          pricePerMinuteInPaise: true,
          currency: true,
          durationMinutes: true,
          isFree: true,
          isActive: true,
          sortOrder: true
        }
      }
    }
  },
  defaultMethodOptionId: true,
  defaultMethodOption: { select: { id: true, label: true } }
} as const;

export function specialtyFocusLabel(focus: HomeopathicSpecialtyFocus | null | undefined) {
  return focus ? HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[focus] : null;
}

export function doctorTypeLabel(type: HomeopathicDoctorType | null | undefined) {
  return type ? HOMEOPATHIC_DOCTOR_TYPE_LABELS[type] : HOMEOPATHIC_DOCTOR_TYPE_LABELS.JUNIOR_DOCTOR;
}

export function resolveDoctorSpecialty(input: {
  doctorType: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  specialty?: string | null;
}) {
  if (input.doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && input.specialtyFocus) {
    return `${HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[input.specialtyFocus]} Specialist`;
  }
  if (input.doctorType === HomeopathicDoctorType.PSYCHOLOGIST) {
    return input.specialty?.trim() || 'Psychology';
  }
  return input.specialty?.trim() || 'Homeopathy';
}

export function doctorProfileSchema() {
  return z
    .object({
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
  const doctorType = body.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
  const specialtyFocus =
    doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT
      ? (body.specialtyFocus ?? null)
      : null;

  return {
    doctorType,
    specialtyFocus,
    specialty: resolveDoctorSpecialty({
      doctorType,
      specialtyFocus,
      specialty: body.specialty
    }),
    registrationNo: body.registrationNo || null,
    isAvailable: body.isAvailable ?? true
  };
}
