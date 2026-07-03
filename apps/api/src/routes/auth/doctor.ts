import { Router } from 'express';
import { z } from 'zod';
import { HomeopathicDoctorType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  doctorProfileSchema,
  doctorProfileSelect,
  doctorTypeLabel,
  specialtyFocusLabel,
  toDoctorProfilePayload
} from '../../constants/homeopathic-doctor-types.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';

export function registerAuthDoctorRoutes(router: Router) {
router.post(
  '/doctor/enroll',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        mobile: z.string().min(8).optional(),
        password: z.string().min(8),
        specialty: z.string().min(2),
        registrationNo: z.string().optional()
      })
      .parse(req.body);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const doctor = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        mobile: body.mobile,
        passwordHash,
        role: Role.DOCTOR,
        isActive: false,
        doctorProfile: {
          create: toDoctorProfilePayload({
            doctorType: HomeopathicDoctorType.JUNIOR_DOCTOR,
            specialty: body.specialty,
            registrationNo: body.registrationNo
          })
        }
      },
      select: publicUserSelect
    });

    res.status(201).json({
      doctor,
      approvalStatus: 'PENDING',
      message: 'Enrollment submitted. Please wait for admin approval before login.'
    });
  })
);

router.get(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: { select: doctorProfileSelect }
      }
    });

    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    const doctorProfile = profile.doctorProfile
      ? {
          ...profile.doctorProfile,
          doctorTypeLabel: doctorTypeLabel(profile.doctorProfile.doctorType),
          specialtyFocusLabel: specialtyFocusLabel(profile.doctorProfile.specialtyFocus)
        }
      : null;

    res.json({ profile: { ...profile, doctorProfile } });
  })
);

router.put(
  '/doctor/profile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        mobile: z.string().min(8).optional().or(z.literal('')),
        specialty: z.string().min(2),
        registrationNo: z.string().optional().or(z.literal('')),
        isAvailable: z.boolean().optional().default(true)
      })
      .parse(req.body);

    const existing = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
      select: { doctorType: true, specialtyFocus: true }
    });

    const profilePayload = toDoctorProfilePayload({
      doctorType: existing?.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR,
      specialtyFocus: existing?.specialtyFocus,
      specialty: body.specialty,
      registrationNo: body.registrationNo,
      isAvailable: body.isAvailable
    });

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: body.name,
        mobile: body.mobile || null,
        doctorProfile: {
          upsert: {
            create: profilePayload,
            update: {
              specialty: profilePayload.specialty,
              registrationNo: profilePayload.registrationNo,
              isAvailable: profilePayload.isAvailable
            }
          }
        }
      },
      select: {
        ...publicUserSelect,
        isActive: true,
        doctorProfile: { select: doctorProfileSelect }
      }
    });

    const doctorProfile = updated.doctorProfile
      ? {
          ...updated.doctorProfile,
          doctorTypeLabel: doctorTypeLabel(updated.doctorProfile.doctorType),
          specialtyFocusLabel: specialtyFocusLabel(updated.doctorProfile.specialtyFocus)
        }
      : null;

    res.json({ profile: { ...updated, doctorProfile } });
  })
);

}