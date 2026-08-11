import {
  careTeamTypeLabel,
  isClinicalMentalHealthCareTeamType,
  isHopeHubProvider,
  isListenerCareTeamType,
  type DoctorProfileSummary,
} from './doctor-types.constants';
import { ROUTE_PATHS } from './app-routes.constants';

export type ProviderOnboardingStep = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  queryParams?: Record<string, string>;
  complete: boolean;
  required: boolean;
  missing?: string[];
};

export type ProviderOnboardingStatus = {
  title: string;
  subtitle: string;
  percent: number;
  complete: boolean;
  steps: ProviderOnboardingStep[];
};

function hasText(value?: string | null, minLength = 2) {
  return Boolean(value && value.trim().length >= minLength);
}

function hasList(values?: string[] | null) {
  return Boolean(values?.some((value) => value.trim().length > 0));
}

function activeServiceCount(profile?: DoctorProfileSummary | null) {
  return (
    profile?.mentalHealthProfile?.services?.filter((service) => service.isActive !== false)
      .length || 0
  );
}

function primaryCareTeamType(profile?: DoctorProfileSummary | null) {
  return (
    profile?.mentalHealthProfile?.careTeamType ||
    profile?.mentalHealthProfile?.careTeamTypes?.[0] ||
    null
  );
}

function isListenerProfile(profile?: DoctorProfileSummary | null) {
  const mental = profile?.mentalHealthProfile;
  const types = mental?.careTeamTypes?.length
    ? mental.careTeamTypes
    : mental?.careTeamType
      ? [mental.careTeamType]
      : [];
  return types.some((type) => isListenerCareTeamType(type));
}

function isClinicalHopeHubProfile(profile?: DoctorProfileSummary | null) {
  const mental = profile?.mentalHealthProfile;
  const types = mental?.careTeamTypes?.length
    ? mental.careTeamTypes
    : mental?.careTeamType
      ? [mental.careTeamType]
      : [];
  return types.length === 0 || types.some((type) => isClinicalMentalHealthCareTeamType(type));
}

export function buildProviderOnboardingStatus(
  profile: DoctorProfileSummary | null | undefined,
  profileImageUrl?: string | null,
): ProviderOnboardingStatus {
  const hopeHub = isHopeHubProvider(profile);
  const listener = isListenerProfile(profile);
  const clinicalHopeHub = hopeHub && isClinicalHopeHubProfile(profile);
  const mental = profile?.mentalHealthProfile;
  const providerLabel = hopeHub
    ? careTeamTypeLabel(primaryCareTeamType(profile)) || 'Hope Hub provider'
    : profile?.doctorTypeLabel || 'Professional provider';
  const identityMissing = [
    !profileImageUrl ? 'profile photo' : '',
    !hasText(profile?.specialty) && !hopeHub ? 'specialty/focus' : '',
    clinicalHopeHub && !hasText(mental?.qualifiedFrom) ? 'qualified/trained from' : '',
    hopeHub && !hasList(mental?.languages) ? 'languages' : '',
  ].filter(Boolean);
  const bioMissing = [
    !hasText(profile?.bio, 80) ? 'bio of at least 80 characters' : '',
    hopeHub && !hasList(mental?.concernsHandled) ? 'concerns handled' : '',
    hopeHub && !hasList(mental?.sessionTypes) ? 'session types' : '',
    !hopeHub && !hasList(profile?.focusAreas) ? 'focus areas' : '',
  ].filter(Boolean);
  const safetyMissing = [
    listener && !mental?.listenerSafetyAcknowledgedAt ? 'listener safety acknowledgement' : '',
    !listener && hopeHub && !hasText(mental?.safetyEscalationNote, 20)
      ? 'safety escalation note'
      : '',
  ].filter(Boolean);
  const servicesMissing =
    hopeHub && activeServiceCount(profile) <= 0 ? ['one active service/price'] : [];
  const screeningMissing = [
    listener && !mental?.listenerScreening?.passed ? 'passed listener screening test' : '',
  ].filter(Boolean);

  const steps: ProviderOnboardingStep[] = [
    {
      id: 'approved',
      title: 'Provider account ready',
      description: 'Your account is created. Complete setup to unlock your full provider console.',
      actionLabel: 'Done',
      route: `/${ROUTE_PATHS.DASHBOARD}`,
      complete: Boolean(profile),
      required: true,
      missing: profile ? [] : ['provider account'],
    },
    {
      id: 'identity',
      title: 'Basic identity',
      description: 'Add your name, mobile number, profile photo, and public role.',
      actionLabel: 'Open profile',
      route: `/${ROUTE_PATHS.PROFILE}`,
      queryParams: { step: 'identity' },
      complete:
        Boolean(profileImageUrl) &&
        hasText(profile?.specialty) &&
        (!clinicalHopeHub || hasText(mental?.qualifiedFrom)) &&
        (!hopeHub || hasList(mental?.languages)),
      required: true,
      missing: identityMissing,
    },
    {
      id: 'bio',
      title: 'Public profile',
      description: hopeHub
        ? 'Explain how you support users, languages, concerns handled, and your approach.'
        : 'Add experience, focus areas, bio, and public consultation details.',
      actionLabel: 'Complete profile',
      route: `/${ROUTE_PATHS.PROFILE}`,
      queryParams: { step: 'public' },
      complete:
        hasText(profile?.bio, 80) &&
        (hopeHub
          ? hasList(mental?.concernsHandled) && hasList(mental?.sessionTypes)
          : hasList(profile?.focusAreas)),
      required: true,
      missing: bioMissing,
    },
    {
      id: 'screening',
      title: 'Listener screening test passed',
      description: 'Complete the listener screening test before you can support users.',
      actionLabel: 'Review status',
      route: `/${ROUTE_PATHS.DASHBOARD}`,
      complete: listener ? Boolean(mental?.listenerScreening?.passed) : true,
      required: listener,
      missing: screeningMissing,
    },
    {
      id: 'safety',
      title: listener ? 'Listener safety rules accepted' : 'Safety and scope set',
      description: listener
        ? 'Read and accept listener rules before talking to users.'
        : 'Add safety notes and define your support scope clearly.',
      actionLabel: 'Review safety',
      route: `/${ROUTE_PATHS.PROFILE}`,
      queryParams: { step: 'safety' },
      complete: listener
        ? Boolean(mental?.listenerSafetyAcknowledgedAt)
        : hopeHub
          ? hasText(mental?.safetyEscalationNote, 20)
          : true,
      required: hopeHub,
      missing: safetyMissing,
    },
    {
      id: 'services',
      title: 'Services and pricing',
      description: 'Add at least one active service users can book or request.',
      actionLabel: 'Add services',
      route: `/${ROUTE_PATHS.PROFILE}`,
      queryParams: { step: 'services' },
      complete: hopeHub ? activeServiceCount(profile) > 0 : true,
      required: hopeHub,
      missing: servicesMissing,
    },
    {
      id: 'availability',
      title: 'Availability setup',
      description: 'Add slots or keep your live availability ready before accepting users.',
      actionLabel: 'Set availability',
      route: `/${ROUTE_PATHS.SLOTS}`,
      complete: Boolean(profile?.isAvailable),
      required: true,
      missing: profile?.isAvailable ? [] : ['availability enabled'],
    },
  ];

  const requiredSteps = steps.filter((step) => step.required);
  const completedRequired = requiredSteps.filter((step) => step.complete).length;
  const percent = Math.round((completedRequired / Math.max(requiredSteps.length, 1)) * 100);

  return {
    title: `${providerLabel} onboarding`,
    subtitle: 'Finish these tasks first. Then the full provider console will unlock.',
    percent,
    complete: completedRequired === requiredSteps.length,
    steps,
  };
}
