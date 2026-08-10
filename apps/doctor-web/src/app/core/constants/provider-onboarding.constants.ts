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
  complete: boolean;
  required: boolean;
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

  const steps: ProviderOnboardingStep[] = [
    {
      id: 'approved',
      title: 'Account approved',
      description: 'Admin has approved your provider access.',
      actionLabel: 'Done',
      route: `/${ROUTE_PATHS.DASHBOARD}`,
      complete: Boolean(profile),
      required: true,
    },
    {
      id: 'identity',
      title: 'Basic identity',
      description: 'Add your name, mobile number, profile photo, and public role.',
      actionLabel: 'Open profile',
      route: `/${ROUTE_PATHS.PROFILE}`,
      complete:
        Boolean(profileImageUrl) &&
        hasText(profile?.specialty) &&
        (!clinicalHopeHub || hasText(mental?.qualifiedFrom)) &&
        (!hopeHub || hasList(mental?.languages)),
      required: true,
    },
    {
      id: 'bio',
      title: 'Public profile',
      description: hopeHub
        ? 'Explain how you support users, languages, concerns handled, and your approach.'
        : 'Add experience, focus areas, bio, and public consultation details.',
      actionLabel: 'Complete profile',
      route: `/${ROUTE_PATHS.PROFILE}`,
      complete:
        hasText(profile?.bio, 80) &&
        (hopeHub
          ? hasList(mental?.concernsHandled) && hasList(mental?.sessionTypes)
          : hasList(profile?.focusAreas)),
      required: true,
    },
    {
      id: 'safety',
      title: listener ? 'Listener safety rules accepted' : 'Safety and scope set',
      description: listener
        ? 'Read and accept listener rules before talking to users.'
        : 'Add safety notes and define your support scope clearly.',
      actionLabel: 'Review safety',
      route: `/${ROUTE_PATHS.PROFILE}`,
      complete: listener
        ? Boolean(mental?.listenerSafetyAcknowledgedAt)
        : hopeHub
          ? hasText(mental?.safetyEscalationNote, 20)
          : true,
      required: hopeHub,
    },
    {
      id: 'services',
      title: 'Services and pricing',
      description: 'Add at least one active service users can book or request.',
      actionLabel: 'Add services',
      route: `/${ROUTE_PATHS.PROFILE}`,
      complete: hopeHub ? activeServiceCount(profile) > 0 : true,
      required: hopeHub,
    },
    {
      id: 'availability',
      title: 'Availability setup',
      description: 'Add slots or keep your live availability ready before accepting users.',
      actionLabel: 'Set availability',
      route: `/${ROUTE_PATHS.SLOTS}`,
      complete: Boolean(profile?.isAvailable),
      required: true,
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
