export const PROVIDER_SESSION_MODES = ['CHAT', 'VOICE', 'VIDEO'] as const;
export type ProviderSessionMode = (typeof PROVIDER_SESSION_MODES)[number];
export type ProviderConsumerSessionMode = 'chat' | 'voice' | 'video';

export function providerConsumerSessionModeListLabel(
  modes: readonly ProviderConsumerSessionMode[]
): string {
  const labels = modes.map(
    (mode) => PROVIDER_SESSION_MODE_DEFINITIONS[mode.toUpperCase() as ProviderSessionMode].label
  );
  if (labels.length < 2) return labels[0] || 'your available mode';
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}

export type ProviderSessionModeDefinition = {
  code: ProviderSessionMode;
  label: string;
  icon: string;
  description: string;
  consumerValue: ProviderConsumerSessionMode;
  sessionTypeValue: 'live_chat' | 'online_audio' | 'online_video';
  aliases: readonly string[];
};

export const PROVIDER_SESSION_MODE_DEFINITIONS: Record<
  ProviderSessionMode,
  ProviderSessionModeDefinition
> = {
  CHAT: {
    code: 'CHAT',
    label: 'Chat',
    icon: '💬',
    description: 'Private text support',
    consumerValue: 'chat',
    sessionTypeValue: 'live_chat',
    aliases: ['chat', 'message', 'text', 'live_chat']
  },
  VOICE: {
    code: 'VOICE',
    label: 'Voice',
    icon: '🎧',
    description: 'Talk without camera',
    consumerValue: 'voice',
    sessionTypeValue: 'online_audio',
    aliases: ['voice', 'audio', 'call', 'online_audio']
  },
  VIDEO: {
    code: 'VIDEO',
    label: 'Video',
    icon: '🎥',
    description: 'Face-to-face support',
    consumerValue: 'video',
    sessionTypeValue: 'online_video',
    aliases: ['video', 'face-to-face', 'online_video']
  }
};

export const PROVIDER_SESSION_MODE_OPTIONS = PROVIDER_SESSION_MODES.map((value) => ({
  value,
  label: PROVIDER_SESSION_MODE_DEFINITIONS[value].label
}));

export function providerSessionModeFromValue(value?: string | null): ProviderSessionMode | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return (
    PROVIDER_SESSION_MODES.find((mode) => {
      const definition = PROVIDER_SESSION_MODE_DEFINITIONS[mode];
      return (
        definition.code.toLowerCase() === normalized ||
        definition.consumerValue === normalized ||
        definition.sessionTypeValue === normalized ||
        definition.aliases.includes(normalized)
      );
    }) ?? null
  );
}

export function providerSessionModeMatchesText(mode: ProviderSessionMode, text: string): boolean {
  const normalized = text.toLowerCase();
  if (mode === 'VOICE' && normalized.includes('video')) return false;
  return PROVIDER_SESSION_MODE_DEFINITIONS[mode].aliases.some((alias) =>
    normalized.includes(alias)
  );
}

export const CARE_SERVICE_PRICING_MODES = [
  'FIXED',
  'FREE_INTRO',
  'DISCOUNTED_FIRST',
  'PACKAGE',
  'FREE_VOLUNTEER',
  'PER_MINUTE'
] as const;
export type CareServicePricingMode = (typeof CARE_SERVICE_PRICING_MODES)[number];

/** Runtime role definition returned by the database-backed provider taxonomy. */
export type ProviderRoleDefinitionDto = {
  code: string;
  domain: 'HOMEOPATHY' | 'HOPE_HUB';
  label: string;
  shortLabel: string;
  category: string;
  tone: string;
  description: string;
  scope: string;
  bestFor: string[];
  notFor: string[];
  ctaLabel: string;
  requiresCredentials: boolean;
  requiresListenerScreening: boolean;
  isClinicalCare: boolean;
  supportedModes: ProviderSessionMode[];
  isActive: boolean;
  sortOrder: number;
  version: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProviderTaxonomyResponse = {
  domains: Array<'HOMEOPATHY' | 'HOPE_HUB'>;
  roles: ProviderRoleDefinitionDto[];
  roleGroups: Record<string, string[]>;
  legacy: {
    hopeHubDoctorType: 'PSYCHOLOGIST';
    primaryRoleField: 'careTeamType';
    rolesField: 'careTeamTypes';
  };
};

export type ProviderRoleAssignmentDto = {
  roleCode: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
  credentialStatus: 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REJECTED' | string;
  role: Pick<
    ProviderRoleDefinitionDto,
    | 'code'
    | 'label'
    | 'shortLabel'
    | 'category'
    | 'tone'
    | 'isClinicalCare'
    | 'requiresCredentials'
    | 'requiresListenerScreening'
    | 'supportedModes'
  >;
};

export type ProviderClassificationDto = {
  domain: 'HOMEOPATHY' | 'HOPE_HUB';
  primaryRole: string | null;
  roles: string[];
};

export type CareTeamServiceDto = {
  id?: string;
  providerRole?: string | null;
  providerRoleCode?: string | null;
  title: string;
  description?: string | null;
  pricingMode?: CareServicePricingMode;
  priceInPaise: number;
  firstSessionPriceInPaise?: number | null;
  offerEndsAt?: string | null;
  offerBookingLimit?: number | null;
  pauseOfferWhenNoSlots?: boolean;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  approvalReason?: string | null;
  followUpPriceInPaise?: number | null;
  followUpSessionLimit?: number | null;
  introSessionLimit?: number;
  packageSessionCount?: number | null;
  packagePriceInPaise?: number | null;
  freeMinutes?: number;
  pricePerMinuteInPaise?: number | null;
  currency?: string;
  durationMinutes: number;
  isFree?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export type MentalHealthProviderProfileDto = {
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
  services?: CareTeamServiceDto[];
};

export type ProviderProfileSummaryDto = {
  providerDomain?: 'HOMEOPATHY' | 'HOPE_HUB' | null;
  specialty?: string;
  registrationNo?: string | null;
  isAvailable?: boolean;
  doctorType?: string;
  specialtyFocus?: string | null;
  doctorTypeLabel?: string;
  specialtyFocusLabel?: string | null;
  designation?: string | null;
  department?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  consultationSharePercent?: number | null;
  providerEarningModel?:
    | 'PROVIDER_PERCENTAGE'
    | 'FIXED_PROVIDER_AMOUNT'
    | 'PLATFORM_PERCENTAGE'
    | 'FIXED_PLATFORM_FEE'
    | 'HYBRID_PLATFORM_FEE'
    | null;
  providerFixedEarningInPaise?: number | null;
  platformFeePercent?: number | null;
  platformFixedFeeInPaise?: number | null;
  minimumProviderEarningInPaise?: number | null;
  maximumPlatformFeeInPaise?: number | null;
  focusAreas?: string[];
  mentalHealthProfile?: MentalHealthProviderProfileDto | null;
  providerClassification?: ProviderClassificationDto;
  roleAssignments?: ProviderRoleAssignmentDto[];
  showOnWebsite?: boolean;
  websiteOrder?: number | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  suspendedById?: string | null;
  defaultMethodOptionId?: string | null;
  defaultMethodOption?: { id: string; label: string } | null;
};

export type ProviderProfileResponseDto = {
  profile: {
    name: string;
    email?: string | null;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
    mobile?: string | null;
    profileImageUrl?: string | null;
    doctorProfile?: ProviderProfileSummaryDto | null;
  };
};

export type CarePricingTemplateDto = {
  id: string;
  applicableRoleCodes: string[];
  title: string;
  description?: string | null;
  pricingMode: CareServicePricingMode;
  priceInPaise: number;
  firstSessionPriceInPaise?: number | null;
  followUpPriceInPaise?: number | null;
  introSessionLimit: number;
  packageSessionCount?: number | null;
  packagePriceInPaise?: number | null;
  freeMinutes: number;
  pricePerMinuteInPaise?: number | null;
  durationMinutes: number;
  isFree: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProviderReadinessBlockerDto = {
  code: string;
  label: string;
  action?: string;
  stepId?: string;
};

export type ProviderOnboardingStepDto = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  queryParams?: Record<string, string>;
  complete: boolean;
  required: boolean;
  missing: string[];
};

export type ProviderReadinessDto = {
  ready: boolean;
  code: string;
  message: string;
  title: string;
  subtitle: string;
  percent: number;
  blockers: ProviderReadinessBlockerDto[];
  steps: ProviderOnboardingStepDto[];
};
