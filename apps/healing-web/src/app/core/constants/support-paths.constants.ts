import type { HopeHubProvider } from '../services/booking.service';
import { supportPathForProviderRole, type ProviderRoleCategory } from '@hopehub/contracts';

export type ConsumerSupportPath = ProviderRoleCategory;

export type ConsumerSupportPathMeta = {
  value: ConsumerSupportPath;
  label: string;
  title: string;
  icon: string;
  description: string;
  bestFor: string;
  help: string;
  clinical: boolean;
};

export const CONSUMER_SUPPORT_PATHS: ConsumerSupportPathMeta[] = [
  {
    value: 'PROFESSIONAL_CARE',
    label: 'Professional care',
    title: 'Psychologist / counsellor',
    icon: '🧠',
    description:
      'Structured support for anxiety, low mood, panic, relationship stress, and deeper emotional concerns.',
    bestFor: 'Anxiety · depression · panic · trauma · relationships',
    help: 'Structured mental-wellness support from professional care providers.',
    clinical: true,
  },
  {
    value: 'COACH_MENTOR',
    label: 'Clarity & growth',
    title: 'Life coach / mentor',
    icon: '✨',
    description:
      'Guidance for goals, confidence, study pressure, career direction, habits, and life clarity.',
    bestFor: 'Career · study · motivation · habits · confidence',
    help: 'Non-clinical coaching, mentoring, mindfulness, study and career guidance.',
    clinical: false,
  },
  {
    value: 'EMOTIONAL_LISTENER',
    label: 'Talk now',
    title: 'Emotional support listener',
    icon: '💛',
    description: 'A gentle non-clinical space to vent, feel heard, and talk through a hard moment.',
    bestFor: 'Loneliness · overthinking · heartbreak · hard day',
    help: 'Gentle non-clinical listening support for venting and feeling heard.',
    clinical: false,
  },
];

export function isConsumerSupportPath(
  value: string | null | undefined,
): value is ConsumerSupportPath {
  return CONSUMER_SUPPORT_PATHS.some((path) => path.value === value);
}

export function supportPathMeta(value: ConsumerSupportPath): ConsumerSupportPathMeta {
  return CONSUMER_SUPPORT_PATHS.find((path) => path.value === value) ?? CONSUMER_SUPPORT_PATHS[0];
}

export function supportPathForProvider(
  provider: Pick<
    HopeHubProvider,
    | 'supportRole'
    | 'supportTierTone'
    | 'careTeamType'
    | 'supportRoleLabel'
    | 'supportTierLabel'
    | 'isClinicalCare'
    | 'isScreenedListener'
  >,
): ConsumerSupportPath {
  const role = provider.supportRole || provider.careTeamType || '';
  const canonicalPath = supportPathForProviderRole(role);
  if (canonicalPath) return canonicalPath;

  const text = [
    provider.supportRoleLabel,
    provider.supportTierLabel,
    provider.supportTierTone,
    provider.careTeamType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (provider.isScreenedListener || /listener|peer|volunteer|student/.test(text)) {
    return 'EMOTIONAL_LISTENER';
  }
  if (/coach|mentor|meditation|breathwork|wellness|career|study/.test(text)) {
    return 'COACH_MENTOR';
  }
  return 'PROFESSIONAL_CARE';
}

export function supportPathForExpertPreference(
  value: string | null | undefined,
): ConsumerSupportPath | '' {
  if (!value) return '';
  if (isConsumerSupportPath(value)) return value;
  if (/listener|student|peer|volunteer|talk now/i.test(value)) return 'EMOTIONAL_LISTENER';
  if (/coach|mentor|growth|clarity|meditation|breathwork|career|study|nlp/i.test(value)) {
    return 'COACH_MENTOR';
  }
  if (/professional|psychologist|counsellor|counselor|mental/i.test(value)) {
    return 'PROFESSIONAL_CARE';
  }
  return '';
}
