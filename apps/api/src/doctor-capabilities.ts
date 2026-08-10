import type { NextFunction, Request, Response } from 'express';
import { HomeopathicDoctorType, Role } from '@prisma/client';
import { AUTH_MESSAGES } from './constants/auth.constants.js';
import {
  capabilitiesForDoctorProfile,
  type DoctorTypeCapabilities
} from './constants/homeopathic-doctor-types.js';
import { prisma } from './db.js';

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
        mentalHealthProfile: { select: { careTeamType: true } }
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
