import type { NextFunction, Request, Response } from 'express';
import { CareTeamMemberType, HomeopathicDoctorType, Role } from '@prisma/client';
import { AUTH_MESSAGES } from './constants/auth.constants.js';
import {
  capabilitiesForDoctorProfile,
  isClinicalMentalHealthCareTeamType,
  isListenerCareTeamType,
  type DoctorTypeCapabilities
} from './constants/homeopathic-doctor-types.js';
import { prisma } from './db.js';
import {
  isHomeopathyApprovalFlowSuspension,
  isHomeopathyCredentialReview,
  normalizeProfessionalRegistrationNumber
} from './constants/homeopathy-provider-approval.constants.js';
import type {
  ProviderOnboardingStepDto,
  ProviderReadinessBlockerDto,
  ProviderReadinessDto
} from '@hopehub/contracts';

function hasText(value?: string | null, minLength = 2) {
  return Boolean(value && value.trim().length >= minLength);
}

function hasList(values?: string[] | null) {
  return Boolean(values?.some((value) => value.trim().length > 0));
}

type ProviderReadinessBlocker = ProviderReadinessBlockerDto;

const BLOCKER_STEP: Record<string, string> = {
  DOCTOR_PROFILE_REQUIRED: 'account',
  PROVIDER_INACTIVE: 'account',
  PROVIDER_SUSPENDED: 'account',
  ACTIVE_PROVIDER_ROLE_REQUIRED: 'care',
  NAME_REQUIRED: 'identity',
  MOBILE_REQUIRED: 'identity',
  GENDER_REQUIRED: 'identity',
  PROFILE_PHOTO_REQUIRED: 'identity',
  SPECIALTY_REQUIRED: 'credentials',
  REGISTRATION_NUMBER_REQUIRED: 'credentials',
  PROFILE_BIO_REQUIRED: 'public',
  FOCUS_AREAS_REQUIRED: 'public',
  LANGUAGES_REQUIRED: 'care',
  SESSION_TYPES_REQUIRED: 'care',
  CONCERNS_REQUIRED: 'care',
  QUALIFICATION_REQUIRED: 'care',
  LICENSE_COUNCIL_REQUIRED: 'care',
  LICENSE_NUMBER_REQUIRED: 'care',
  SAFETY_SCOPE_REQUIRED: 'safety',
  LISTENER_SAFETY_REQUIRED: 'safety',
  LISTENER_SCREENING_REQUIRED: 'screening',
  ACTIVE_SERVICE_REQUIRED: 'services',
  PRICING_APPROVAL_PENDING: 'services',
  SERVICE_ROLE_MISMATCH: 'services',
  PROVIDER_AVAILABILITY_OFF: 'availability',
  NOT_ACCEPTING_USERS: 'availability',
  PROVIDER_APPROVAL_PENDING: 'approval',
  EMAIL_VERIFICATION_REQUIRED: 'credentials',
  CREDENTIAL_DOCUMENT_REQUIRED: 'credentials',
  DUPLICATE_REGISTRATION_NUMBER: 'credentials'
};

function readinessResult(
  rawBlockers: ProviderReadinessBlocker[],
  options: {
    providerLabel?: string;
    hopeHub?: boolean;
    listener?: boolean;
    approval?: boolean;
  } = {}
): ProviderReadinessDto {
  const blockers = rawBlockers.map((blocker) => ({
    ...blocker,
    stepId: blocker.stepId ?? BLOCKER_STEP[blocker.code]
  }));
  const blockedSteps = new Map<string, string[]>();
  for (const blocker of blockers) {
    if (!blocker.stepId) continue;
    const missing = blockedSteps.get(blocker.stepId) ?? [];
    missing.push(blocker.label);
    blockedSteps.set(blocker.stepId, missing);
  }
  const step = (
    definition: Omit<ProviderOnboardingStepDto, 'complete' | 'missing'>
  ): ProviderOnboardingStepDto => ({
    ...definition,
    complete: !blockedSteps.has(definition.id),
    missing: blockedSteps.get(definition.id) ?? []
  });
  const steps: ProviderOnboardingStepDto[] = [
    step({
      id: 'account',
      title: 'Provider account ready',
      description: 'Your provider account is active and ready for setup.',
      actionLabel: 'View setup',
      route: '/dashboard',
      required: true
    }),
    step({
      id: 'identity',
      title: 'Basic identity',
      description: 'Add your name, mobile number, gender, and profile photo.',
      actionLabel: 'Complete identity',
      route: '/profile',
      queryParams: { step: 'identity' },
      required: true
    }),
    ...(options.approval
      ? [
          step({
            id: 'credentials',
            title: 'Professional credentials',
            description:
              'Add your specialty, registration number, verified email, and credential document.',
            actionLabel: 'Complete credentials',
            route: '/profile',
            queryParams: { step: 'credentials' },
            required: true
          })
        ]
      : []),
    step({
      id: 'public',
      title: 'Public profile',
      description: 'Write a clear public bio so users know how you can help.',
      actionLabel: 'Complete profile',
      route: '/profile',
      queryParams: { step: 'public' },
      required: true
    }),
    ...(options.hopeHub
      ? [
          step({
            id: 'care',
            title: 'Support details',
            description: 'Choose your roles, languages, session modes, concerns, and credentials.',
            actionLabel: 'Add support details',
            route: '/profile',
            queryParams: { step: 'care' },
            required: true
          }),
          ...(options.listener
            ? [
                step({
                  id: 'screening',
                  title: 'Listener screening',
                  description: 'Complete the listener screening before supporting users.',
                  actionLabel: 'Open screening',
                  route: '/listener-screening',
                  required: true
                })
              ]
            : []),
          step({
            id: 'safety',
            title: 'Safety and scope',
            description: 'Confirm your boundaries and escalation process.',
            actionLabel: 'Review safety',
            route: '/profile',
            queryParams: { step: 'safety' },
            required: true
          }),
          step({
            id: 'services',
            title: 'Services and pricing',
            description: 'Add at least one active service linked to an active provider role.',
            actionLabel: 'Add services',
            route: '/profile',
            queryParams: { step: 'services' },
            required: true
          })
        ]
      : []),
    step({
      id: 'availability',
      title: 'Availability',
      description: 'Choose bookable times or turn on live availability.',
      actionLabel: 'Set availability',
      route: '/slots',
      required: true
    }),
    ...(options.approval
      ? [
          step({
            id: 'approval',
            title: 'Credential approval',
            description:
              'Hope Hub reviews your completed professional profile before it becomes public.',
            actionLabel: 'View approval status',
            route: '/dashboard',
            required: true
          })
        ]
      : [])
  ];
  const required = steps.filter((item) => item.required);
  const completeCount = required.filter((item) => item.complete).length;
  const ready = blockers.length === 0;
  return {
    ready,
    code: ready ? 'READY' : (blockers[0]?.code ?? 'NOT_READY'),
    message: ready
      ? 'Ready.'
      : (blockers[0]?.label ?? 'Complete required setup before accepting users.'),
    title: `${options.providerLabel || 'Provider'} onboarding`,
    subtitle: ready
      ? 'Your profile is ready for users.'
      : 'Complete one step at a time to unlock your provider console.',
    percent: Math.round((completeCount / Math.max(required.length, 1)) * 100),
    blockers,
    steps
  };
}

type HomeopathyApprovalProfile = {
  specialty: string;
  registrationNo: string | null;
  registrationNoNormalized?: string | null;
  credentialDocumentKey?: string | null;
  bio: string | null;
  focusAreas: string[];
  user: {
    name: string;
    mobile: string | null;
    gender: unknown;
    profileImageKey: string | null;
    profileImageUrl: string | null;
    emailVerified?: boolean;
  };
};

function homeopathyProfileCompletionBlockers(
  profile: HomeopathyApprovalProfile
): ProviderReadinessBlocker[] {
  const blockers: ProviderReadinessBlocker[] = [];
  if (!hasText(profile.user.name)) {
    blockers.push({
      code: 'NAME_REQUIRED',
      label: 'Provider name is missing.',
      action: 'Add your full name in Profile.'
    });
  }
  if (!hasText(profile.user.mobile, 8)) {
    blockers.push({
      code: 'MOBILE_REQUIRED',
      label: 'Mobile number is missing.',
      action: 'Add a valid mobile number in Profile.'
    });
  }
  if (!profile.user.gender) {
    blockers.push({
      code: 'GENDER_REQUIRED',
      label: 'Gender is missing.',
      action: 'Choose a gender/preference in Profile.'
    });
  }
  if (!profile.user.profileImageKey && !profile.user.profileImageUrl) {
    blockers.push({
      code: 'PROFILE_PHOTO_REQUIRED',
      label: 'Profile photo is missing.',
      action: 'Upload a clear professional profile photo.'
    });
  }
  if (!hasText(profile.specialty)) {
    blockers.push({
      code: 'SPECIALTY_REQUIRED',
      label: 'Homeopathy specialty is missing.',
      action: 'Add your specialty/focus in Profile.'
    });
  }
  if (!hasText(profile.registrationNo, 3)) {
    blockers.push({
      code: 'REGISTRATION_NUMBER_REQUIRED',
      label: 'Professional registration number is missing.',
      action: 'Add the registration number that admin should verify.'
    });
  }
  if (!profile.user.emailVerified) {
    blockers.push({
      code: 'EMAIL_VERIFICATION_REQUIRED',
      label: 'Email address is not verified.',
      action: 'Open the verification email from Hope Hub before submitting for approval.'
    });
  }
  if (!profile.credentialDocumentKey) {
    blockers.push({
      code: 'CREDENTIAL_DOCUMENT_REQUIRED',
      label: 'Registration credential document is missing.',
      action: 'Upload a PDF or image of your professional registration credential.'
    });
  }
  if (!hasText(profile.bio, 80)) {
    blockers.push({
      code: 'PROFILE_BIO_REQUIRED',
      label: 'Public bio must be at least 80 characters.',
      action: 'Write a clear professional bio in Profile.'
    });
  }
  if (!hasList(profile.focusAreas)) {
    blockers.push({
      code: 'FOCUS_AREAS_REQUIRED',
      label: 'At least one focus area is required.',
      action: 'Add the concerns or focus areas you work with.'
    });
  }
  return blockers;
}

export async function homeopathyProviderApprovalReadiness(userId: string) {
  const profile = await prisma.doctor.findUnique({
    where: { userId },
    select: {
      providerDomain: true,
      specialty: true,
      registrationNo: true,
      registrationNoNormalized: true,
      credentialDocumentKey: true,
      bio: true,
      focusAreas: true,
      user: {
        select: {
          name: true,
          mobile: true,
          gender: true,
          profileImageKey: true,
          profileImageUrl: true,
          emailVerified: true
        }
      }
    }
  });
  if (!profile || profile.providerDomain !== 'HOMEOPATHY') {
    return {
      ready: false,
      blockers: [
        {
          code: 'DOCTOR_PROFILE_REQUIRED',
          label: 'Homeopathy provider profile not found.',
          action: 'Create or restore the provider profile.'
        }
      ] as ProviderReadinessBlocker[]
    };
  }
  const blockers = homeopathyProfileCompletionBlockers(profile);
  const normalizedRegistration =
    profile.registrationNoNormalized ||
    normalizeProfessionalRegistrationNumber(profile.registrationNo);
  if (normalizedRegistration) {
    const candidates = await prisma.doctor.findMany({
      where: {
        userId: { not: userId },
        providerDomain: 'HOMEOPATHY',
        registrationNo: { not: null }
      },
      select: { registrationNo: true, registrationNoNormalized: true }
    });
    if (
      candidates.some(
        (candidate) =>
          (candidate.registrationNoNormalized ||
            normalizeProfessionalRegistrationNumber(candidate.registrationNo)) ===
          normalizedRegistration
      )
    ) {
      blockers.push({
        code: 'DUPLICATE_REGISTRATION_NUMBER',
        label: 'This professional registration number is already in use.',
        action: 'Contact Hope Hub support if this is your existing account.'
      });
    }
  }
  return { ready: blockers.length === 0, blockers };
}

async function latestListenerScreeningPassedForEmail(email?: string | null) {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail) return false;

  const [attempt, application] = await Promise.all([
    prisma.listenerScreeningAttempt.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: { passed: true, createdAt: true }
    }),
    prisma.counsellorApplication.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        listenerScreeningCompletedAt: { not: null }
      },
      orderBy: { listenerScreeningCompletedAt: 'desc' },
      select: { listenerScreeningPassed: true, listenerScreeningCompletedAt: true }
    })
  ]);

  const applicationCompletedAt = application?.listenerScreeningCompletedAt ?? null;
  const attemptCompletedAt = attempt?.createdAt ?? null;
  if (
    applicationCompletedAt &&
    (!attemptCompletedAt || applicationCompletedAt.getTime() >= attemptCompletedAt.getTime())
  ) {
    return application?.listenerScreeningPassed ?? false;
  }
  return Boolean(attempt?.passed);
}

export async function providerPublicReadiness(userId: string) {
  const profile = await prisma.doctor.findUnique({
    where: { userId },
    select: {
      id: true,
      doctorType: true,
      providerDomain: true,
      specialty: true,
      registrationNo: true,
      credentialDocumentKey: true,
      isAvailable: true,
      showOnWebsite: true,
      suspendedAt: true,
      suspendedReason: true,
      bio: true,
      focusAreas: true,
      user: {
        select: {
          name: true,
          email: true,
          mobile: true,
          gender: true,
          profileImageKey: true,
          profileImageUrl: true,
          emailVerified: true,
          isActive: true
        }
      },
      roleAssignments: {
        where: { status: 'ACTIVE' },
        select: {
          roleCode: true,
          isPrimary: true,
          credentialStatus: true,
          role: {
            select: {
              label: true,
              category: true,
              isActive: true,
              requiresCredentials: true,
              requiresListenerScreening: true
            }
          }
        }
      },
      mentalHealthProfile: {
        select: {
          careTeamType: true,
          careTeamTypes: true,
          qualifiedFrom: true,
          licenseNumber: true,
          licenseCouncil: true,
          languages: true,
          sessionTypes: true,
          concernsHandled: true,
          safetyEscalationNote: true,
          listenerSafetyAcknowledgedAt: true,
          acceptingNewUsers: true,
          services: {
            where: { isActive: true },
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              providerRoleCode: true,
              approvalStatus: true
            }
          }
        }
      }
    }
  });

  if (!profile) {
    return readinessResult([
      {
        code: 'DOCTOR_PROFILE_REQUIRED',
        label: 'Provider profile not found.',
        action: 'Create or restore provider profile.'
      }
    ]);
  }
  const blockers: ProviderReadinessBlocker[] = [];
  if (!profile.user.isActive) {
    blockers.push({
      code: 'PROVIDER_INACTIVE',
      label: 'Provider account is inactive.',
      action: 'Ask admin to activate the account.'
    });
  }
  const onboardingApprovalPending =
    profile.providerDomain === 'HOMEOPATHY' &&
    Boolean(profile.suspendedAt) &&
    isHomeopathyApprovalFlowSuspension(profile.suspendedReason);
  if (profile.suspendedAt && !onboardingApprovalPending) {
    blockers.push({
      code: 'PROVIDER_SUSPENDED',
      label: 'Provider account is under review and cannot accept sessions.',
      action: 'Contact Hope Hub support/admin.'
    });
  }
  if (!profile.isAvailable && !onboardingApprovalPending) {
    blockers.push({
      code: 'PROVIDER_AVAILABILITY_OFF',
      label: 'Profile availability is off.',
      action: 'Turn on availability in your profile.'
    });
  }

  const isHopeHub =
    profile.providerDomain === 'HOPE_HUB' ||
    profile.doctorType === HomeopathicDoctorType.PSYCHOLOGIST;
  if (!isHopeHub) {
    if (onboardingApprovalPending) {
      blockers.push(...homeopathyProfileCompletionBlockers(profile));
      blockers.push({
        code: 'PROVIDER_APPROVAL_PENDING',
        label: isHomeopathyCredentialReview(profile.suspendedReason)
          ? 'Your completed profile is awaiting credential approval.'
          : 'Complete your profile to submit it for credential approval.',
        action: 'Complete the missing profile steps or wait for admin review.'
      });
    } else if (!hasText(profile.bio, 40)) {
      blockers.push({
        code: 'PROFILE_BIO_REQUIRED',
        label: 'Complete your provider bio before accepting bookings.',
        action: 'Open Profile and add a short public bio.'
      });
    }
    return readinessResult(blockers, {
      providerLabel: 'Homeopathy provider',
      approval: onboardingApprovalPending
    });
  }

  const mental = profile.mentalHealthProfile;
  const assignedRoles = profile.roleAssignments.filter((assignment) => assignment.role.isActive);
  const careTeamTypes = assignedRoles.length
    ? assignedRoles.map((assignment) => assignment.roleCode)
    : mental?.careTeamTypes?.length
      ? mental.careTeamTypes
      : mental?.careTeamType
        ? [mental.careTeamType]
        : [];
  const isListener = assignedRoles.length
    ? assignedRoles.some((assignment) => assignment.role.category === 'EMOTIONAL_LISTENER')
    : careTeamTypes.some((type) => isListenerCareTeamType(type as CareTeamMemberType));
  const isClinical = assignedRoles.length
    ? assignedRoles.some((assignment) => assignment.role.category === 'PROFESSIONAL_CARE')
    : careTeamTypes.length === 0 ||
      careTeamTypes.some((type) => isClinicalMentalHealthCareTeamType(type as CareTeamMemberType));
  if (!assignedRoles.length) {
    blockers.push({
      code: 'ACTIVE_PROVIDER_ROLE_REQUIRED',
      label: 'Choose at least one active provider role.',
      action: 'Open Support details and choose the support you provide.'
    });
  }
  const hasProfileImage = Boolean(profile.user.profileImageKey || profile.user.profileImageUrl);
  if (!hasText(profile.user.name)) {
    blockers.push({
      code: 'NAME_REQUIRED',
      label: 'Provider name is missing.',
      action: 'Add your name in Profile.'
    });
  }
  if (!hasText(profile.user.mobile, 8)) {
    blockers.push({
      code: 'MOBILE_REQUIRED',
      label: 'Mobile number is missing.',
      action: 'Add mobile number in Profile.'
    });
  }
  if (!profile.user.gender) {
    blockers.push({
      code: 'GENDER_REQUIRED',
      label: 'Gender is missing.',
      action: 'Add gender in Profile.'
    });
  }
  if (!hasProfileImage) {
    blockers.push({
      code: 'PROFILE_PHOTO_REQUIRED',
      label: 'Profile photo is missing.',
      action: 'Upload a clear profile photo.'
    });
  }
  if (!hasText(profile.bio, 80)) {
    blockers.push({
      code: 'PROFILE_BIO_REQUIRED',
      label: 'Public bio must be at least 80 characters.',
      action: 'Write a short, reassuring public bio.'
    });
  }
  if (!hasList(mental?.languages)) {
    blockers.push({
      code: 'LANGUAGES_REQUIRED',
      label: 'Languages are missing.',
      action: 'Add languages you can support.'
    });
  }
  if (!hasList(mental?.sessionTypes)) {
    blockers.push({
      code: 'SESSION_TYPES_REQUIRED',
      label: 'Session types are missing.',
      action: 'Choose chat, voice, video, or relevant session types.'
    });
  }
  if (!hasList(mental?.concernsHandled)) {
    blockers.push({
      code: 'CONCERNS_REQUIRED',
      label: 'Concerns handled are missing.',
      action: 'Add concerns you can safely support.'
    });
  }
  if (mental?.acceptingNewUsers === false) {
    blockers.push({
      code: 'NOT_ACCEPTING_USERS',
      label: 'Accepting new users is turned off.',
      action: 'Turn on accepting new users in Profile.'
    });
  }
  const approvedServices =
    mental?.services?.filter((service) => service.approvalStatus === 'APPROVED') ?? [];
  if (!approvedServices.some((service) => service.title.trim() && service.durationMinutes >= 5)) {
    const hasPendingPricing = mental?.services?.some(
      (service) => service.approvalStatus === 'PENDING'
    );
    blockers.push({
      code: hasPendingPricing ? 'PRICING_APPROVAL_PENDING' : 'ACTIVE_SERVICE_REQUIRED',
      label: hasPendingPricing
        ? 'Your service pricing is awaiting admin review.'
        : 'No active service/price is configured.',
      action: hasPendingPricing
        ? 'You can continue after an admin approves the pricing.'
        : 'Add at least one active service in Profile.'
    });
  }
  const activeRoleCodes = new Set(assignedRoles.map((assignment) => assignment.roleCode));
  if (approvedServices.some((service) => !activeRoleCodes.has(service.providerRoleCode))) {
    blockers.push({
      code: 'SERVICE_ROLE_MISMATCH',
      label: 'A service is linked to a role that is not active on this profile.',
      action: 'Edit Services and choose an active provider role for every service.'
    });
  }
  if (isClinical && !hasText(mental?.qualifiedFrom)) {
    blockers.push({
      code: 'QUALIFICATION_REQUIRED',
      label: 'Qualification/training details are missing.',
      action: 'Add where you are qualified/trained from.'
    });
  }
  if (isClinical && !hasText(mental?.licenseCouncil)) {
    blockers.push({
      code: 'LICENSE_COUNCIL_REQUIRED',
      label: 'Registration council is missing.',
      action: 'Add your registration council in Profile.'
    });
  }
  if (isClinical && !hasText(mental?.licenseNumber)) {
    blockers.push({
      code: 'LICENSE_NUMBER_REQUIRED',
      label: 'Registration number is missing.',
      action: 'Add your registration number in Profile.'
    });
  }
  if (!hasText(mental?.safetyEscalationNote, 20)) {
    blockers.push({
      code: 'SAFETY_SCOPE_REQUIRED',
      label: 'Safety escalation note is missing.',
      action: 'Add what you will do for crisis/high-risk situations.'
    });
  }
  if (isListener) {
    if (!mental?.listenerSafetyAcknowledgedAt) {
      blockers.push({
        code: 'LISTENER_SAFETY_REQUIRED',
        label: 'Listener safety rules are not accepted.',
        action: 'Read and accept listener safety rules.'
      });
    }
    if (!(await latestListenerScreeningPassedForEmail(profile.user.email))) {
      blockers.push({
        code: 'LISTENER_SCREENING_REQUIRED',
        label: 'Listener screening test is not passed.',
        action: 'Complete and pass the listener screening test.'
      });
    }
  }

  const primaryAssignment =
    assignedRoles.find((assignment) => assignment.isPrimary) ?? assignedRoles[0];
  return readinessResult(blockers, {
    providerLabel: primaryAssignment?.role.label || 'Hope Hub provider',
    hopeHub: true,
    listener: isListener
  });
}

export function requireDoctorCapability(
  capability: keyof DoctorTypeCapabilities,
  message?: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: AUTH_MESSAGES.FORBIDDEN });
    }

    if (req.user.role !== Role.DOCTOR) {
      return next();
    }

    const profile = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: {
        doctorType: true,
        mentalHealthProfile: { select: { careTeamType: true, careTeamTypes: true } }
      }
    });

    if (!profile) {
      return res.status(403).json({
        message: 'Provider profile is required for this action.',
        code: 'DOCTOR_PROFILE_REQUIRED',
        capability
      });
    }

    const doctorType = profile.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
    if (!capabilitiesForDoctorProfile(profile)[capability]) {
      return res.status(403).json({
        message: message ?? 'This action is not available for your provider role.',
        code: 'DOCTOR_CAPABILITY_DENIED',
        capability,
        doctorType,
        careTeamType: profile?.mentalHealthProfile?.careTeamType ?? null
      });
    }

    next();
  };
}
