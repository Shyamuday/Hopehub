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

function hasText(value?: string | null, minLength = 2) {
  return Boolean(value && value.trim().length >= minLength);
}

function hasList(values?: string[] | null) {
  return Boolean(values?.some((value) => value.trim().length > 0));
}

type ProviderReadinessBlocker = {
  code: string;
  label: string;
  action?: string;
};

function readinessResult(blockers: ProviderReadinessBlocker[]) {
  if (!blockers.length) {
    return {
      ready: true,
      code: 'READY',
      message: 'Ready.',
      blockers
    };
  }
  return {
    ready: false,
    code: blockers[0]?.code ?? 'NOT_READY',
    message: blockers[0]?.label ?? 'Complete required setup before accepting users.',
    blockers
  };
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
      isAvailable: true,
      showOnWebsite: true,
      suspendedAt: true,
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
            select: { id: true, title: true, durationMinutes: true, providerRoleCode: true }
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
  if (profile.suspendedAt) {
    blockers.push({
      code: 'PROVIDER_SUSPENDED',
      label: 'Provider account is under review and cannot accept sessions.',
      action: 'Contact Hope Hub support/admin.'
    });
  }
  if (!profile.isAvailable) {
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
    if (!hasText(profile.bio, 40)) {
      blockers.push({
        code: 'PROFILE_BIO_REQUIRED',
        label: 'Complete your provider bio before accepting bookings.',
        action: 'Open Profile and add a short public bio.'
      });
    }
    return readinessResult(blockers);
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
  if (!mental?.services?.some((service) => service.title.trim() && service.durationMinutes >= 5)) {
    blockers.push({
      code: 'ACTIVE_SERVICE_REQUIRED',
      label: 'No active service/price is configured.',
      action: 'Add at least one active service in Profile.'
    });
  }
  const activeRoleCodes = new Set(assignedRoles.map((assignment) => assignment.roleCode));
  if (mental?.services?.some((service) => !activeRoleCodes.has(service.providerRoleCode))) {
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

  return readinessResult(blockers);
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
