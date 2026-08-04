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
import { assertMethodOptionId } from '../../services/doctor-prescribing-preferences.js';
import { PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT } from '../../services/doctor-compensation.js';
import { notifyAdminsAboutDoctorSignup } from '../../services/doctor-signup-notifications.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../../utils/profile-image-url.js';

function inferDoctorTypeFromSpecialty(specialty: string) {
  return /psycholog|counsell|counsel|therapist|mental/i.test(specialty)
    ? HomeopathicDoctorType.PSYCHOLOGIST
    : HomeopathicDoctorType.JUNIOR_DOCTOR;
}

const mentalHealthProviderProfileSchema = z
  .object({
    qualifications: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
    licenseNumber: z.string().trim().max(120).optional().nullable().or(z.literal('')),
    licenseCouncil: z.string().trim().max(160).optional().nullable().or(z.literal('')),
    languages: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    modalities: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    sessionTypes: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    ageGroups: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    concernsHandled: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
    introSessionTitle: z.string().trim().max(180).optional().nullable().or(z.literal('')),
    counsellingApproach: z.string().trim().max(3000).optional().nullable().or(z.literal('')),
    safetyEscalationNote: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
    acceptsHighRiskCases: z.boolean().optional()
  })
  .optional();

function cleanList(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function cleanNullableText(value: string | null | undefined) {
  return value?.trim() || null;
}

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
      const inferredDoctorType = inferDoctorTypeFromSpecialty(body.specialty);
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
              doctorType: inferredDoctorType,
              specialty: body.specialty,
              registrationNo: body.registrationNo
            })
          }
        },
        select: publicUserSelect
      });

      await notifyAdminsAboutDoctorSignup({
        id: doctor.id,
        name: body.name,
        email: body.email,
        mobile: doctor.mobile,
        specialty: body.specialty,
        registrationNo: body.registrationNo || null
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
          registrationNo: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true),
          bio: z.string().max(1200).optional().nullable(),
          yearsOfExperience: z.number().int().min(0).max(60).optional().nullable(),
          focusAreas: z.array(z.string().min(1)).optional(),
          mentalHealthProfile: mentalHealthProviderProfileSchema,
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
        select: { doctorType: true, specialtyFocus: true }
      });

      const profilePayload = toDoctorProfilePayload({
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
      const mentalHealthProfile =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST && body.mentalHealthProfile
          ? {
              qualifications: cleanList(body.mentalHealthProfile.qualifications),
              licenseNumber: cleanNullableText(body.mentalHealthProfile.licenseNumber),
              licenseCouncil: cleanNullableText(body.mentalHealthProfile.licenseCouncil),
              languages: cleanList(body.mentalHealthProfile.languages),
              modalities: cleanList(body.mentalHealthProfile.modalities),
              sessionTypes: cleanList(body.mentalHealthProfile.sessionTypes),
              ageGroups: cleanList(body.mentalHealthProfile.ageGroups),
              concernsHandled: cleanList(body.mentalHealthProfile.concernsHandled),
              introSessionTitle: cleanNullableText(body.mentalHealthProfile.introSessionTitle),
              counsellingApproach: cleanNullableText(body.mentalHealthProfile.counsellingApproach),
              safetyEscalationNote: cleanNullableText(
                body.mentalHealthProfile.safetyEscalationNote
              ),
              acceptsHighRiskCases: body.mentalHealthProfile.acceptsHighRiskCases ?? false
            }
          : null;
      const compensationFields =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
          ? { consultationSharePercent: PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT }
          : {};

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: body.name,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                ...profilePayload,
                ...compensationFields,
                ...publicFields,
                ...(mentalHealthProfile
                  ? { mentalHealthProfile: { create: mentalHealthProfile } }
                  : {}),
                defaultMethodOptionId: body.defaultMethodOptionId ?? null
              },
              update: {
                specialty: profilePayload.specialty,
                registrationNo: profilePayload.registrationNo,
                isAvailable: profilePayload.isAvailable,
                ...compensationFields,
                ...(body.defaultMethodOptionId !== undefined
                  ? { defaultMethodOptionId: body.defaultMethodOptionId }
                  : {}),
                ...publicFields,
                ...(mentalHealthProfile
                  ? {
                      mentalHealthProfile: {
                        upsert: {
                          create: mentalHealthProfile,
                          update: mentalHealthProfile
                        }
                      }
                    }
                  : {})
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
