import type { HopeHubProvider } from '../services/booking.service';
import { providerRoleDefinition } from '@hopehub/contracts';

export const CONSUMER_PROVIDER_BADGE_CLASSES = {
  professional: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  student: 'bg-sky-50 text-sky-700 ring-sky-200',
  volunteer: 'bg-purple-50 text-purple-700 ring-purple-200',
  coach: 'bg-amber-50 text-amber-800 ring-amber-200',
  wellness: 'bg-teal-50 text-teal-700 ring-teal-200',
  neutral: 'bg-gray-50 text-gray-700 ring-gray-200',
} as const;

export function consumerProviderRoleBadgeClass(
  provider: Pick<HopeHubProvider, 'supportTierTone' | 'supportRole'>,
  fallback: keyof typeof CONSUMER_PROVIDER_BADGE_CLASSES = 'coach',
): string {
  const canonicalTone = providerRoleDefinition(provider.supportRole)?.tone;
  if (canonicalTone === 'professional') return CONSUMER_PROVIDER_BADGE_CLASSES.professional;
  if (canonicalTone === 'student') return CONSUMER_PROVIDER_BADGE_CLASSES.student;
  if (canonicalTone === 'listener') return CONSUMER_PROVIDER_BADGE_CLASSES.volunteer;
  if (canonicalTone === 'coach' || canonicalTone === 'mentor') {
    return CONSUMER_PROVIDER_BADGE_CLASSES.coach;
  }
  if (canonicalTone === 'wellness') return CONSUMER_PROVIDER_BADGE_CLASSES.wellness;

  switch (provider.supportTierTone) {
    case 'professional':
      return CONSUMER_PROVIDER_BADGE_CLASSES.professional;
    case 'student':
      return CONSUMER_PROVIDER_BADGE_CLASSES.student;
    case 'volunteer':
      return CONSUMER_PROVIDER_BADGE_CLASSES.volunteer;
    case 'coach':
    case 'mentor':
      return CONSUMER_PROVIDER_BADGE_CLASSES.coach;
    case 'wellness':
      return CONSUMER_PROVIDER_BADGE_CLASSES.wellness;
  }

  switch (provider.supportRole) {
    case 'MENTAL_WELLNESS_PROFESSIONAL':
    case 'QUALIFIED_COUNSELLOR':
    case 'PSYCHOLOGIST':
      return CONSUMER_PROVIDER_BADGE_CLASSES.professional;
    case 'PSYCHOLOGY_STUDENT_VOLUNTEER':
    case 'STUDENT_VOLUNTEER':
      return CONSUMER_PROVIDER_BADGE_CLASSES.student;
    case 'PEER_SUPPORT_VOLUNTEER':
      return CONSUMER_PROVIDER_BADGE_CLASSES.volunteer;
    case 'NLP_COACH':
    case 'LIFE_COACH':
    case 'CAREER_STUDY_MENTOR':
      return CONSUMER_PROVIDER_BADGE_CLASSES.coach;
    case 'MEDITATION_BREATHWORK_GUIDE':
      return CONSUMER_PROVIDER_BADGE_CLASSES.wellness;
    default:
      return CONSUMER_PROVIDER_BADGE_CLASSES[fallback];
  }
}
