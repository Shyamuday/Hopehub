import { Router } from 'express';
import { z } from 'zod';
import {
  CounsellorApplicationTrack,
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
  isListenerCareTeamType,
  specialtyFocusLabel,
  toDoctorProfilePayload
} from '../../constants/homeopathic-doctor-types.js';
import {
  MAX_FAILED_LISTENER_SCREENING_ATTEMPTS,
  LISTENER_SCREENING_COOLDOWN_HOURS
} from '../../constants/listener-onboarding.constants.js';
import { assertMethodOptionId } from '../../services/doctor-prescribing-preferences.js';
import { PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT } from '../../services/doctor-compensation.js';
import { notifyAdminsAboutDoctorSignup } from '../../services/doctor-signup-notifications.js';
import { asyncRoute, publicUserSelect, logAuthEvent } from '../../utils/helpers.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../../utils/profile-image-url.js';
import { createEmailVerificationToken } from '../../services/email-verification.js';
import { recordAuthProcess } from '../../services/auth-process-log.js';
import { providerPublicReadiness } from '../../doctor-capabilities.js';
import {
  normalizeProviderRoles,
  providerClassificationFromAssignments,
  providerClassificationFromLegacy
} from '@hopehub/contracts';
import {
  publicListenerScreeningQuestionSet,
  sanitizeListenerScreeningQuestions,
  scoreListenerScreening
} from '../../services/listener-screening-question-sets.js';
import {
  assertServiceRolesAssigned,
  syncProviderRoleAssignments
} from '../../services/provider-taxonomy.service.js';

const LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION = 'listener-safety-v1-2026-08-07';

function inferDoctorTypeFromSpecialty(specialty: string) {
  return /psycholog|counsell|counsel|therapist|mental/i.test(specialty)
    ? HomeopathicDoctorType.PSYCHOLOGIST
    : HomeopathicDoctorType.JUNIOR_DOCTOR;
}

const mentalHealthProviderProfileFieldsSchema = z.object({
  careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
  careTeamTypes: z.array(z.nativeEnum(CareTeamMemberType)).max(12).optional(),
  primaryRoleCode: z.string().trim().min(3).max(64).optional(),
  roleCodes: z.array(z.string().trim().min(3).max(64)).max(20).optional(),
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
        providerRole: z.nativeEnum(CareTeamMemberType).optional().nullable(),
        providerRoleCode: z.string().trim().min(3).max(64).optional().nullable(),
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
});

const mentalHealthProviderProfileSchema = mentalHealthProviderProfileFieldsSchema.optional();
const mentalHealthProviderProfilePatchSchema = mentalHealthProviderProfileFieldsSchema.extend({
  listenerSafetyAcknowledged: z.boolean().optional()
});

export const doctorProfileStepPatchSchema = z.object({
  step: z.enum(['identity', 'public', 'care', 'safety', 'services']),
  name: z.string().trim().min(2).optional(),
  gender: z.nativeEnum(PatientGender).optional().nullable(),
  mobile: z.string().trim().min(8).optional().or(z.literal('')),
  specialty: z.string().trim().min(2).optional(),
  registrationNo: z.string().trim().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  bio: z.string().trim().max(1200).optional().nullable(),
  yearsOfExperience: z.number().int().min(0).max(60).optional().nullable(),
  focusAreas: z.array(z.string().trim().min(1)).max(40).optional(),
  mentalHealthProfile: mentalHealthProviderProfilePatchSchema.optional(),
  defaultMethodOptionId: z.string().min(1).nullable().optional()
});

export const doctorListenerScreeningSubmissionSchema = z.object({
  questionSetId: z.string().trim().min(1).max(120),
  questionSetVersion: z.string().trim().min(1).max(120),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(80),
        optionId: z.string().trim().min(1).max(80)
      })
    )
    .min(1)
    .max(60)
});

function cleanList(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function cleanNullableText(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeCareTeamTypes(
  primary: CareTeamMemberType | undefined,
  selected: CareTeamMemberType[] | undefined
): [CareTeamMemberType, ...CareTeamMemberType[]] {
  return normalizeProviderRoles(
    primary,
    selected,
    CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL
  ) as [CareTeamMemberType, ...CareTeamMemberType[]];
}

async function latestListenerScreeningForEmail(email?: string | null) {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail) return null;

  const [attempt, application] = await Promise.all([
    prisma.listenerScreeningAttempt.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: {
        score: true,
        maxScore: true,
        passed: true,
        createdAt: true,
        questionSetVersion: true
      }
    }),
    prisma.counsellorApplication.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        listenerScreeningCompletedAt: { not: null }
      },
      orderBy: { listenerScreeningCompletedAt: 'desc' },
      select: {
        listenerScreeningScore: true,
        listenerScreeningMaxScore: true,
        listenerScreeningPassed: true,
        listenerScreeningCompletedAt: true,
        listenerScreeningQuestionSetVersion: true
      }
    })
  ]);

  const applicationCompletedAt = application?.listenerScreeningCompletedAt ?? null;
  const attemptCompletedAt = attempt?.createdAt ?? null;
  const useApplication =
    applicationCompletedAt &&
    (!attemptCompletedAt || applicationCompletedAt.getTime() >= attemptCompletedAt.getTime());

  if (useApplication && application) {
    return {
      score: application.listenerScreeningScore,
      maxScore: application.listenerScreeningMaxScore,
      passed: application.listenerScreeningPassed,
      completedAt: applicationCompletedAt,
      questionSetVersion: application.listenerScreeningQuestionSetVersion
    };
  }

  if (!attempt) return null;
  return {
    score: attempt.score,
    maxScore: attempt.maxScore,
    passed: attempt.passed,
    completedAt: attempt.createdAt,
    questionSetVersion: attempt.questionSetVersion
  };
}

function withListenerScreening(
  doctorProfile: any,
  listenerScreening: Awaited<ReturnType<typeof latestListenerScreeningForEmail>>
) {
  if (!doctorProfile?.mentalHealthProfile) return doctorProfile;
  return {
    ...doctorProfile,
    mentalHealthProfile: {
      ...doctorProfile.mentalHealthProfile,
      listenerScreening
    }
  };
}

export function registerAuthDoctorRoutes(router: Router) {
  router.post(
    '/doctor/enroll',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().trim().min(8, 'Mobile number is required'),
          password: z.string().min(8),
          specialty: z.string().min(2).optional(),
          registrationNo: z.string().optional(),
          careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
          careTeamTypes: z.array(z.nativeEnum(CareTeamMemberType)).max(12).optional()
        })
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      // A new provider starts with a simple account only. Their support path is selected
      // in the guided onboarding conversation after their first sign-in.
      const careTeamTypes = normalizeCareTeamTypes(body.careTeamType, body.careTeamTypes);
      const isHopeHubProvider = true;
      const primaryCareTeamType = careTeamTypes[0];
      const inferredDoctorType = HomeopathicDoctorType.PSYCHOLOGIST;
      const specialty = body.specialty || 'Hope Hub Support';
      const doctor = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          passwordHash,
          role: Role.DOCTOR,
          isActive: true,
          doctorProfile: {
            create: {
              ...toDoctorProfilePayload({
                doctorType: inferredDoctorType,
                specialty,
                registrationNo: body.registrationNo
              }),
              ...(isHopeHubProvider
                ? {
                    mentalHealthProfile: {
                      create: {
                        careTeamType: primaryCareTeamType,
                        careTeamTypes,
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
        specialty,
        registrationNo: body.registrationNo || null
      });

      const verification = await createEmailVerificationToken({
        userId: doctor.id,
        email: body.email,
        portal: 'provider',
        req
      });
      await recordAuthProcess({
        processType: 'provider_enrollment',
        step: 'signup',
        status: 'success',
        identifier: body.email.trim().toLowerCase(),
        req,
        metadata: {
          userId: doctor.id,
          careTeamTypes,
          emailVerificationSent: verification.sent
        }
      });

      res.status(201).json({
        doctor,
        approvalStatus: 'ACTIVE',
        emailVerificationRequired: true,
        emailVerificationSent: verification.sent,
        ...(verification.devVerifyUrl ? { devVerifyUrl: verification.devVerifyUrl } : {}),
        message:
          'Provider account created. Log in to complete your setup before appearing on Hope Hub.'
      });
    })
  );

  router.put(
    '/doctor/onboarding-path',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          supportStyle: z.enum(['LISTEN', 'GUIDE', 'COUNSEL']),
          formalTraining: z.enum(['YES', 'IN_PROGRESS', 'NO']).optional()
        })
        .parse(req.body);

      const selection =
        body.supportStyle === 'LISTEN'
          ? {
              careTeamType: CareTeamMemberType.PEER_SUPPORT_VOLUNTEER,
              specialty: 'Peer emotional support listener'
            }
          : body.supportStyle === 'GUIDE'
            ? {
                careTeamType: CareTeamMemberType.LIFE_COACH,
                specialty: 'Life coach / guide'
              }
            : {
                careTeamType:
                  body.formalTraining === 'YES'
                    ? CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL
                    : body.formalTraining === 'IN_PROGRESS'
                      ? CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER
                      : CareTeamMemberType.PEER_SUPPORT_VOLUNTEER,
                specialty:
                  body.formalTraining === 'YES'
                    ? 'Counselling / mental-wellness support'
                    : body.formalTraining === 'IN_PROGRESS'
                      ? 'Psychology student listener'
                      : 'Peer emotional support listener'
              };

      const updated = await prisma.doctor.update({
        where: { userId: req.user!.id },
        data: {
          doctorType: HomeopathicDoctorType.PSYCHOLOGIST,
          specialty: selection.specialty,
          mentalHealthProfile: {
            upsert: {
              create: {
                careTeamType: selection.careTeamType,
                careTeamTypes: [selection.careTeamType],
                onboardingPathSelectedAt: new Date(),
                acceptingNewUsers: true,
                autoMatchEnabled: true
              },
              update: {
                careTeamType: selection.careTeamType,
                careTeamTypes: [selection.careTeamType],
                onboardingPathSelectedAt: new Date()
              }
            }
          }
        },
        select: doctorProfileSelect
      });

      res.json({
        doctorProfile: {
          ...updated,
          doctorTypeLabel: doctorTypeLabel(updated.doctorType),
          specialtyFocusLabel: specialtyFocusLabel(updated.specialtyFocus),
          providerClassification:
            providerClassificationFromAssignments(updated) ??
            providerClassificationFromLegacy(updated)
        }
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
          doctorProfile: { select: { ...doctorProfileSelect, id: true } }
        }
      });

      if (!profile) return res.status(404).json({ message: 'Provider profile not found' });

      const listenerScreening = await latestListenerScreeningForEmail(profile.email);
      const doctorProfile = profile.doctorProfile
        ? {
            ...profile.doctorProfile,
            doctorTypeLabel: doctorTypeLabel(profile.doctorProfile.doctorType),
            specialtyFocusLabel: specialtyFocusLabel(profile.doctorProfile.specialtyFocus),
            providerClassification:
              providerClassificationFromAssignments(profile.doctorProfile) ??
              providerClassificationFromLegacy(profile.doctorProfile)
          }
        : null;

      res.json({
        profile: enrichWithProfileImageUrl(
          { ...profile, doctorProfile: withListenerScreening(doctorProfile, listenerScreening) },
          userProfileImagePath
        )
      });
    })
  );

  router.get(
    '/doctor/readiness',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const readiness = await providerPublicReadiness(req.user!.id);
      res.json({ readiness });
    })
  );

  router.get(
    '/doctor/listener-screening',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const provider = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: {
          mentalHealthProfile: { select: { careTeamType: true, careTeamTypes: true } }
        }
      });
      const types = provider?.mentalHealthProfile?.careTeamTypes?.length
        ? provider.mentalHealthProfile.careTeamTypes
        : provider?.mentalHealthProfile?.careTeamType
          ? [provider.mentalHealthProfile.careTeamType]
          : [];
      if (!types.some((type) => isListenerCareTeamType(type))) {
        return res.status(403).json({
          message: 'Listener screening is only available for listener support roles.',
          code: 'LISTENER_ROLE_REQUIRED'
        });
      }

      const [questionSet, latestAttempt] = await Promise.all([
        prisma.listenerScreeningQuestionSet.findFirst({
          where: { isActive: true },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
        }),
        latestListenerScreeningForEmail(req.user!.email)
      ]);
      if (!questionSet) {
        return res.status(503).json({
          message: 'Listener screening test is not available right now. Please try again later.'
        });
      }

      res.json({
        questionSet: publicListenerScreeningQuestionSet(questionSet),
        latestAttempt
      });
    })
  );

  router.post(
    '/doctor/listener-screening',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = doctorListenerScreeningSubmissionSchema.parse(req.body);
      const provider = await prisma.doctor.findUniqueOrThrow({
        where: { userId: req.user!.id },
        select: {
          mentalHealthProfile: { select: { careTeamType: true, careTeamTypes: true } },
          user: { select: { email: true, mobile: true } }
        }
      });
      const types = provider.mentalHealthProfile?.careTeamTypes?.length
        ? provider.mentalHealthProfile.careTeamTypes
        : provider.mentalHealthProfile?.careTeamType
          ? [provider.mentalHealthProfile.careTeamType]
          : [];
      const listenerType = types.find((type) => isListenerCareTeamType(type));
      if (!listenerType) {
        return res.status(403).json({
          message: 'Listener screening is only available for listener support roles.',
          code: 'LISTENER_ROLE_REQUIRED'
        });
      }
      const providerEmail = provider.user.email?.trim();
      if (!providerEmail) {
        return res.status(400).json({
          message: 'Add an email address before taking the listener screening test.',
          code: 'EMAIL_REQUIRED'
        });
      }

      const cooldownStart = new Date(
        Date.now() - LISTENER_SCREENING_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const failedAttempts = await prisma.listenerScreeningAttempt.count({
        where: {
          email: { equals: providerEmail, mode: 'insensitive' },
          passed: false,
          createdAt: { gte: cooldownStart }
        }
      });
      if (failedAttempts >= MAX_FAILED_LISTENER_SCREENING_ATTEMPTS) {
        return res.status(429).json({
          message: `Please wait ${LISTENER_SCREENING_COOLDOWN_HOURS} hours before trying the screening again.`,
          code: 'LISTENER_SCREENING_COOLDOWN'
        });
      }

      const questionSet = await prisma.listenerScreeningQuestionSet.findFirst({
        where: { id: body.questionSetId, isActive: true }
      });
      if (!questionSet || questionSet.version !== body.questionSetVersion) {
        return res.status(409).json({
          message: 'The screening test changed. Reload and complete the latest test.',
          code: 'LISTENER_SCREENING_CHANGED'
        });
      }
      const questions = sanitizeListenerScreeningQuestions(questionSet.questions);
      const expectedIds = new Set(questions.map((question) => question.id));
      const answerIds = new Set(body.answers.map((answer) => answer.questionId));
      if (
        body.answers.length !== questions.length ||
        answerIds.size !== expectedIds.size ||
        [...expectedIds].some((id) => !answerIds.has(id))
      ) {
        return res.status(400).json({
          message: 'Answer every question before submitting the screening test.',
          code: 'LISTENER_SCREENING_INCOMPLETE'
        });
      }

      const result = scoreListenerScreening(questions, body.answers, questionSet.passScore);
      const applicationTrack =
        listenerType === CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER
          ? CounsellorApplicationTrack.PSYCHOLOGY_STUDENT_VOLUNTEER
          : CounsellorApplicationTrack.PEER_SUPPORT_VOLUNTEER;
      await prisma.listenerScreeningAttempt.create({
        data: {
          questionSetId: questionSet.id,
          questionSetVersion: questionSet.version,
          applicationTrack,
          email: providerEmail,
          phone: provider.user.mobile || '',
          score: result.score,
          maxScore: result.maxScore,
          passed: result.passed,
          cooldownExpiresAt: result.passed
            ? null
            : new Date(Date.now() + LISTENER_SCREENING_COOLDOWN_HOURS * 60 * 60 * 1000),
          source: 'doctor-web',
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null
        }
      });

      const readiness = await providerPublicReadiness(req.user!.id);
      await prisma.doctor.update({
        where: { userId: req.user!.id },
        data: { showOnWebsite: readiness.ready }
      });
      res.status(201).json({ result, readiness });
    })
  );

  router.patch(
    '/doctor/profile',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = doctorProfileStepPatchSchema.parse(req.body);
      const existing = await prisma.doctor.findUniqueOrThrow({
        where: { userId: req.user!.id },
        select: {
          id: true,
          doctorType: true,
          mentalHealthProfile: {
            select: { careTeamType: true, careTeamTypes: true }
          }
        }
      });

      if (body.defaultMethodOptionId) {
        const method = await assertMethodOptionId(body.defaultMethodOptionId);
        if (!method) return res.status(400).json({ message: 'Invalid prescribing approach.' });
      }

      const userData: Record<string, unknown> = {};
      const doctorData: Record<string, unknown> = {};
      const mentalData: Record<string, unknown> = {};

      if (body.step === 'identity') {
        if (body.name !== undefined) userData.name = body.name;
        if (body.gender !== undefined) userData.gender = body.gender;
        if (body.mobile !== undefined) userData.mobile = body.mobile || null;
        if (body.isAvailable !== undefined) doctorData.isAvailable = body.isAvailable;
        if (body.defaultMethodOptionId !== undefined) {
          doctorData.defaultMethodOptionId = body.defaultMethodOptionId;
        }
      }

      if (body.step === 'public') {
        if (body.bio !== undefined) doctorData.bio = body.bio || null;
        if (body.yearsOfExperience !== undefined) {
          doctorData.yearsOfExperience = body.yearsOfExperience;
        }
        if (body.focusAreas !== undefined) doctorData.focusAreas = cleanList(body.focusAreas);
      }

      const mental = body.mentalHealthProfile;
      let requestedRoleSync: { primaryRoleCode: string; roleCodes: string[] } | null = null;
      if (body.step === 'care' && mental) {
        const primaryRoleCode =
          mental.primaryRoleCode ??
          mental.careTeamType ??
          existing.mentalHealthProfile?.careTeamType ??
          CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL;
        const providerRoleCodes = Array.from(
          new Set([
            primaryRoleCode,
            ...(mental.roleCodes ??
              mental.careTeamTypes ??
              existing.mentalHealthProfile?.careTeamTypes ??
              [])
          ])
        );
        const legacyRoles = providerRoleCodes.filter((role): role is CareTeamMemberType =>
          Object.values(CareTeamMemberType).includes(role as CareTeamMemberType)
        );
        const primary = legacyRoles.includes(primaryRoleCode as CareTeamMemberType)
          ? (primaryRoleCode as CareTeamMemberType)
          : (legacyRoles[0] ?? CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL);
        if (body.specialty !== undefined) doctorData.specialty = body.specialty;
        if (body.registrationNo !== undefined) {
          doctorData.registrationNo = body.registrationNo || null;
        }
        mentalData.careTeamType = primary;
        mentalData.careTeamTypes = legacyRoles.length ? legacyRoles : [primary];
        requestedRoleSync = { primaryRoleCode, roleCodes: providerRoleCodes };
        if (mental.qualifications !== undefined) {
          mentalData.qualifications = cleanList(mental.qualifications);
        }
        if (mental.qualifiedFrom !== undefined) {
          mentalData.qualifiedFrom = cleanNullableText(mental.qualifiedFrom);
        }
        if (mental.licenseNumber !== undefined) {
          mentalData.licenseNumber = cleanNullableText(mental.licenseNumber);
        }
        if (mental.licenseCouncil !== undefined) {
          mentalData.licenseCouncil = cleanNullableText(mental.licenseCouncil);
        }
        if (mental.languages !== undefined) mentalData.languages = cleanList(mental.languages);
        if (mental.modalities !== undefined) mentalData.modalities = cleanList(mental.modalities);
        if (mental.sessionTypes !== undefined) {
          mentalData.sessionTypes = cleanList(mental.sessionTypes);
        }
        if (mental.ageGroups !== undefined) mentalData.ageGroups = cleanList(mental.ageGroups);
        if (mental.concernsHandled !== undefined) {
          mentalData.concernsHandled = cleanList(mental.concernsHandled);
        }
      }

      if (body.step === 'safety' && mental) {
        if (mental.introSessionTitle !== undefined) {
          mentalData.introSessionTitle = cleanNullableText(mental.introSessionTitle);
        }
        if (mental.counsellingApproach !== undefined) {
          mentalData.counsellingApproach = cleanNullableText(mental.counsellingApproach);
        }
        if (mental.safetyEscalationNote !== undefined) {
          mentalData.safetyEscalationNote = cleanNullableText(mental.safetyEscalationNote);
        }
        if (mental.listenerSafetyAcknowledged !== undefined) {
          mentalData.listenerSafetyAcknowledgedAt = mental.listenerSafetyAcknowledged
            ? new Date()
            : null;
          mentalData.listenerSafetyAcknowledgedVersion = mental.listenerSafetyAcknowledged
            ? (cleanNullableText(mental.listenerSafetyAcknowledgedVersion) ??
              LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION)
            : null;
        }
        if (mental.acceptsHighRiskCases !== undefined) {
          mentalData.acceptsHighRiskCases = mental.acceptsHighRiskCases;
        }
      }

      if (body.step === 'services' && mental) {
        const servicePrimary =
          existing.mentalHealthProfile?.careTeamType ??
          CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL;
        const serviceProviderRoles = normalizeCareTeamTypes(
          servicePrimary,
          existing.mentalHealthProfile?.careTeamTypes
        );
        if (mental.autoMatchEnabled !== undefined) {
          mentalData.autoMatchEnabled = mental.autoMatchEnabled;
        }
        if (mental.acceptingNewUsers !== undefined) {
          mentalData.acceptingNewUsers = mental.acceptingNewUsers;
        }
        if (mental.maxSessionsPerDay !== undefined) {
          mentalData.maxSessionsPerDay = mental.maxSessionsPerDay;
        }
        if (mental.maxSessionsPerWeek !== undefined) {
          mentalData.maxSessionsPerWeek = mental.maxSessionsPerWeek;
        }
        if (mental.services !== undefined) {
          const serviceRoleCodes = mental.services.map(
            (service) => service.providerRoleCode || service.providerRole || servicePrimary
          );
          await assertServiceRolesAssigned(existing.id, serviceRoleCodes);
          const services = mental.services.map((service, index) => ({
            providerRole:
              service.providerRole && serviceProviderRoles.includes(service.providerRole)
                ? service.providerRole
                : servicePrimary,
            providerRoleCode: service.providerRoleCode || service.providerRole || servicePrimary,
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
          }));
          mentalData.services = {
            deleteMany: {},
            ...(services.length ? { create: services } : {})
          };
        }
      }

      const hasMentalData = Object.keys(mentalData).length > 0;
      if (hasMentalData && existing.doctorType !== HomeopathicDoctorType.PSYCHOLOGIST) {
        return res
          .status(400)
          .json({ message: 'Support profile fields are not available for this provider role.' });
      }

      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...userData,
          ...(Object.keys(doctorData).length || hasMentalData
            ? {
                doctorProfile: {
                  update: {
                    ...doctorData,
                    ...(hasMentalData
                      ? {
                          mentalHealthProfile: {
                            upsert: {
                              create: {
                                careTeamType: CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
                                careTeamTypes: [CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL],
                                qualifications: [],
                                languages: [],
                                modalities: [],
                                sessionTypes: [],
                                ageGroups: [],
                                concernsHandled: [],
                                ...mentalData
                              },
                              update: mentalData
                            }
                          }
                        }
                      : {})
                  }
                }
              }
            : {})
        }
      });

      if (requestedRoleSync) {
        await syncProviderRoleAssignments({
          doctorId: existing.id,
          ...requestedRoleSync,
          actorId: req.user!.id
        });
      }

      const readiness = await providerPublicReadiness(req.user!.id);
      await prisma.doctor.update({
        where: { userId: req.user!.id },
        data: { showOnWebsite: readiness.ready }
      });
      res.json({ message: 'Profile step saved.', readiness });
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
      const requestedPrimaryRoleCode =
        body.mentalHealthProfile?.primaryRoleCode ??
        body.mentalHealthProfile?.careTeamType ??
        CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL;
      const requestedRoleCodes = Array.from(
        new Set([
          requestedPrimaryRoleCode,
          ...(body.mentalHealthProfile?.roleCodes ?? body.mentalHealthProfile?.careTeamTypes ?? [])
        ])
      );
      const requestedLegacyRoles = requestedRoleCodes.filter((role): role is CareTeamMemberType =>
        Object.values(CareTeamMemberType).includes(role as CareTeamMemberType)
      );
      const invalidServiceRole = body.mentalHealthProfile?.services?.find((service) => {
        const roleCode =
          service.providerRoleCode || service.providerRole || requestedPrimaryRoleCode;
        return !requestedRoleCodes.includes(roleCode);
      });
      if (invalidServiceRole) {
        return res.status(400).json({
          message: 'Each service must belong to one of your active provider roles.'
        });
      }
      const mentalHealthProfile =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST && body.mentalHealthProfile
          ? {
              qualifications: cleanList(body.mentalHealthProfile.qualifications),
              careTeamType: requestedLegacyRoles.includes(
                requestedPrimaryRoleCode as CareTeamMemberType
              )
                ? (requestedPrimaryRoleCode as CareTeamMemberType)
                : (requestedLegacyRoles[0] ?? CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL),
              careTeamTypes: requestedLegacyRoles.length
                ? requestedLegacyRoles
                : [CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL],
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
              providerRole:
                service.providerRole &&
                mentalHealthProfile?.careTeamTypes.includes(service.providerRole)
                  ? service.providerRole
                  : (mentalHealthProfile?.careTeamType ??
                    CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL),
              providerRoleCode:
                service.providerRole ||
                mentalHealthProfile?.careTeamType ||
                CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
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
          doctorProfile: { select: { ...doctorProfileSelect, id: true } }
        }
      });

      if (updated.doctorProfile && mentalHealthProfile) {
        await syncProviderRoleAssignments({
          doctorId: updated.doctorProfile.id,
          primaryRoleCode: requestedPrimaryRoleCode,
          roleCodes: requestedRoleCodes,
          actorId: req.user!.id
        });
      }

      const readiness = await providerPublicReadiness(req.user!.id);
      if (updated.doctorProfile?.showOnWebsite !== readiness.ready) {
        await prisma.doctor.update({
          where: { userId: req.user!.id },
          data: { showOnWebsite: readiness.ready }
        });
        if (updated.doctorProfile) updated.doctorProfile.showOnWebsite = readiness.ready;
      }

      const refreshedListenerScreening = await latestListenerScreeningForEmail(updated.email);
      const doctorProfile = updated.doctorProfile
        ? {
            ...updated.doctorProfile,
            doctorTypeLabel: doctorTypeLabel(updated.doctorProfile.doctorType),
            specialtyFocusLabel: specialtyFocusLabel(updated.doctorProfile.specialtyFocus),
            providerClassification:
              providerClassificationFromAssignments(updated.doctorProfile) ??
              providerClassificationFromLegacy(updated.doctorProfile)
          }
        : null;

      res.json({
        profile: enrichWithProfileImageUrl(
          {
            ...updated,
            doctorProfile: withListenerScreening(doctorProfile, refreshedListenerScreening)
          },
          userProfileImagePath
        )
      });
    })
  );
}
