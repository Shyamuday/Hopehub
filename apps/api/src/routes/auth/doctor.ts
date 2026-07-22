import { Router } from 'express';
import { z } from 'zod';
import { HomeopathicDoctorType, ProviderType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  doctorProfileSchema,
  doctorProfileSelect,
  doctorTypeLabel,
  providerCategoryLabel,
  providerTypeLabel,
  specialtyFocusLabel,
  toDoctorProfilePayload
} from '../../constants/homeopathic-doctor-types.js';
import { assertMethodOptionId } from '../../services/doctor-prescribing-preferences.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../../utils/profile-image-url.js';

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
          providerType: z.nativeEnum(ProviderType).optional(),
          specialization: z.string().min(2).optional().or(z.literal('')),
          specialty: z.string().min(2).optional().or(z.literal('')),
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
              providerType: body.providerType,
              doctorType: HomeopathicDoctorType.JUNIOR_DOCTOR,
              specialty: body.specialty,
              specialization: body.specialization,
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
          profileImageKey: true,
          isActive: true,
          doctorProfile: { select: doctorProfileSelect }
        }
      });

      if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

      const doctorProfile = profile.doctorProfile
        ? {
            ...profile.doctorProfile,
            providerTypeLabel: providerTypeLabel(profile.doctorProfile.providerType),
            providerCategoryLabel: providerCategoryLabel(profile.doctorProfile.providerCategory),
            doctorTypeLabel: doctorTypeLabel(profile.doctorProfile.doctorType),
            specialtyFocusLabel: specialtyFocusLabel(profile.doctorProfile.specialtyFocus)
          }
        : null;

      res.json({
        profile: enrichWithProfileImageUrl({ ...profile, doctorProfile }, userProfileImagePath)
      });
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
          specialization: z.string().min(2).optional().or(z.literal('')),
          registrationNo: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true),
          bio: z.string().max(1200).optional().nullable(),
          yearsOfExperience: z.number().int().min(0).max(60).optional().nullable(),
          focusAreas: z.array(z.string().min(1)).optional(),
          defaultMethodOptionId: z.string().min(1).nullable().optional()
        })
        .parse(req.body);

      if (body.defaultMethodOptionId) {
        const method = await assertMethodOptionId(body.defaultMethodOptionId);
        if (!method) {
          return res.status(400).json({ message: 'Invalid prescribing approach.' });
        }
      }

      const existing = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: {
          providerType: true,
          providerCategory: true,
          specialization: true,
          doctorType: true,
          specialtyFocus: true
        }
      });

      const profilePayload = toDoctorProfilePayload({
        providerType: existing?.providerType,
        providerCategory: existing?.providerCategory,
        specialization: body.specialization ?? existing?.specialization ?? undefined,
        doctorType: existing?.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR,
        specialtyFocus: existing?.specialtyFocus,
        specialty: body.specialty,
        registrationNo: body.registrationNo,
        isAvailable: body.isAvailable
      });

      const publicFields = {
        bio: body.bio ?? null,
        yearsOfExperience: body.yearsOfExperience ?? null,
        focusAreas: (body.focusAreas ?? []).map((f) => f.trim()).filter(Boolean)
      };

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: body.name,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                ...profilePayload,
                ...publicFields,
                defaultMethodOptionId: body.defaultMethodOptionId ?? null
              },
              update: {
                specialty: profilePayload.specialty,
                specialization: profilePayload.specialization,
                registrationNo: profilePayload.registrationNo,
                isAvailable: profilePayload.isAvailable,
                ...(body.defaultMethodOptionId !== undefined
                  ? { defaultMethodOptionId: body.defaultMethodOptionId }
                  : {}),
                ...publicFields
              }
            }
          }
        },
        select: {
          ...publicUserSelect,
          profileImageKey: true,
          isActive: true,
          doctorProfile: { select: doctorProfileSelect }
        }
      });

      const doctorProfile = updated.doctorProfile
        ? {
            ...updated.doctorProfile,
            providerTypeLabel: providerTypeLabel(updated.doctorProfile.providerType),
            providerCategoryLabel: providerCategoryLabel(updated.doctorProfile.providerCategory),
            doctorTypeLabel: doctorTypeLabel(updated.doctorProfile.doctorType),
            specialtyFocusLabel: specialtyFocusLabel(updated.doctorProfile.specialtyFocus)
          }
        : null;

      res.json({
        profile: enrichWithProfileImageUrl({ ...updated, doctorProfile }, userProfileImagePath)
      });
    })
  );
}
