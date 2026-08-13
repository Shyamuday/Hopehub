/**
 * Stable provider taxonomy shared by the API and every frontend.
 * Legacy database names are adapted here so production records remain valid.
 */
export const PROVIDER_DOMAINS = ['HOMEOPATHY', 'HOPE_HUB'] as const;
export type ProviderDomain = (typeof PROVIDER_DOMAINS)[number];

export const PROVIDER_ROLE_CODES = [
  'MENTAL_WELLNESS_PROFESSIONAL',
  'QUALIFIED_COUNSELLOR',
  'PSYCHOLOGY_STUDENT_VOLUNTEER',
  'PEER_SUPPORT_VOLUNTEER',
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR'
] as const;

export type ProviderRoleCode = (typeof PROVIDER_ROLE_CODES)[number];
export type ProviderRoleCategory = 'PROFESSIONAL_CARE' | 'EMOTIONAL_LISTENER' | 'COACH_MENTOR';
export type ProviderRoleTone =
  'professional' | 'student' | 'listener' | 'coach' | 'wellness' | 'mentor';
export type ProviderApplicationTrack =
  'PROFESSIONAL_PSYCHOLOGIST' | 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';

export const PROVIDER_APPLICATION_TRACK_LABELS: Record<ProviderApplicationTrack, string> = {
  PROFESSIONAL_PSYCHOLOGIST: 'Professional care provider',
  PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student listener',
  PEER_SUPPORT_VOLUNTEER: 'Peer support listener'
};

export type ProviderRoleDefinition = {
  code: ProviderRoleCode;
  label: string;
  shortLabel: string;
  category: ProviderRoleCategory;
  tone: ProviderRoleTone;
  description: string;
  scope: string;
  bestFor: readonly string[];
  notFor: readonly string[];
  ctaLabel: string;
  requiresCredentials: boolean;
  requiresListenerScreening: boolean;
  isClinicalCare: boolean;
};

export const PROVIDER_ROLE_DEFINITIONS: Record<ProviderRoleCode, ProviderRoleDefinition> = {
  MENTAL_WELLNESS_PROFESSIONAL: {
    code: 'MENTAL_WELLNESS_PROFESSIONAL',
    label: 'Psychologist / mental wellness professional',
    shortLabel: 'Psychologist',
    category: 'PROFESSIONAL_CARE',
    tone: 'professional',
    description: 'Qualified support for structured mental-wellness consultations.',
    scope: 'Structured mental-wellness care within the provider’s qualifications.',
    bestFor: ['anxiety or stress support', 'relationship concerns', 'structured counselling'],
    notFor: [
      'medical emergencies',
      'instant diagnosis without assessment',
      'psychiatric prescription'
    ],
    ctaLabel: 'Book consultation',
    requiresCredentials: true,
    requiresListenerScreening: false,
    isClinicalCare: true
  },
  QUALIFIED_COUNSELLOR: {
    code: 'QUALIFIED_COUNSELLOR',
    label: 'Qualified counsellor',
    shortLabel: 'Counsellor',
    category: 'PROFESSIONAL_CARE',
    tone: 'professional',
    description: 'Trained counselling support for emotional concerns and guided conversations.',
    scope: 'Counselling support and practical coping guidance within the provider’s training.',
    bestFor: ['emotional clarity', 'stress and relationship support', 'guided coping tools'],
    notFor: ['emergency crisis care', 'medicine or prescription advice', 'formal diagnosis'],
    ctaLabel: 'Book counselling session',
    requiresCredentials: true,
    requiresListenerScreening: false,
    isClinicalCare: true
  },
  PSYCHOLOGY_STUDENT_VOLUNTEER: {
    code: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
    label: 'Psychology student listener',
    shortLabel: 'Student listener',
    category: 'EMOTIONAL_LISTENER',
    tone: 'student',
    description: 'Non-clinical listening, reflection, and emotional support.',
    scope: 'Non-clinical support under Hope Hub guidance and escalation rules.',
    bestFor: ['listening support', 'study stress', 'daily emotional check-ins'],
    notFor: ['diagnosis', 'therapy replacement', 'high-risk or emergency concerns'],
    ctaLabel: 'Talk to a student listener',
    requiresCredentials: false,
    requiresListenerScreening: true,
    isClinicalCare: false
  },
  PEER_SUPPORT_VOLUNTEER: {
    code: 'PEER_SUPPORT_VOLUNTEER',
    label: 'Peer support listener',
    shortLabel: 'Peer listener',
    category: 'EMOTIONAL_LISTENER',
    tone: 'listener',
    description: 'Safe, human conversation with a screened emotional support listener.',
    scope: 'Non-clinical peer listening with escalation of safety concerns.',
    bestFor: ['loneliness', 'breakup recovery', 'motivation and encouragement'],
    notFor: ['clinical treatment', 'diagnosis', 'crisis or emergency support'],
    ctaLabel: 'Talk to a caring listener',
    requiresCredentials: false,
    requiresListenerScreening: true,
    isClinicalCare: false
  },
  NLP_COACH: {
    code: 'NLP_COACH',
    label: 'NLP coach',
    shortLabel: 'NLP coach',
    category: 'COACH_MENTOR',
    tone: 'coach',
    description: 'Goal-focused coaching for reframing, habits, and confidence.',
    scope: 'Coaching support, not clinical therapy or medical care.',
    bestFor: ['confidence', 'habit change', 'goal clarity'],
    notFor: ['clinical diagnosis', 'emergency care', 'medical treatment'],
    ctaLabel: 'Book coaching session',
    requiresCredentials: false,
    requiresListenerScreening: false,
    isClinicalCare: false
  },
  LIFE_COACH: {
    code: 'LIFE_COACH',
    label: 'Life coach',
    shortLabel: 'Life coach',
    category: 'COACH_MENTOR',
    tone: 'coach',
    description: 'Practical coaching for decisions, routines, and life direction.',
    scope: 'Coaching support, not clinical therapy or medical care.',
    bestFor: ['life direction', 'motivation', 'routine planning'],
    notFor: ['diagnosis', 'prescription', 'crisis intervention'],
    ctaLabel: 'Book coaching session',
    requiresCredentials: false,
    requiresListenerScreening: false,
    isClinicalCare: false
  },
  MEDITATION_BREATHWORK_GUIDE: {
    code: 'MEDITATION_BREATHWORK_GUIDE',
    label: 'Meditation / breathwork guide',
    shortLabel: 'Wellness guide',
    category: 'COACH_MENTOR',
    tone: 'wellness',
    description: 'Guided relaxation, breathwork, mindfulness, and grounding support.',
    scope: 'Wellness practice guidance, not a replacement for mental-health treatment.',
    bestFor: ['relaxation', 'breathing practice', 'mindfulness routines'],
    notFor: ['acute panic emergency', 'clinical treatment', 'medical advice'],
    ctaLabel: 'Book guided practice',
    requiresCredentials: false,
    requiresListenerScreening: false,
    isClinicalCare: false
  },
  CAREER_STUDY_MENTOR: {
    code: 'CAREER_STUDY_MENTOR',
    label: 'Career / study mentor',
    shortLabel: 'Career mentor',
    category: 'COACH_MENTOR',
    tone: 'mentor',
    description: 'Mentoring for study pressure, focus, confidence, and career direction.',
    scope: 'Mentoring and practical guidance, not clinical counselling.',
    bestFor: ['study stress', 'career confusion', 'focus and planning'],
    notFor: ['clinical therapy', 'diagnosis', 'emergency support'],
    ctaLabel: 'Book mentoring session',
    requiresCredentials: false,
    requiresListenerScreening: false,
    isClinicalCare: false
  }
};

export const PROVIDER_ROLE_OPTIONS = PROVIDER_ROLE_CODES.map((value) => ({
  value,
  label: PROVIDER_ROLE_DEFINITIONS[value].label
}));

export const PROVIDER_ROLE_GROUPS: Record<ProviderRoleCategory, readonly ProviderRoleCode[]> = {
  PROFESSIONAL_CARE: PROVIDER_ROLE_CODES.filter(
    (code) => PROVIDER_ROLE_DEFINITIONS[code].category === 'PROFESSIONAL_CARE'
  ),
  EMOTIONAL_LISTENER: PROVIDER_ROLE_CODES.filter(
    (code) => PROVIDER_ROLE_DEFINITIONS[code].category === 'EMOTIONAL_LISTENER'
  ),
  COACH_MENTOR: PROVIDER_ROLE_CODES.filter(
    (code) => PROVIDER_ROLE_DEFINITIONS[code].category === 'COACH_MENTOR'
  )
};

export type ProviderClassification = {
  domain: ProviderDomain;
  primaryRole: ProviderRoleCode | null;
  roles: ProviderRoleCode[];
};

export function isProviderRoleCode(value?: string | null): value is ProviderRoleCode {
  return Boolean(value && PROVIDER_ROLE_CODES.includes(value as ProviderRoleCode));
}

export function providerRoleDefinition(value?: string | null): ProviderRoleDefinition | null {
  return isProviderRoleCode(value) ? PROVIDER_ROLE_DEFINITIONS[value] : null;
}

export function providerRoleLabel(value?: string | null): string {
  return providerRoleDefinition(value)?.label ?? '';
}

export function normalizeProviderRoles(
  primaryRole?: string | null,
  selectedRoles?: readonly string[] | null,
  fallbackRole?: ProviderRoleCode | null
): ProviderRoleCode[] {
  const primary = isProviderRoleCode(primaryRole) ? primaryRole : null;
  const selected = (selectedRoles ?? []).filter(isProviderRoleCode);
  const normalized = Array.from(new Set([...(primary ? [primary] : []), ...selected]));
  return normalized.length ? normalized : fallbackRole ? [fallbackRole] : [];
}

export function providerClassificationFromLegacy(
  input?: {
    doctorType?: string | null;
    mentalHealthProfile?: {
      careTeamType?: string | null;
      careTeamTypes?: readonly string[] | null;
    } | null;
  } | null
): ProviderClassification {
  const domain: ProviderDomain = input?.doctorType === 'PSYCHOLOGIST' ? 'HOPE_HUB' : 'HOMEOPATHY';
  const roles =
    domain === 'HOPE_HUB'
      ? normalizeProviderRoles(
          input?.mentalHealthProfile?.careTeamType,
          input?.mentalHealthProfile?.careTeamTypes,
          'MENTAL_WELLNESS_PROFESSIONAL'
        )
      : [];
  return { domain, primaryRole: roles[0] ?? null, roles };
}

export function providerHasRoleCategory(
  roles: readonly string[] | null | undefined,
  category: ProviderRoleCategory
): boolean {
  return (roles ?? []).some((role) => providerRoleDefinition(role)?.category === category);
}

export function supportPathForProviderRole(role?: string | null): ProviderRoleCategory | null {
  return providerRoleDefinition(role)?.category ?? null;
}

/** Compatibility adapter for the older careers workflow enum. */
export function providerApplicationTrackForRole(role: ProviderRoleCode): ProviderApplicationTrack {
  if (role === 'PSYCHOLOGY_STUDENT_VOLUNTEER') return 'PSYCHOLOGY_STUDENT_VOLUNTEER';
  if (role === 'PEER_SUPPORT_VOLUNTEER') return 'PEER_SUPPORT_VOLUNTEER';
  return 'PROFESSIONAL_PSYCHOLOGIST';
}
