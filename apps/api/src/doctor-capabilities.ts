import type { NextFunction, Request, Response } from 'express';
import { HomeopathicDoctorType, Role } from '@prisma/client';
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
      isAvailable: true,
      showOnWebsite: true,
      suspendedAt: true,
      bio: true,
      focusAreas: true,
      user: {
        select: {
          email: true,
          mobile: true,
          gender: true,
          profileImageKey: true,
          profileImageUrl: true,
          isActive: true
        }
      },
      mentalHealthProfile: {
        select: {
          careTeamType: true,
          careTeamTypes: true,
          qualifiedFrom: true,
          languages: true,
          sessionTypes: true,
          concernsHandled: true,
          safetyEscalationNote: true,
          listenerSafetyAcknowledgedAt: true,
          acceptingNewUsers: true,
          services: {
            where: { isActive: true },
            select: { id: true, title: true, durationMinutes: true }
          }
        }
      }
    }
  });

  if (!profile) {
    return {
      ready: false,
      code: 'DOCTOR_PROFILE_REQUIRED',
      message: 'Provider profile not found.'
    };
  }
  if (!profile.user.isActive) {
    return { ready: false, code: 'PROVIDER_INACTIVE', message: 'Provider account is inactive.' };
  }
  if (profile.suspendedAt) {
    return {
      ready: false,
      code: 'PROVIDER_SUSPENDED',
      message: 'Provider account is under review and cannot accept sessions.'
    };
  }
  if (!profile.isAvailable) {
    return {
      ready: false,
      code: 'PROVIDER_AVAILABILITY_OFF',
      message: 'Turn on profile availability before accepting sessions.'
    };
  }

  const isHopeHub = profile.doctorType === HomeopathicDoctorType.PSYCHOLOGIST;
  if (!isHopeHub) {
    if (!hasText(profile.bio, 40)) {
      return {
        ready: false,
        code: 'PROFILE_INCOMPLETE',
        message: 'Complete your provider bio before accepting bookings.'
      };
    }
    return { ready: true, code: 'READY', message: 'Ready.' };
  }

  const mental = profile.mentalHealthProfile;
  const careTeamTypes = mental?.careTeamTypes?.length
    ? mental.careTeamTypes
    : mental?.careTeamType
      ? [mental.careTeamType]
      : [];
  const isListener = careTeamTypes.some((type) => isListenerCareTeamType(type));
  const isClinical =
    careTeamTypes.length === 0 ||
    careTeamTypes.some((type) => isClinicalMentalHealthCareTeamType(type));
  const hasProfileImage = Boolean(profile.user.profileImageKey || profile.user.profileImageUrl);
  const commonReady =
    Boolean(profile.user.mobile?.trim()) &&
    Boolean(profile.user.gender) &&
    hasProfileImage &&
    hasText(profile.bio, 80) &&
    hasList(mental?.languages) &&
    hasList(mental?.sessionTypes) &&
    hasList(mental?.concernsHandled) &&
    mental?.acceptingNewUsers !== false &&
    Boolean(
      mental?.services?.some((service) => service.title.trim() && service.durationMinutes >= 5)
    );

  if (!commonReady) {
    return {
      ready: false,
      code: 'PROFILE_INCOMPLETE',
      message:
        'Complete profile, services, languages, concerns, and availability before accepting users.'
    };
  }
  if (isClinical && !hasText(mental?.qualifiedFrom)) {
    return {
      ready: false,
      code: 'QUALIFICATION_REQUIRED',
      message: 'Add qualification/training details before accepting users.'
    };
  }
  if (!isListener && !hasText(mental?.safetyEscalationNote, 20)) {
    return {
      ready: false,
      code: 'SAFETY_SCOPE_REQUIRED',
      message: 'Add safety escalation notes before accepting users.'
    };
  }
  if (isListener) {
    if (!mental?.listenerSafetyAcknowledgedAt) {
      return {
        ready: false,
        code: 'LISTENER_SAFETY_REQUIRED',
        message: 'Accept listener safety rules before accepting users.'
      };
    }
    if (!(await latestListenerScreeningPassedForEmail(profile.user.email))) {
      return {
        ready: false,
        code: 'LISTENER_SCREENING_REQUIRED',
        message: 'Pass the listener screening test before accepting users.'
      };
    }
  }

  return { ready: true, code: 'READY', message: 'Ready.' };
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
