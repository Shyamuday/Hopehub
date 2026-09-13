import type { ProviderRoleCategory, ProviderRoleCode } from '@hopehub/contracts';

export type CareerDeepLinkTarget =
  | { applicationKind: 'TELEGRAM_ADMIN' }
  | {
      applicationKind: 'CARE_TEAM';
      pathway?: ProviderRoleCategory;
      role?: ProviderRoleCode;
    };

export const CAREER_DEEP_LINK_TARGETS = {
  tgadmin: { applicationKind: 'TELEGRAM_ADMIN' },
  professional: { applicationKind: 'CARE_TEAM', pathway: 'PROFESSIONAL_CARE' },
  listener: { applicationKind: 'CARE_TEAM', pathway: 'EMOTIONAL_LISTENER' },
  coach: { applicationKind: 'CARE_TEAM', pathway: 'COACH_MENTOR' },
  'mental-wellness-professional': {
    applicationKind: 'CARE_TEAM',
    role: 'MENTAL_WELLNESS_PROFESSIONAL',
  },
  'qualified-counsellor': { applicationKind: 'CARE_TEAM', role: 'QUALIFIED_COUNSELLOR' },
  'psychology-student-listener': {
    applicationKind: 'CARE_TEAM',
    role: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
  },
  'peer-support-listener': {
    applicationKind: 'CARE_TEAM',
    role: 'PEER_SUPPORT_VOLUNTEER',
  },
  'nlp-coach': { applicationKind: 'CARE_TEAM', role: 'NLP_COACH' },
  'life-coach': { applicationKind: 'CARE_TEAM', role: 'LIFE_COACH' },
  'meditation-breathwork-guide': {
    applicationKind: 'CARE_TEAM',
    role: 'MEDITATION_BREATHWORK_GUIDE',
  },
  'career-study-mentor': { applicationKind: 'CARE_TEAM', role: 'CAREER_STUDY_MENTOR' },
} as const satisfies Record<string, CareerDeepLinkTarget>;

export type CareerDeepLinkSlug = keyof typeof CAREER_DEEP_LINK_TARGETS;

export const CAREER_DEEP_LINK_SLUGS = Object.keys(CAREER_DEEP_LINK_TARGETS) as CareerDeepLinkSlug[];

export function careerDeepLinkTarget(value?: string | null): CareerDeepLinkTarget | null {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '') as CareerDeepLinkSlug;
  return CAREER_DEEP_LINK_TARGETS[slug] ?? null;
}
