import type { NextFunction, Request, Response } from 'express';
import { HomeopathicDoctorType, Role } from '@prisma/client';
import { AUTH_MESSAGES } from './constants/auth.constants.js';
import {
  DOCTOR_TYPE_CAPABILITIES,
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
      select: { doctorType: true }
    });
    const doctorType = profile?.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
    if (!DOCTOR_TYPE_CAPABILITIES[doctorType][capability]) {
      return res.status(403).json({
        message: message ?? 'This action is not available for your doctor role.',
        code: 'DOCTOR_CAPABILITY_DENIED',
        capability,
        doctorType
      });
    }

    next();
  };
}
