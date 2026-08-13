export const HOMEOPATHIC_DOCTOR_TYPES = [
  'CHIEF_CONSULTANT',
  'JUNIOR_DOCTOR',
  'SPECIALIST_CONSULTANT',
  'VISITING_DOCTOR',
  'TELEMEDICINE_DOCTOR',
  'MEDICAL_INTERN',
  'RESIDENT_MEDICAL_OFFICER',
  'PSYCHOLOGIST',
] as const;

export type HomeopathicDoctorType = (typeof HOMEOPATHIC_DOCTOR_TYPES)[number];

export const HOMEOPATHIC_SPECIALTY_FOCUSES = [
  'SKIN',
  'CHILD',
  'WOMENS_HEALTH',
  'CHRONIC_DISEASES',
] as const;

export type HomeopathicSpecialtyFocus = (typeof HOMEOPATHIC_SPECIALTY_FOCUSES)[number];

export const DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathy Chief Consultant',
  JUNIOR_DOCTOR: 'Homeopathy Provider',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Homeopathy Provider',
  TELEMEDICINE_DOCTOR: 'Telemedicine Homeopathy Provider',
  MEDICAL_INTERN: 'Homeopathy Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Care Officer (RMO)',
  PSYCHOLOGIST: 'Hope Hub',
};

export const SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases',
};

export type DoctorProfileSummary = {
  providerDomain?: 'HOMEOPATHY' | 'HOPE_HUB';
  specialty?: string;
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
  mentalHealthProfile?: {
    careTeamType?: string;
    careTeamTypes?: string[];
    qualifications: string[];
    qualifiedFrom?: string | null;
    licenseNumber?: string | null;
    licenseCouncil?: string | null;
    languages: string[];
    modalities: string[];
    sessionTypes: string[];
    ageGroups: string[];
    concernsHandled: string[];
    introSessionTitle?: string | null;
    counsellingApproach?: string | null;
    safetyEscalationNote?: string | null;
    listenerSafetyAcknowledgedAt?: string | null;
    listenerSafetyAcknowledgedVersion?: string | null;
    onboardingPathSelectedAt?: string | null;
    listenerScreening?: {
      score?: number | null;
      maxScore?: number | null;
      passed?: boolean | null;
      completedAt?: string | null;
      questionSetVersion?: string | null;
    } | null;
    acceptsHighRiskCases: boolean;
    autoMatchEnabled?: boolean;
    acceptingNewUsers?: boolean;
    maxSessionsPerDay?: number | null;
    maxSessionsPerWeek?: number | null;
    services?: Array<{
      providerRole?: string | null;
      title: string;
      description?: string | null;
      pricingMode?:
        'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER' | 'PER_MINUTE';
      priceInPaise: number;
      firstSessionPriceInPaise?: number | null;
      followUpPriceInPaise?: number | null;
      introSessionLimit?: number;
      packageSessionCount?: number | null;
      packagePriceInPaise?: number | null;
      freeMinutes?: number;
      pricePerMinuteInPaise?: number | null;
      durationMinutes: number;
      isFree?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    }>;
  } | null;
  providerClassification?: ProviderClassification;
  roleAssignments?: Array<{
    roleCode: string;
    isPrimary: boolean;
    status: string;
    credentialStatus: string;
    role: { category: string; label: string; isClinicalCare: boolean };
  }>;
  showOnWebsite?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  suspendedById?: string | null;
  defaultMethodOptionId?: string | null;
  defaultMethodOption?: { id: string; label: string } | null;
};

export const CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES = PROVIDER_ROLE_GROUPS.PROFESSIONAL_CARE;
export const LISTENER_CARE_TEAM_TYPES = PROVIDER_ROLE_GROUPS.EMOTIONAL_LISTENER;
export const COACH_GUIDE_CARE_TEAM_TYPES = PROVIDER_ROLE_GROUPS.COACH_MENTOR;
export const CARE_TEAM_TYPE_OPTIONS = PROVIDER_ROLE_CODES;
export const CARE_TEAM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDER_ROLE_CODES.map((code) => [code, PROVIDER_ROLE_DEFINITIONS[code].label]),
);

export type ProviderCapabilityInput = {
  doctorType?: HomeopathicDoctorType | null;
  providerDomain?: 'HOMEOPATHY' | 'HOPE_HUB' | null;
  mentalHealthProfile?: { careTeamType?: string | null; careTeamTypes?: string[] | null } | null;
  providerClassification?: ProviderClassification;
  roleAssignments?: DoctorProfileSummary['roleAssignments'];
};

export type DoctorCapabilities = {
  slots: boolean;
  earnings: boolean;
  onlineConsult: boolean;
  treatmentPages: boolean;
  prescribe: boolean;
  caseAnalysis: boolean;
  patients: boolean;
  scan: boolean;
  content: boolean;
  leaves: boolean;
  diseaseSpecialtySettings: boolean;
  clinicalMentalHealth: boolean;
  listenerSupport: boolean;
  coachGuide: boolean;
};

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorCapabilities> = {
  CHIEF_CONSULTANT: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  JUNIOR_DOCTOR: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  SPECIALIST_CONSULTANT: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  VISITING_DOCTOR: {
    slots: false,
    earnings: false,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  TELEMEDICINE_DOCTOR: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  MEDICAL_INTERN: {
    slots: false,
    earnings: false,
    onlineConsult: false,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: false,
    leaves: true,
    diseaseSpecialtySettings: false,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  RESIDENT_MEDICAL_OFFICER: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: true,
    prescribe: true,
    caseAnalysis: true,
    patients: true,
    scan: true,
    content: true,
    leaves: true,
    diseaseSpecialtySettings: true,
    clinicalMentalHealth: false,
    listenerSupport: false,
    coachGuide: false,
  },
  PSYCHOLOGIST: {
    slots: true,
    earnings: true,
    onlineConsult: true,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: false,
    patients: true,
    scan: false,
    content: false,
    leaves: false,
    diseaseSpecialtySettings: false,
    clinicalMentalHealth: true,
    listenerSupport: false,
    coachGuide: false,
  },
};

export function capabilitiesForDoctorType(type?: HomeopathicDoctorType | null): DoctorCapabilities {
  return DOCTOR_TYPE_CAPABILITIES[type || 'JUNIOR_DOCTOR'];
}

export function isHopeHubProvider(input?: ProviderCapabilityInput | null): boolean {
  return (
    input?.providerDomain === 'HOPE_HUB' ||
    input?.providerClassification?.domain === 'HOPE_HUB' ||
    input?.doctorType === 'PSYCHOLOGIST'
  );
}

export function isClinicalMentalHealthCareTeamType(type?: string | null): boolean {
  return providerHasRoleCategory(type ? [type] : [], 'PROFESSIONAL_CARE');
}

export function isListenerCareTeamType(type?: string | null): boolean {
  return providerHasRoleCategory(type ? [type] : [], 'EMOTIONAL_LISTENER');
}

export function isCoachGuideCareTeamType(type?: string | null): boolean {
  return providerHasRoleCategory(type ? [type] : [], 'COACH_MENTOR');
}

export function careTeamTypeLabel(type?: string | null): string {
  return providerRoleLabel(type) || (type ? type.replace(/_/g, ' ').toLowerCase() : '');
}

export function capabilitiesForProvider(
  input?: ProviderCapabilityInput | null,
): DoctorCapabilities {
  const type = input?.doctorType || null;
  const base = capabilitiesForDoctorType(type);
  if (!isHopeHubProvider(input)) return base;

  const classification = input?.providerClassification ?? providerClassificationFromLegacy(input);
  const careTeamTypes = normalizeProviderRoles(
    classification.primaryRole,
    classification.roles,
    'MENTAL_WELLNESS_PROFESSIONAL',
  );
  const categories = new Set(
    (input?.roleAssignments ?? []).map((assignment) => assignment.role.category),
  );
  const clinical = categories.size
    ? categories.has('PROFESSIONAL_CARE')
    : careTeamTypes.length === 0 ||
      careTeamTypes.some((type) => isClinicalMentalHealthCareTeamType(type));
  const listener = categories.size
    ? categories.has('EMOTIONAL_LISTENER')
    : careTeamTypes.some((type) => isListenerCareTeamType(type));
  const coachGuide = categories.size
    ? categories.has('COACH_MENTOR')
    : careTeamTypes.some((type) => isCoachGuideCareTeamType(type));

  return {
    ...base,
    clinicalMentalHealth: clinical,
    listenerSupport: listener,
    coachGuide,
    patients: clinical,
    scan: false,
    content: false,
    leaves: false,
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: false,
    diseaseSpecialtySettings: false,
  };
}
import {
  PROVIDER_ROLE_CODES,
  PROVIDER_ROLE_DEFINITIONS,
  PROVIDER_ROLE_GROUPS,
  normalizeProviderRoles,
  providerClassificationFromLegacy,
  providerHasRoleCategory,
  providerRoleLabel,
  type ProviderClassification,
} from '@hopehub/contracts';
