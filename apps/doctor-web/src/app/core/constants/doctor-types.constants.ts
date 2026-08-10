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
  PSYCHOLOGIST: 'Hope Hub Provider',
};

export const SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases',
};

export type DoctorProfileSummary = {
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
    acceptsHighRiskCases: boolean;
    autoMatchEnabled?: boolean;
    acceptingNewUsers?: boolean;
    maxSessionsPerDay?: number | null;
    maxSessionsPerWeek?: number | null;
    services?: Array<{
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
  showOnWebsite?: boolean;
  defaultMethodOptionId?: string | null;
  defaultMethodOption?: { id: string; label: string } | null;
};

export const CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES = [
  'MENTAL_WELLNESS_PROFESSIONAL',
  'QUALIFIED_COUNSELLOR',
] as const;

export const LISTENER_CARE_TEAM_TYPES = [
  'PSYCHOLOGY_STUDENT_VOLUNTEER',
  'PEER_SUPPORT_VOLUNTEER',
] as const;

export const COACH_GUIDE_CARE_TEAM_TYPES = [
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR',
] as const;

export const CARE_TEAM_TYPE_LABELS: Record<string, string> = {
  MENTAL_WELLNESS_PROFESSIONAL: 'Psychologist / mental wellness professional',
  QUALIFIED_COUNSELLOR: 'Qualified counsellor',
  PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student listener',
  PEER_SUPPORT_VOLUNTEER: 'Peer support listener',
  NLP_COACH: 'NLP coach',
  LIFE_COACH: 'Life coach',
  MEDITATION_BREATHWORK_GUIDE: 'Meditation / breathwork guide',
  CAREER_STUDY_MENTOR: 'Career / study mentor',
};

export type ProviderCapabilityInput = {
  doctorType?: HomeopathicDoctorType | null;
  mentalHealthProfile?: { careTeamType?: string | null; careTeamTypes?: string[] | null } | null;
};

export type DoctorCapabilities = {
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

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorCapabilities> = {
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
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
    coachGuide: false,
  },
};

export function capabilitiesForDoctorType(type?: HomeopathicDoctorType | null): DoctorCapabilities {
  return DOCTOR_TYPE_CAPABILITIES[type || 'JUNIOR_DOCTOR'];
}

export function isHopeHubProvider(input?: ProviderCapabilityInput | null): boolean {
  return input?.doctorType === 'PSYCHOLOGIST';
}

export function isClinicalMentalHealthCareTeamType(type?: string | null): boolean {
  return CLINICAL_MENTAL_HEALTH_CARE_TEAM_TYPES.includes(type as any);
}

export function isListenerCareTeamType(type?: string | null): boolean {
  return LISTENER_CARE_TEAM_TYPES.includes(type as any);
}

export function isCoachGuideCareTeamType(type?: string | null): boolean {
  return COACH_GUIDE_CARE_TEAM_TYPES.includes(type as any);
}

export function careTeamTypeLabel(type?: string | null): string {
  return type ? CARE_TEAM_TYPE_LABELS[type] || type.replace(/_/g, ' ').toLowerCase() : '';
}

export function capabilitiesForProvider(
  input?: ProviderCapabilityInput | null,
): DoctorCapabilities {
  const type = input?.doctorType || null;
  const base = capabilitiesForDoctorType(type);
  if (type !== 'PSYCHOLOGIST') return base;

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
    treatmentPages: false,
    prescribe: false,
    caseAnalysis: false,
    diseaseSpecialtySettings: false,
  };
}
