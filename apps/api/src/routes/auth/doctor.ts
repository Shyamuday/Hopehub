import { Router } from 'express';
import { z } from 'zod';
import {
  CareTeamMemberType,
  CareTeamServicePricingMode,
  HomeopathicDoctorType,
  PatientGender,
  Role
} from '@prisma/client';
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

const LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION = 'listener-safety-v1-2026-08-07';

function inferDoctorTypeFromSpecialty(specialty: string) {
  return /psycholog|counsell|counsel|therapist|mental/i.test(specialty)
    ? HomeopathicDoctorType.PSYCHOLOGIST
    : HomeopathicDoctorType.JUNIOR_DOCTOR;
}

const mentalHealthProviderProfileSchema = z
  .object({
    careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
    qualifications: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
    qualifiedFrom: z.string().trim().max(240).optional().nullable().or(z.literal('')),
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
    listenerSafetyAcknowledged: z.boolean().optional().default(false),
    listenerSafetyAcknowledgedVersion: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .or(z.literal('')),
    acceptsHighRiskCases: z.boolean().optional(),
    autoMatchEnabled: z.boolean().optional(),
    acceptingNewUsers: z.boolean().optional(),
    maxSessionsPerDay: z.number().int().min(1).max(50).optional().nullable(),
    maxSessionsPerWeek: z.number().int().min(1).max(300).optional().nullable(),
    services: z
      .array(
        z.object({
          title: z.string().trim().min(2).max(120),
          description: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
          pricingMode: z
            .nativeEnum(CareTeamServicePricingMode)
            .optional()
            .default(CareTeamServicePricingMode.FIXED),
          priceInPaise: z.number().int().min(0).max(500000).optional().default(0),
          firstSessionPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
          followUpPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
          introSessionLimit: z.number().int().min(1).max(20).optional().default(1),
          packageSessionCount: z.number().int().min(1).max(100).optional().nullable(),
          packagePriceInPaise: z.number().int().min(0).max(5000000).optional().nullable(),
          freeMinutes: z.number().int().min(0).max(240).optional().default(0),
          pricePerMinuteInPaise: z.number().int().min(0).max(50000).optional().nullable(),
          currency: z.string().trim().max(8).optional().default('INR'),
          durationMinutes: z.number().int().min(5).max(240).optional().default(30),
          isFree: z.boolean().optional().default(false),
          isActive: z.boolean().optional().default(true),
          sortOrder: z.number().int().min(0).max(999).optional().default(0)
        })
      )
      .max(20)
      .optional()
  })
  .optional();

function cleanList(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function cleanNullableText(value: string | null | undefined) {
  return value?.trim() || null;
}

function isListenerCareTeamType(type: CareTeamMemberType | undefined) {
  return (
    type === CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER ||
    type === CareTeamMemberType.PEER_SUPPORT_VOLUNTEER
  );
}

function listenerPublicProfileReady(input: {
  name: string;
  mobile?: string | null;
  gender?: PatientGender | null;
  bio?: string | null;
  isAvailable: boolean;
  hasProfileImage: boolean;
  mentalHealthProfile: NonNullable<z.infer<typeof mentalHealthProviderProfileSchema>> & {
    listenerSafetyAcknowledgedAt?: Date | string | null;
  };
  services: Array<{ isActive: boolean; title: string; durationMinutes: number }>;
}) {
  const mental = input.mentalHealthProfile;
  const hasSafetyAcknowledgement = Boolean(
    mental.listenerSafetyAcknowledged || mental.listenerSafetyAcknowledgedAt
  );
  return Boolean(
    input.name.trim().length >= 2 &&
    input.mobile?.trim() &&
    input.gender &&
    input.hasProfileImage &&
    (input.bio?.trim().length ?? 0) >= 80 &&
    cleanList(mental.languages).length > 0 &&
    cleanList(mental.sessionTypes).length > 0 &&
    cleanList(mental.concernsHandled).length > 0 &&
    cleanNullableText(mental.safetyEscalationNote) &&
    hasSafetyAcknowledgement &&
    input.isAvailable &&
    (mental.acceptingNewUsers ?? true) &&
    input.services.some(
      (service) => service.isActive && service.title.trim() && service.durationMinutes >= 5
    )
  );
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
          registrationNo: z.string().optional(),
          careTeamType: z.nativeEnum(CareTeamMemberType).optional()
        })
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const isHopeHubProvider = Boolean(body.careTeamType);
      const inferredDoctorType = isHopeHubProvider
        ? HomeopathicDoctorType.PSYCHOLOGIST
        : inferDoctorTypeFromSpecialty(body.specialty);
      const doctor = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          passwordHash,
          role: Role.DOCTOR,
          isActive: false,
          doctorProfile: {
            create: {
              ...toDoctorProfilePayload({
                doctorType: inferredDoctorType,
                specialty: body.specialty,
                registrationNo: body.registrationNo
              }),
              ...(body.careTeamType
                ? {
                    mentalHealthProfile: {
                      create: {
                        careTeamType: body.careTeamType,
                        acceptingNewUsers: true,
                        autoMatchEnabled: true
                      }
                    }
                  }
                : {})
            }
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
          gender: true,
          profileImageKey: true,
          profileImageUrl: true,
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
          gender: z.nativeEnum(PatientGender).optional().nullable(),
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
        select: {
          doctorType: true,
          specialtyFocus: true,
          user: { select: { profileImageKey: true, profileImageUrl: true } },
          mentalHealthProfile: {
            select: {
              listenerSafetyAcknowledgedAt: true,
              listenerSafetyAcknowledgedVersion: true
            }
          }
        }
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
              careTeamType:
                body.mentalHealthProfile.careTeamType ??
                CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
              qualifiedFrom: cleanNullableText(body.mentalHealthProfile.qualifiedFrom),
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
              listenerSafetyAcknowledgedAt: body.mentalHealthProfile.listenerSafetyAcknowledged
                ? new Date()
                : (existing?.mentalHealthProfile?.listenerSafetyAcknowledgedAt ?? null),
              listenerSafetyAcknowledgedVersion: body.mentalHealthProfile.listenerSafetyAcknowledged
                ? (cleanNullableText(body.mentalHealthProfile.listenerSafetyAcknowledgedVersion) ??
                  LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION)
                : (existing?.mentalHealthProfile?.listenerSafetyAcknowledgedVersion ?? null),
              acceptsHighRiskCases: body.mentalHealthProfile.acceptsHighRiskCases ?? false,
              autoMatchEnabled: body.mentalHealthProfile.autoMatchEnabled ?? true,
              acceptingNewUsers: body.mentalHealthProfile.acceptingNewUsers ?? true,
              maxSessionsPerDay: body.mentalHealthProfile.maxSessionsPerDay ?? null,
              maxSessionsPerWeek: body.mentalHealthProfile.maxSessionsPerWeek ?? null
            }
          : null;
      const mentalHealthServices =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST && body.mentalHealthProfile
          ? (body.mentalHealthProfile.services ?? []).map((service, index) => ({
              title: service.title,
              description: service.description || null,
              pricingMode: service.pricingMode ?? CareTeamServicePricingMode.FIXED,
              priceInPaise:
                service.isFree && service.pricingMode !== CareTeamServicePricingMode.PER_MINUTE
                  ? 0
                  : (service.priceInPaise ?? 0),
              firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
              followUpPriceInPaise: service.followUpPriceInPaise ?? null,
              introSessionLimit: service.introSessionLimit ?? 1,
              packageSessionCount: service.packageSessionCount ?? null,
              packagePriceInPaise: service.packagePriceInPaise ?? null,
              freeMinutes: service.freeMinutes ?? 0,
              pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
              currency: service.currency || 'INR',
              durationMinutes: service.durationMinutes ?? 30,
              isFree:
                service.pricingMode === CareTeamServicePricingMode.FREE_VOLUNTEER
                  ? true
                  : service.pricingMode === CareTeamServicePricingMode.PER_MINUTE
                    ? false
                    : (service.isFree ?? (service.priceInPaise ?? 0) === 0),
              isActive: service.isActive ?? true,
              sortOrder: service.sortOrder ?? index
            }))
          : [];
      const isListenerProfile =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST &&
        isListenerCareTeamType(mentalHealthProfile?.careTeamType);
      const listenerReadyForPublic =
        isListenerProfile && body.mentalHealthProfile
          ? listenerPublicProfileReady({
              name: body.name,
              mobile: body.mobile || null,
              gender: body.gender ?? null,
              bio: body.bio ?? null,
              isAvailable: body.isAvailable,
              hasProfileImage: Boolean(
                existing?.user.profileImageKey || existing?.user.profileImageUrl
              ),
              mentalHealthProfile: {
                ...body.mentalHealthProfile,
                listenerSafetyAcknowledgedAt:
                  mentalHealthProfile?.listenerSafetyAcknowledgedAt ?? null
              },
              services: mentalHealthServices
            })
          : false;
      const mentalHealthProfileCreate = mentalHealthProfile
        ? {
            ...mentalHealthProfile,
            services: mentalHealthServices.length ? { create: mentalHealthServices } : undefined
          }
        : null;
      const mentalHealthProfileUpdate = mentalHealthProfile
        ? {
            ...mentalHealthProfile,
            services: {
              deleteMany: {},
              ...(mentalHealthServices.length ? { create: mentalHealthServices } : {})
            }
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
          gender: body.gender ?? null,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                ...profilePayload,
                ...(isListenerProfile ? { showOnWebsite: listenerReadyForPublic } : {}),
                ...compensationFields,
                ...publicFields,
                ...(mentalHealthProfileCreate
                  ? { mentalHealthProfile: { create: mentalHealthProfileCreate } }
                  : {}),
                defaultMethodOptionId: body.defaultMethodOptionId ?? null
              },
              update: {
                specialty: profilePayload.specialty,
                registrationNo: profilePayload.registrationNo,
                isAvailable: profilePayload.isAvailable,
                ...(isListenerProfile ? { showOnWebsite: listenerReadyForPublic } : {}),
                ...compensationFields,
                ...(body.defaultMethodOptionId !== undefined
                  ? { defaultMethodOptionId: body.defaultMethodOptionId }
                  : {}),
                ...publicFields,
                ...(mentalHealthProfileCreate && mentalHealthProfileUpdate
                  ? {
                      mentalHealthProfile: {
                        upsert: {
                          create: mentalHealthProfileCreate,
                          update: mentalHealthProfileUpdate
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
          gender: true,
          profileImageKey: true,
          profileImageUrl: true,
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
