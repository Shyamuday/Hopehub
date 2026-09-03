import { Router } from 'express';
import { z } from 'zod';
import {
  CounsellorApplicationTrack,
  CareTeamMemberType,
  CareTeamServicePricingMode,
  HomeopathicDoctorType,
  PatientGender,
  Prisma,
  ProviderDomain,
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
import {
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  HOMEOPATHY_PROFILE_DRAFT_REASON,
  submitHomeopathyProviderForApprovalIfReady
} from '../../services/homeopathy-provider-approval.js';
import { normalizeProfessionalRegistrationNumber } from '../../constants/homeopathy-provider-approval.constants.js';
import { parseMultipartForm } from '../../utils/multipart.js';
import {
  deleteProviderCredential,
  MAX_PROVIDER_CREDENTIAL_BYTES,
  readProviderCredential,
  saveProviderCredential
} from '../../services/provider-credential-storage.js';
import { asyncRoute, publicUserSelect, logAuthEvent, writeAuditLog } from '../../utils/helpers.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../../utils/profile-image-url.js';
import { createEmailVerificationToken } from '../../services/email-verification.js';
import { recordAuthProcess } from '../../services/auth-process-log.js';
import { getSiteConfigMap } from '../../services/site-config.service.js';
import { providerPublicReadiness } from '../../doctor-capabilities.js';
import {
  normalizeProviderRoles,
  providerClassificationFromAssignments,
  providerClassificationFromLegacy
} from '@hopehub/contracts';
import {
  publicListenerScreeningQuestionSet,
  listenerScreeningReviewDetails,
  sanitizeListenerScreeningQuestions,
  scoreListenerScreening
} from '../../services/listener-screening-question-sets.js';
import {
  assertServiceRolesAssigned,
  syncProviderRoleAssignments
} from '../../services/provider-taxonomy.service.js';

const LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION = 'listener-safety-v1-2026-08-07';

async function registrationNumberBelongsToAnotherProvider(userId: string, value?: string | null) {
  const normalized = normalizeProfessionalRegistrationNumber(value);
  if (!normalized) return false;
  const candidates = await prisma.doctor.findMany({
    where: {
      userId: { not: userId },
      providerDomain: ProviderDomain.HOMEOPATHY,
      registrationNo: { not: null }
    },
    select: { registrationNo: true, registrationNoNormalized: true }
  });
  return candidates.some(
    (candidate) =>
      (candidate.registrationNoNormalized ||
        normalizeProfessionalRegistrationNumber(candidate.registrationNo)) === normalized
  );
}

function pricingAuditSnapshot(services: Array<Record<string, any>>) {
  return services.map((service) => ({
    id: service.id ?? null,
    title: service.title,
    pricingMode: service.pricingMode,
    regularPriceInPaise: service.priceInPaise,
    firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
    followUpPriceInPaise: service.followUpPriceInPaise ?? null,
    followUpSessionLimit: service.followUpSessionLimit ?? null,
    introSessionLimit: service.introSessionLimit ?? 1,
    offerEndsAt: service.offerEndsAt ? new Date(service.offerEndsAt).toISOString() : null,
    offerBookingLimit: service.offerBookingLimit ?? null,
    pauseOfferWhenNoSlots: service.pauseOfferWhenNoSlots ?? false,
    packageSessionCount: service.packageSessionCount ?? null,
    packagePriceInPaise: service.packagePriceInPaise ?? null,
    durationMinutes: service.durationMinutes,
    isFree: service.isFree,
    isActive: service.isActive
  }));
}

async function providerPricingApprovalPolicy() {
  const config = await getSiteConfigMap([
    'careTeamPricingApprovalRequiredForFree',
    'careTeamPricingApprovalMaxPriceInPaise',
    'careTeamPricingApprovalMaxDiscountPercent'
  ]);
  return {
    requireFreeApproval: config['careTeamPricingApprovalRequiredForFree'] === 'true',
    maxPriceInPaise: Math.max(0, Number(config['careTeamPricingApprovalMaxPriceInPaise'] || 0)),
    maxDiscountPercent: Math.max(
      0,
      Number(config['careTeamPricingApprovalMaxDiscountPercent'] || 0)
    )
  };
}

function providerPricingApprovalReason(
  service: {
    pricingMode?: CareTeamServicePricingMode;
    priceInPaise?: number;
    firstSessionPriceInPaise?: number | null;
    followUpPriceInPaise?: number | null;
    packagePriceInPaise?: number | null;
    packageSessionCount?: number | null;
    pricePerMinuteInPaise?: number | null;
    isFree?: boolean;
  },
  policy: Awaited<ReturnType<typeof providerPricingApprovalPolicy>>
) {
  const price = Math.max(0, Number(service.priceInPaise || 0));
  const comparablePrices = [service.firstSessionPriceInPaise, service.followUpPriceInPaise].filter(
    (value): value is number => value != null
  );
  if (service.packagePriceInPaise != null && service.packageSessionCount) {
    comparablePrices.push(
      Math.round(service.packagePriceInPaise / Math.max(1, service.packageSessionCount))
    );
  }
  const discount = comparablePrices.reduce(
    (highest, candidate) =>
      price > 0
        ? Math.max(highest, Math.max(0, Math.round((1 - candidate / price) * 100)))
        : highest,
    0
  );
  const configuredPrices = [
    price,
    service.firstSessionPriceInPaise,
    service.followUpPriceInPaise,
    service.packagePriceInPaise != null && service.packageSessionCount
      ? Math.round(service.packagePriceInPaise / Math.max(1, service.packageSessionCount))
      : null,
    service.pricePerMinuteInPaise
  ].filter((value): value is number => value != null);
  const reasons: string[] = [];
  if (policy.requireFreeApproval && (service.isFree || price === 0)) reasons.push('Free service');
  if (
    policy.maxPriceInPaise > 0 &&
    configuredPrices.some((configuredPrice) => configuredPrice > policy.maxPriceInPaise)
  ) {
    reasons.push(`Price exceeds ₹${policy.maxPriceInPaise / 100}`);
  }
  if (policy.maxDiscountPercent > 0 && discount > policy.maxDiscountPercent) {
    reasons.push(`Discount exceeds ${policy.maxDiscountPercent}%`);
  }
  return reasons.join('; ');
}

function providerPricingFingerprint(service: Record<string, unknown>) {
  return JSON.stringify({
    pricingMode: service['pricingMode'] ?? CareTeamServicePricingMode.FIXED,
    priceInPaise: Number(service['priceInPaise'] ?? 0),
    firstSessionPriceInPaise: service['firstSessionPriceInPaise'] ?? null,
    offerEndsAt: service['offerEndsAt']
      ? new Date(String(service['offerEndsAt'])).toISOString()
      : null,
    offerBookingLimit: service['offerBookingLimit'] ?? null,
    pauseOfferWhenNoSlots: Boolean(service['pauseOfferWhenNoSlots']),
    followUpPriceInPaise: service['followUpPriceInPaise'] ?? null,
    followUpSessionLimit: service['followUpSessionLimit'] ?? null,
    introSessionLimit: Number(service['introSessionLimit'] ?? 1),
    packageSessionCount: service['packageSessionCount'] ?? null,
    packagePriceInPaise: service['packagePriceInPaise'] ?? null,
    freeMinutes: Number(service['freeMinutes'] ?? 0),
    pricePerMinuteInPaise: service['pricePerMinuteInPaise'] ?? null,
    durationMinutes: Number(service['durationMinutes'] ?? 30),
    isFree: Boolean(service['isFree'])
  });
}

const indianMobileSchema = z
  .string()
  .trim()
  .transform((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91')
      ? `+91${digits.slice(2)}`
      : `+91${digits}`;
  })
  .refine((value) => /^\+91[6-9]\d{9}$/.test(value), {
    message: 'Enter a valid 10-digit Indian mobile number.'
  });

const providerDisplayNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must have at least 2 characters.')
  .max(80, 'Name cannot exceed 80 characters.')
  .regex(/[\p{L}]/u, 'Enter a valid name.');

const providerPasswordSchema = z
  .string()
  .min(8, 'Password must have at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/\d/, 'Password must include a number.');

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
        id: z.string().trim().min(1).optional(),
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
        offerEndsAt: z.coerce.date().optional().nullable(),
        offerBookingLimit: z.number().int().min(1).max(50000).optional().nullable(),
        pauseOfferWhenNoSlots: z.boolean().optional().default(false),
        followUpPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
        followUpSessionLimit: z.number().int().min(1).max(1000).optional().nullable(),
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
  step: z.enum(['identity', 'credentials', 'public', 'care', 'safety', 'services']),
  name: providerDisplayNameSchema.optional(),
  gender: z.nativeEnum(PatientGender).optional().nullable(),
  mobile: indianMobileSchema.optional().or(z.literal('')),
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
        review: true,
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
      questionSetVersion: application.listenerScreeningQuestionSetVersion,
      review: null
    };
  }

  if (!attempt) return null;
  return {
    score: attempt.score,
    maxScore: attempt.maxScore,
    passed: attempt.passed,
    completedAt: attempt.createdAt,
    questionSetVersion: attempt.questionSetVersion,
    review: attempt.review
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
          name: providerDisplayNameSchema,
          email: z.string().email(),
          mobile: indianMobileSchema,
          password: providerPasswordSchema,
          providerDomain: z.nativeEnum(ProviderDomain).optional().default(ProviderDomain.HOPE_HUB),
          specialty: z.string().min(2).optional(),
          registrationNo: z.string().trim().optional(),
          careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
          careTeamTypes: z.array(z.nativeEnum(CareTeamMemberType)).max(12).optional()
        })
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      // A new provider starts with a simple account only. Their support path is selected
      // in the guided onboarding conversation after their first sign-in.
      const careTeamTypes = normalizeCareTeamTypes(body.careTeamType, body.careTeamTypes);
      const isHopeHubProvider = body.providerDomain === ProviderDomain.HOPE_HUB;
      const primaryCareTeamType = careTeamTypes[0];
      const inferredDoctorType = isHopeHubProvider
        ? HomeopathicDoctorType.PSYCHOLOGIST
        : HomeopathicDoctorType.JUNIOR_DOCTOR;
      const specialty = body.specialty || (isHopeHubProvider ? 'Hope Hub Support' : 'Homeopathy');
      const requiresCredentialApproval = !isHopeHubProvider;
      const registrationNoNormalized = normalizeProfessionalRegistrationNumber(body.registrationNo);
      if (registrationNoNormalized) {
        const registrationCandidates = await prisma.doctor.findMany({
          where: { providerDomain: ProviderDomain.HOMEOPATHY, registrationNo: { not: null } },
          select: { registrationNo: true, registrationNoNormalized: true }
        });
        if (
          registrationCandidates.some(
            (candidate) =>
              (candidate.registrationNoNormalized ||
                normalizeProfessionalRegistrationNumber(candidate.registrationNo)) ===
              registrationNoNormalized
          )
        ) {
          return res.status(409).json({
            code: 'REGISTRATION_NUMBER_IN_USE',
            message: 'This professional registration number is already connected to an account.'
          });
        }
      }
      let doctor;
      try {
        doctor = await prisma.user.create({
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
                providerDomain: body.providerDomain,
                approvalStatus: requiresCredentialApproval ? 'DRAFT' : 'NOT_REQUIRED',
                isAvailable: !requiresCredentialApproval,
                ...(requiresCredentialApproval
                  ? {
                      suspendedAt: new Date(),
                      suspendedReason: HOMEOPATHY_PROFILE_DRAFT_REASON,
                      showOnWebsite: false,
                      isOnline: false
                    }
                  : {}),
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
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = error.meta?.target;
          const fields = Array.isArray(target)
            ? target.map(String)
            : typeof target === 'string'
              ? [target]
              : [];
          if (fields.some((field) => field.toLowerCase().includes('email'))) {
            return res.status(409).json({
              code: 'EMAIL_IN_USE',
              message: 'This email is already connected to an account.'
            });
          }
          if (fields.some((field) => field.toLowerCase().includes('mobile'))) {
            return res.status(409).json({
              code: 'MOBILE_IN_USE',
              message: 'This mobile number is already connected to an account.'
            });
          }
          if (fields.some((field) => field.toLowerCase().includes('registration'))) {
            return res.status(409).json({
              code: 'REGISTRATION_NUMBER_IN_USE',
              message: 'This professional registration number is already connected to an account.'
            });
          }
        }
        throw error;
      }

      if (!requiresCredentialApproval) {
        await notifyAdminsAboutDoctorSignup({
          id: doctor.id,
          name: body.name,
          email: body.email,
          mobile: doctor.mobile,
          specialty,
          registrationNo: body.registrationNo || null,
          requiresCredentialApproval: false
        });
      }

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
          providerDomain: body.providerDomain,
          requiresCredentialApproval,
          emailVerificationSent: verification.sent
        }
      });

      res.status(201).json({
        doctor,
        approvalStatus: requiresCredentialApproval ? 'PROFILE_REQUIRED' : 'ACTIVE',
        emailVerificationRequired: true,
        emailVerificationSent: verification.sent,
        ...(verification.devVerifyUrl ? { devVerifyUrl: verification.devVerifyUrl } : {}),
        message: requiresCredentialApproval
          ? 'Account created. Verify your email, sign in, and complete your full profile. Admin approval is requested automatically only after the required profile fields are complete.'
          : 'Provider account created. Log in to complete your setup before appearing on Hope Hub.'
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

      const existingDoctor = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      if (!existingDoctor) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }

      await prisma.doctor.update({
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
        }
      });

      // Path selection is the provider's role decision. Keep the normalized role
      // assignments in sync immediately so readiness and service creation do not
      // disagree with the legacy mental-health profile fields on the next screen.
      await syncProviderRoleAssignments({
        doctorId: existingDoctor.id,
        roleCodes: [selection.careTeamType],
        primaryRoleCode: selection.careTeamType,
        actorId: req.user!.id
      });

      const updated = await prisma.doctor.findUniqueOrThrow({
        where: { id: existingDoctor.id },
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
          emailVerified: true,
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

  router.put(
    '/doctor/credential-document',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const provider = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: { providerDomain: true, credentialDocumentKey: true, approvalStatus: true }
      });
      if (!provider || provider.providerDomain !== ProviderDomain.HOMEOPATHY) {
        return res
          .status(400)
          .json({ message: 'Credentials are only required for homeopathy providers.' });
      }
      try {
        const form = await parseMultipartForm(req, { maxFileBytes: MAX_PROVIDER_CREDENTIAL_BYTES });
        if (!form.file) throw new Error('EMPTY_FILE');
        const saved = await saveProviderCredential({
          userId: req.user!.id,
          mimeType: form.file.mimeType,
          fileName: form.fields['fileName'] || form.file.fileName || 'credential',
          data: form.file.buffer
        });
        await prisma.doctor.update({
          where: { userId: req.user!.id },
          data: {
            credentialDocumentKey: saved.storageKey,
            credentialDocumentFileName: saved.fileName,
            credentialDocumentMimeType: saved.mimeType,
            credentialDocumentUploadedAt: new Date(),
            approvalStatus: 'DRAFT',
            approvalRequestedAt: null,
            approvedAt: null,
            approvedById: null,
            ...(provider.approvalStatus === 'APPROVED'
              ? {
                  suspendedAt: new Date(),
                  suspendedReason: `${HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX}.`,
                  showOnWebsite: false,
                  isAvailable: false,
                  isOnline: false
                }
              : {})
          }
        });
        if (provider.credentialDocumentKey && provider.credentialDocumentKey !== saved.storageKey) {
          await deleteProviderCredential(provider.credentialDocumentKey);
        }
        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'provider.credential.upload',
          targetType: 'doctor',
          targetId: req.user!.id,
          summary: 'Provider registration credential uploaded.',
          metadata: { fileName: saved.fileName, mimeType: saved.mimeType, byteSize: saved.byteSize }
        });
        const approvalSubmission = await submitHomeopathyProviderForApprovalIfReady(req.user!.id);
        res.json({
          message: 'Credential uploaded securely.',
          credential: { fileName: saved.fileName, mimeType: saved.mimeType },
          approvalSubmission
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        const message =
          code === 'UNSUPPORTED_MIME'
            ? 'Upload a PDF, JPEG, PNG, or WebP file.'
            : code === 'FILE_TOO_LARGE'
              ? 'Credential file must be 5 MB or smaller.'
              : code === 'EMPTY_FILE'
                ? 'Choose a credential file to upload.'
                : 'Could not save the credential document.';
        res
          .status(
            code === 'UNSUPPORTED_MIME' || code === 'FILE_TOO_LARGE' || code === 'EMPTY_FILE'
              ? 400
              : 500
          )
          .json({ message });
      }
    })
  );

  router.get(
    '/doctor/credential-document',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const provider = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: {
          credentialDocumentKey: true,
          credentialDocumentMimeType: true,
          credentialDocumentFileName: true
        }
      });
      if (!provider?.credentialDocumentKey)
        return res.status(404).json({ message: 'Credential not found.' });
      const data = await readProviderCredential(provider.credentialDocumentKey);
      res.setHeader(
        'Content-Type',
        provider.credentialDocumentMimeType || 'application/octet-stream'
      );
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${(provider.credentialDocumentFileName || 'credential').replace(/["\r\n]/g, '')}"`
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(data);
    })
  );

  router.get(
    '/doctor/readiness',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const approvalSubmission = await submitHomeopathyProviderForApprovalIfReady(req.user!.id);
      const readiness = await providerPublicReadiness(req.user!.id);
      res.json({ readiness, approvalSubmission });
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
      const review = listenerScreeningReviewDetails(questions, body.answers);
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
          review: review as Prisma.InputJsonValue,
          cooldownExpiresAt: result.passed
            ? null
            : new Date(Date.now() + LISTENER_SCREENING_COOLDOWN_HOURS * 60 * 60 * 1000),
          source: 'doctor-web',
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null
        }
      });

      const approvalSubmission = await submitHomeopathyProviderForApprovalIfReady(req.user!.id);
      const readiness = await providerPublicReadiness(req.user!.id);
      await prisma.doctor.update({
        where: { userId: req.user!.id },
        data: { showOnWebsite: readiness.ready }
      });
      res.status(201).json({ result: { ...result, review }, readiness, approvalSubmission });
    })
  );

  router.get(
    '/doctor/pricing-history',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      if (!doctor) return res.status(404).json({ message: 'Provider profile not found.' });
      const history = await prisma.auditLog.findMany({
        where: {
          targetType: 'doctor-pricing',
          targetId: doctor.id,
          action: {
            in: [
              'provider.pricing_update',
              'provider.pricing_approved',
              'provider.pricing_rejected'
            ]
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          summary: true,
          metadata: true,
          createdAt: true,
          actor: { select: { id: true, name: true, role: true } }
        }
      });
      res.json({ history });
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
          providerDomain: true,
          approvalStatus: true,
          registrationNoNormalized: true,
          mentalHealthProfile: {
            select: { careTeamType: true, careTeamTypes: true, services: true }
          }
        }
      });

      if (body.defaultMethodOptionId) {
        const method = await assertMethodOptionId(body.defaultMethodOptionId);
        if (!method) return res.status(400).json({ message: 'Invalid prescribing approach.' });
      }
      if (
        body.registrationNo !== undefined &&
        (await registrationNumberBelongsToAnotherProvider(req.user!.id, body.registrationNo))
      ) {
        return res.status(409).json({
          code: 'REGISTRATION_NUMBER_IN_USE',
          message: 'This professional registration number is already connected to an account.'
        });
      }

      const userData: Record<string, unknown> = {};
      const doctorData: Record<string, unknown> = {};
      const mentalData: Record<string, unknown> = {};
      // Prisma uses different nested relation inputs for an upsert's create and
      // update branches. Keep the service rows separately so that `deleteMany`
      // is never sent to the create branch (where it is invalid).
      let servicesForMentalProfileCreate:
        Prisma.CareTeamServiceUncheckedCreateWithoutMentalHealthProfileInput[] | null = null;

      if (body.step === 'identity') {
        if (body.name !== undefined) userData.name = body.name;
        if (body.gender !== undefined) userData.gender = body.gender;
        if (body.mobile !== undefined) userData.mobile = body.mobile || null;
        if (body.isAvailable !== undefined) doctorData.isAvailable = body.isAvailable;
      }

      // Accept professional fields on identity for older clients while new clients
      // use the dedicated credentials step.
      if (body.step === 'identity' || body.step === 'credentials') {
        if (body.specialty !== undefined) doctorData.specialty = body.specialty;
        if (body.registrationNo !== undefined) {
          doctorData.registrationNo = body.registrationNo || null;
          doctorData.registrationNoNormalized = normalizeProfessionalRegistrationNumber(
            body.registrationNo
          );
          if (
            existing.providerDomain === ProviderDomain.HOMEOPATHY &&
            existing.approvalStatus === 'APPROVED' &&
            doctorData.registrationNoNormalized !== existing.registrationNoNormalized
          ) {
            Object.assign(doctorData, {
              approvalStatus: 'DRAFT',
              approvalRequestedAt: null,
              approvedAt: null,
              approvedById: null,
              suspendedAt: new Date(),
              suspendedReason: HOMEOPATHY_PROFILE_DRAFT_REASON,
              showOnWebsite: false,
              isAvailable: false,
              isOnline: false
            });
          }
        }
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
          doctorData.registrationNoNormalized = normalizeProfessionalRegistrationNumber(
            body.registrationNo
          );
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
          const approvalPolicy = await providerPricingApprovalPolicy();
          const existingServicesById = new Map(
            (existing.mentalHealthProfile?.services ?? []).map((service) => [service.id, service])
          );
          const unknownServiceId = mental.services.find(
            (service) => service.id && !existingServicesById.has(service.id)
          )?.id;
          if (unknownServiceId) {
            return res
              .status(400)
              .json({ message: 'One of the selected services is not available.' });
          }
          const services = mental.services.map((service, index) => {
            const normalizedIsFree =
              service.pricingMode === CareTeamServicePricingMode.FREE_VOLUNTEER
                ? true
                : service.pricingMode === CareTeamServicePricingMode.PER_MINUTE
                  ? false
                  : (service.isFree ?? (service.priceInPaise ?? 0) === 0);
            const normalizedPriceInPaise =
              normalizedIsFree && service.pricingMode !== CareTeamServicePricingMode.PER_MINUTE
                ? 0
                : (service.priceInPaise ?? 0);
            const approvalReason = providerPricingApprovalReason(
              { ...service, priceInPaise: normalizedPriceInPaise, isFree: normalizedIsFree },
              approvalPolicy
            );
            const existingService = service.id ? existingServicesById.get(service.id) : null;
            const pricingUnchanged =
              existingService &&
              providerPricingFingerprint(existingService as unknown as Record<string, unknown>) ===
                providerPricingFingerprint({
                  ...service,
                  priceInPaise: normalizedPriceInPaise,
                  isFree: normalizedIsFree
                });
            const approvalStatus = !approvalReason
              ? 'APPROVED'
              : pricingUnchanged && existingService?.approvalStatus === 'APPROVED'
                ? 'APPROVED'
                : pricingUnchanged && existingService?.approvalStatus === 'REJECTED'
                  ? 'REJECTED'
                  : 'PENDING';
            return {
              ...(service.id ? { id: service.id } : {}),
              providerRole:
                service.providerRole && serviceProviderRoles.includes(service.providerRole)
                  ? service.providerRole
                  : servicePrimary,
              providerRoleCode: service.providerRoleCode || service.providerRole || servicePrimary,
              title: service.title,
              description: service.description || null,
              pricingMode: service.pricingMode ?? CareTeamServicePricingMode.FIXED,
              priceInPaise: normalizedPriceInPaise,
              firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
              offerEndsAt: service.offerEndsAt ?? null,
              offerBookingLimit: service.offerBookingLimit ?? null,
              pauseOfferWhenNoSlots: service.pauseOfferWhenNoSlots ?? false,
              approvalStatus,
              approvalReason:
                approvalStatus === 'REJECTED'
                  ? existingService?.approvalReason || approvalReason
                  : approvalReason || null,
              approvalRequestedAt:
                approvalStatus === 'PENDING'
                  ? new Date()
                  : (existingService?.approvalRequestedAt ?? null),
              approvedAt:
                approvalStatus === 'APPROVED' ? (existingService?.approvedAt ?? new Date()) : null,
              approvedById:
                approvalStatus === 'APPROVED' ? (existingService?.approvedById ?? null) : null,
              followUpPriceInPaise: service.followUpPriceInPaise ?? null,
              followUpSessionLimit: service.followUpSessionLimit ?? null,
              introSessionLimit: service.introSessionLimit ?? 1,
              packageSessionCount: service.packageSessionCount ?? null,
              packagePriceInPaise: service.packagePriceInPaise ?? null,
              freeMinutes: service.freeMinutes ?? 0,
              pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
              currency: service.currency || 'INR',
              durationMinutes: service.durationMinutes ?? 30,
              isFree: normalizedIsFree,
              isActive: service.isActive ?? true,
              sortOrder: service.sortOrder ?? index
            };
          });
          servicesForMentalProfileCreate = services;
          const existingServiceUpdates = services.filter(
            (service): service is typeof service & { id: string } => Boolean(service.id)
          );
          const newServices = services.filter((service) => !service.id);
          mentalData.services = {
            deleteMany: {
              id: { notIn: existingServiceUpdates.map((service) => service.id) }
            },
            ...(existingServiceUpdates.length
              ? {
                  upsert: existingServiceUpdates.map(({ id, ...data }) => ({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                  }))
                }
              : {}),
            ...(newServices.length ? { create: newServices } : {})
          };
        }
      }

      const hasMentalData = Object.keys(mentalData).length > 0;
      if (hasMentalData && existing.doctorType !== HomeopathicDoctorType.PSYCHOLOGIST) {
        return res
          .status(400)
          .json({ message: 'Support profile fields are not available for this provider role.' });
      }

      const { services: _serviceUpdates, ...mentalDataForCreate } = mentalData;

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
                                ...mentalDataForCreate,
                                ...(servicesForMentalProfileCreate?.length
                                  ? { services: { create: servicesForMentalProfileCreate } }
                                  : {})
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

      const approvalSubmission = await submitHomeopathyProviderForApprovalIfReady(req.user!.id);
      const readiness = await providerPublicReadiness(req.user!.id);
      await prisma.doctor.update({
        where: { userId: req.user!.id },
        data: { showOnWebsite: readiness.ready }
      });
      if (body.step === 'services') {
        const currentServices = await prisma.careTeamService.findMany({
          where: { mentalHealthProfile: { doctorId: existing.id } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        });
        const beforePricing = pricingAuditSnapshot(
          (existing.mentalHealthProfile?.services ?? []) as Array<Record<string, any>>
        );
        const afterPricing = pricingAuditSnapshot(currentServices as Array<Record<string, any>>);
        if (JSON.stringify(beforePricing) !== JSON.stringify(afterPricing)) {
          await writeAuditLog({
            actorId: req.user!.id,
            actorRole: req.user!.role,
            action: 'provider.pricing_update',
            targetType: 'doctor-pricing',
            targetId: existing.id,
            summary: 'Provider pricing and service configuration updated.',
            metadata: { before: beforePricing, after: afterPricing }
          });
        }
      }
      res.json({ message: 'Profile step saved.', readiness, approvalSubmission });
    })
  );

  router.put(
    '/doctor/profile',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: providerDisplayNameSchema,
          gender: z.nativeEnum(PatientGender).optional().nullable(),
          mobile: indianMobileSchema.optional().or(z.literal('')),
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
      if (await registrationNumberBelongsToAnotherProvider(req.user!.id, body.registrationNo)) {
        return res.status(409).json({
          code: 'REGISTRATION_NUMBER_IN_USE',
          message: 'This professional registration number is already connected to an account.'
        });
      }

      const existing = await prisma.doctor.findUnique({
        where: { userId: req.user!.id },
        select: {
          doctorType: true,
          specialtyFocus: true,
          providerDomain: true,
          approvalStatus: true,
          registrationNoNormalized: true,
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
      const approvalResetFields =
        existing?.providerDomain === ProviderDomain.HOMEOPATHY &&
        existing.approvalStatus === 'APPROVED' &&
        profilePayload.registrationNoNormalized !== existing.registrationNoNormalized
          ? {
              approvalStatus: 'DRAFT' as const,
              approvalRequestedAt: null,
              approvedAt: null,
              approvedById: null,
              suspendedAt: new Date(),
              suspendedReason: HOMEOPATHY_PROFILE_DRAFT_REASON,
              showOnWebsite: false,
              isAvailable: false,
              isOnline: false
            }
          : {};

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
              offerEndsAt: service.offerEndsAt ?? null,
              offerBookingLimit: service.offerBookingLimit ?? null,
              pauseOfferWhenNoSlots: service.pauseOfferWhenNoSlots ?? false,
              followUpPriceInPaise: service.followUpPriceInPaise ?? null,
              followUpSessionLimit: service.followUpSessionLimit ?? null,
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
                registrationNoNormalized: profilePayload.registrationNoNormalized,
                isAvailable: profilePayload.isAvailable,
                ...approvalResetFields,
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

      const approvalSubmission = await submitHomeopathyProviderForApprovalIfReady(req.user!.id);
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
        ),
        approvalSubmission
      });
    })
  );
}
