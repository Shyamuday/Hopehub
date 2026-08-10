import { Router } from 'express';
import { z } from 'zod';
import {
  CareContributorServiceScope,
  CareContributorStatus,
  CareTeamMemberType,
  CareTeamServicePricingMode,
  CredentialVerificationStatus,
  EmployeeStatus,
  HomeopathicDoctorType,
  PatientGender,
  Prisma,
  Role
} from '@prisma/client';
import { prisma } from '../db.js';
import { notifyAdminsAboutProviderApplication } from '../services/provider-application-notifications.js';
import {
  publicListenerScreeningQuestionSet,
  sanitizeListenerScreeningQuestions,
  scoreListenerScreening
} from '../services/listener-screening-question-sets.js';
import { asyncRoute, hashToken, randomToken, writeAuditLog } from '../utils/helpers.js';

export const counsellorApplicationsRouter = Router();

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const optionalDate = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.coerce.date().optional()
);
const LISTENER_GUIDELINES_VERSION = 'listener-guidelines-v1-2026-08-07';
const LISTENER_TRAINING_VERSION = 'listener-training-v1-2026-08-07';
const MINIMUM_LISTENER_GUIDELINES_READ_SECONDS = 5;
const MAX_FAILED_LISTENER_SCREENING_ATTEMPTS = 3;
const LISTENER_SCREENING_COOLDOWN_HOURS = 24;
const AUTO_APPROVED_LISTENER_CHAT_VOICE_PRICE_IN_PAISE = 9900;
const AUTO_APPROVED_LISTENER_VIDEO_PRICE_IN_PAISE = 29900;
const AUTO_APPROVED_LISTENER_DURATION_MINUTES = 30;

const listenerScreeningAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(80),
  optionId: z.string().trim().min(1).max(80)
});

const listenerGuidelineReadSessionSchema = z.object({
  applicationTrack: z.enum(['PSYCHOLOGY_STUDENT_VOLUNTEER', 'PEER_SUPPORT_VOLUNTEER']),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  listenerGuidelinesVersion: z.string().trim().max(120).optional().or(z.literal(''))
});

export const counsellorApplicationSchema = z
  .object({
    applicationTrack: z.enum([
      'PROFESSIONAL_PSYCHOLOGIST',
      'PSYCHOLOGY_STUDENT_VOLUNTEER',
      'PEER_SUPPORT_VOLUNTEER'
    ]),
    careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(5).max(30),
    gender: z.nativeEnum(PatientGender).optional().nullable(),
    city: z.string().trim().min(2).max(120),
    qualification: optionalText(180),
    qualifiedFrom: optionalText(240),
    specialization: optionalText(160),
    experienceYears: optionalText(80),
    registrationDetails: optionalText(180),
    languages: z.string().trim().min(2).max(180),
    availability: z.string().trim().min(2).max(180),
    preferredChannel: z.enum(['email', 'phone', 'whatsapp', 'telegram']),
    resumeLink: optionalText(500),
    portfolioLink: optionalText(500),
    supervisionDetails: optionalText(3000),
    livedExperienceSummary: optionalText(3000),
    agreesToNonClinicalRole: z.boolean().optional().default(false),
    listenerScreeningAnswers: z.array(listenerScreeningAnswerSchema).optional().default([]),
    listenerScreeningQuestionSetId: z.string().trim().max(120).optional().or(z.literal('')),
    listenerScreeningQuestionSetVersion: z.string().trim().max(120).optional().or(z.literal('')),
    listenerGuidelinesAccepted: z.boolean().optional().default(false),
    listenerGuidelinesVersion: z.string().trim().max(120).optional().or(z.literal('')),
    listenerGuidelinesReadSessionToken: z
      .string()
      .trim()
      .min(20)
      .max(200)
      .optional()
      .or(z.literal('')),
    listenerGuidelinesReadStartedAt: optionalDate,
    listenerGuidelinesReadSeconds: z.coerce.number().int().min(0).max(86400).optional().default(0),
    listenerTrainingCompleted: z.boolean().optional().default(false),
    listenerTrainingVersion: z.string().trim().max(120).optional().or(z.literal('')),
    whyJoin: z.string().trim().min(40).max(3000),
    entryPage: z.string().trim().max(500).optional().or(z.literal(''))
  })
  .superRefine((body, ctx) => {
    const requireText = (value: string | undefined, path: string, message: string) => {
      if (!value?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };

    if (body.applicationTrack === 'PROFESSIONAL_PSYCHOLOGIST') {
      requireText(
        body.qualification,
        'qualification',
        'Qualification is required for professional care team applications.'
      );
      requireText(
        body.specialization,
        'specialization',
        'Specialization is required for professional care team applications.'
      );
      requireText(
        body.experienceYears,
        'experienceYears',
        'Experience is required for professional care team applications.'
      );
      if (
        (body.careTeamType || CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL) ===
        CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL
      ) {
        requireText(
          body.registrationDetails,
          'registrationDetails',
          'Registration or license details are required for mental wellness professionals.'
        );
      }
      requireText(body.resumeLink, 'resumeLink', 'A resume or profile link is required.');
    }

    if (body.applicationTrack === 'PSYCHOLOGY_STUDENT_VOLUNTEER') {
      requireText(
        body.qualification,
        'qualification',
        'Current course or qualification is required.'
      );
      requireText(body.specialization, 'specialization', 'Area of interest is required.');
      requireText(
        body.supervisionDetails,
        'supervisionDetails',
        'Supervisor or faculty details are required.'
      );
      if (!body.agreesToNonClinicalRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agreesToNonClinicalRole'],
          message: 'Psychology student listeners must agree to the supervised, non-clinical role.'
        });
      }
      if (!body.listenerScreeningAnswers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['listenerScreeningAnswers'],
          message: 'Complete the listener screening test before submitting.'
        });
      }
    }

    if (body.applicationTrack === 'PEER_SUPPORT_VOLUNTEER') {
      requireText(
        body.livedExperienceSummary,
        'livedExperienceSummary',
        'Please share your relevant support experience without private medical details.'
      );
      if (!body.agreesToNonClinicalRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agreesToNonClinicalRole'],
          message: 'Peer listeners must agree to the non-clinical role.'
        });
      }
      if (!body.listenerScreeningAnswers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['listenerScreeningAnswers'],
          message: 'Complete the listener screening test before submitting.'
        });
      }
    }
  });

function isListenerTrack(track: string) {
  return track === 'PSYCHOLOGY_STUDENT_VOLUNTEER' || track === 'PEER_SUPPORT_VOLUNTEER';
}

function listenerAttemptCooldownStart(now = new Date()) {
  return new Date(now.getTime() - LISTENER_SCREENING_COOLDOWN_HOURS * 60 * 60 * 1000);
}

function splitList(value: string | null | undefined) {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function listenerTitle(type: CareTeamMemberType) {
  if (type === CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER) {
    return 'Psychology student emotional support listener';
  }
  return 'Peer emotional support listener';
}

function listenerScope(track: string) {
  return track === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
    ? CareContributorServiceScope.SUPERVISED_STUDENT_SUPPORT
    : CareContributorServiceScope.NON_CLINICAL_PEER_SUPPORT;
}

async function autoApproveListenerApplication(
  tx: Prisma.TransactionClient,
  application: {
    id: string;
    applicationTrack: 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';
    careTeamType: CareTeamMemberType;
    fullName: string;
    email: string;
    phone: string;
    gender: PatientGender | null;
    city: string;
    qualification: string | null;
    qualifiedFrom: string | null;
    specialization: string | null;
    languages: string;
    availability: string;
    supervisionDetails: string | null;
    whyJoin: string;
  }
) {
  const now = new Date();
  const existingUser = await tx.user.findFirst({
    where: { email: application.email, role: Role.DOCTOR },
    select: { id: true, role: true }
  });
  const user =
    existingUser?.role === Role.DOCTOR
      ? existingUser
      : await tx.user.create({
          data: {
            name: application.fullName,
            email: null,
            mobile: application.phone,
            gender: application.gender,
            city: application.city,
            role: Role.DOCTOR,
            isActive: true,
            preferredLanguage: splitList(application.languages)[0] || null
          },
          select: { id: true, role: true }
        });

  const title = listenerTitle(application.careTeamType);
  const focusAreas = [
    application.specialization || 'Emotional support',
    application.applicationTrack === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
      ? 'Supervised listening'
      : 'Peer support',
    'Non-clinical support'
  ];
  const doctor = await tx.doctor.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      doctorType: HomeopathicDoctorType.PSYCHOLOGIST,
      specialty: title,
      designation: title,
      department: 'Hope Hub Emotional Support',
      isAvailable: true,
      employeeStatus: EmployeeStatus.ACTIVE,
      bio: application.whyJoin.slice(0, 1200),
      showOnWebsite: false,
      yearsOfExperience: 0,
      focusAreas
    },
    update: {
      doctorType: HomeopathicDoctorType.PSYCHOLOGIST,
      specialty: title,
      designation: title,
      department: 'Hope Hub Emotional Support',
      isAvailable: true,
      employeeStatus: EmployeeStatus.ACTIVE,
      bio: application.whyJoin.slice(0, 1200),
      showOnWebsite: false,
      focusAreas
    },
    select: { id: true, userId: true }
  });

  const mentalHealthProfile = await tx.mentalHealthProviderProfile.upsert({
    where: { doctorId: doctor.id },
    create: {
      doctorId: doctor.id,
      careTeamType: application.careTeamType,
      careTeamTypes: [application.careTeamType],
      qualifications: splitList(application.qualification),
      qualifiedFrom: application.qualifiedFrom,
      languages: splitList(application.languages),
      modalities: ['Active listening', 'Emotional support', 'Grounding support'],
      sessionTypes: ['live_chat'],
      ageGroups: ['18+'],
      concernsHandled: [
        application.specialization || 'General emotional support',
        'Stress',
        'Relationship concerns',
        'Loneliness'
      ],
      counsellingApproach:
        'Non-clinical emotional support listener. Provides active listening, validation, grounding, and escalation to professional/crisis support when needed.',
      safetyEscalationNote:
        'Does not diagnose, prescribe, or manage crisis independently. High-risk concerns must be escalated to Hope Hub professional/admin support.',
      acceptsHighRiskCases: false,
      autoMatchEnabled: true,
      acceptingNewUsers: true,
      maxSessionsPerDay: 6,
      maxSessionsPerWeek: 25
    },
    update: {
      careTeamType: application.careTeamType,
      careTeamTypes: [application.careTeamType],
      qualifications: splitList(application.qualification),
      qualifiedFrom: application.qualifiedFrom,
      languages: splitList(application.languages),
      modalities: ['Active listening', 'Emotional support', 'Grounding support'],
      sessionTypes: ['live_chat'],
      ageGroups: ['18+'],
      concernsHandled: [
        application.specialization || 'General emotional support',
        'Stress',
        'Relationship concerns',
        'Loneliness'
      ],
      counsellingApproach:
        'Non-clinical emotional support listener. Provides active listening, validation, grounding, and escalation to professional/crisis support when needed.',
      safetyEscalationNote:
        'Does not diagnose, prescribe, or manage crisis independently. High-risk concerns must be escalated to Hope Hub professional/admin support.',
      acceptsHighRiskCases: false,
      autoMatchEnabled: true,
      acceptingNewUsers: true,
      maxSessionsPerDay: 6,
      maxSessionsPerWeek: 25
    },
    select: { id: true }
  });

  const listenerServices = [
    {
      title: 'Chat listener support session',
      description: 'A 30-minute non-clinical emotional support listening chat session.',
      priceInPaise: AUTO_APPROVED_LISTENER_CHAT_VOICE_PRICE_IN_PAISE,
      sortOrder: 0
    },
    {
      title: 'Voice listener support session',
      description: 'A 30-minute non-clinical emotional support listening voice session.',
      priceInPaise: AUTO_APPROVED_LISTENER_CHAT_VOICE_PRICE_IN_PAISE,
      sortOrder: 1
    },
    {
      title: 'Video listener support session',
      description: 'A 30-minute non-clinical emotional support listening video session.',
      priceInPaise: AUTO_APPROVED_LISTENER_VIDEO_PRICE_IN_PAISE,
      sortOrder: 2
    }
  ];
  await tx.careTeamService.updateMany({
    where: {
      mentalHealthProfileId: mentalHealthProfile.id,
      title: 'Listener support session'
    },
    data: { isActive: false }
  });
  for (const service of listenerServices) {
    const existingService = await tx.careTeamService.findFirst({
      where: {
        mentalHealthProfileId: mentalHealthProfile.id,
        title: service.title
      },
      select: { id: true }
    });
    const payload = {
      title: service.title,
      description: service.description,
      pricingMode: CareTeamServicePricingMode.FIXED,
      priceInPaise: service.priceInPaise,
      durationMinutes: AUTO_APPROVED_LISTENER_DURATION_MINUTES,
      isFree: false,
      isActive: true,
      sortOrder: service.sortOrder
    };
    if (existingService) {
      await tx.careTeamService.update({ where: { id: existingService.id }, data: payload });
    } else {
      await tx.careTeamService.create({
        data: {
          mentalHealthProfileId: mentalHealthProfile.id,
          ...payload
        }
      });
    }
  }

  await tx.careContributor.create({
    data: {
      applicationId: application.id,
      applicationTrack: application.applicationTrack,
      careTeamType: application.careTeamType,
      serviceScope: listenerScope(application.applicationTrack),
      status: CareContributorStatus.ACTIVE,
      credentialVerificationStatus: CredentialVerificationStatus.NOT_REQUIRED,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      gender: application.gender,
      city: application.city,
      qualification: application.qualification,
      qualifiedFrom: application.qualifiedFrom,
      specialization: application.specialization,
      languages: application.languages,
      availability: application.availability,
      supervisionDetails: application.supervisionDetails,
      nonClinicalAgreementAccepted: true,
      orientationCompletedAt: now,
      activatedAt: now,
      platformAccountLinkedAt: now,
      onboardingNote:
        'Auto-approved after passing the listener screening test. Non-clinical listener scope only. Default plans: chat/voice ₹99 for 30 minutes, video ₹299 for 30 minutes.'
    }
  });

  return { doctorUserId: doctor.userId };
}

counsellorApplicationsRouter.get(
  '/counsellor-applications/listener-screening',
  asyncRoute(async (_req, res) => {
    const questionSet = await prisma.listenerScreeningQuestionSet.findFirst({
      where: { isActive: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
    });
    if (!questionSet) {
      return res.status(503).json({
        message: 'Listener screening test is not available right now. Please try again later.'
      });
    }

    res.json({ questionSet: publicListenerScreeningQuestionSet(questionSet) });
  })
);

counsellorApplicationsRouter.post(
  '/counsellor-applications/listener-guidelines/read-session',
  asyncRoute(async (req, res) => {
    const body = listenerGuidelineReadSessionSchema.parse(req.body);
    const token = randomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const session = await prisma.listenerGuidelineReadSession.create({
      data: {
        tokenHash: hashToken(token),
        applicationTrack: body.applicationTrack,
        email: body.email,
        phone: body.phone,
        guidelinesVersion: body.listenerGuidelinesVersion || LISTENER_GUIDELINES_VERSION,
        minReadSeconds: MINIMUM_LISTENER_GUIDELINES_READ_SECONDS,
        startedAt: now,
        expiresAt
      },
      select: {
        id: true,
        startedAt: true,
        expiresAt: true,
        minReadSeconds: true,
        guidelinesVersion: true
      }
    });

    res.status(201).json({
      token,
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      minReadSeconds: session.minReadSeconds,
      guidelinesVersion: session.guidelinesVersion
    });
  })
);

counsellorApplicationsRouter.post(
  '/counsellor-applications',
  asyncRoute(async (req, res) => {
    const body = counsellorApplicationSchema.parse(req.body);
    const isListenerApplication = isListenerTrack(body.applicationTrack);
    if (isListenerApplication) {
      const cooldownStart = listenerAttemptCooldownStart();
      const recentFailedAttempts = await prisma.listenerScreeningAttempt.count({
        where: {
          createdAt: { gte: cooldownStart },
          passed: false,
          OR: [{ email: { equals: body.email, mode: 'insensitive' } }, { phone: body.phone }]
        }
      });

      if (recentFailedAttempts >= MAX_FAILED_LISTENER_SCREENING_ATTEMPTS) {
        await writeAuditLog({
          action: 'LISTENER_SCREENING_ATTEMPT_LOCKED',
          targetType: 'CounsellorApplication',
          targetId: body.email,
          summary: `Blocked listener screening retry for ${body.email} after ${recentFailedAttempts} failed attempts.`,
          metadata: {
            email: body.email,
            phone: body.phone,
            track: body.applicationTrack,
            recentFailedAttempts,
            cooldownHours: LISTENER_SCREENING_COOLDOWN_HOURS
          }
        });
        return res.status(429).json({
          message:
            'Too many unsuccessful listener screening attempts. Please wait 24 hours before trying again, or submit through manual review with the Hope Hub team.'
        });
      }
    }

    const listenerQuestionSet = isListenerApplication
      ? await prisma.listenerScreeningQuestionSet.findFirst({
          where: body.listenerScreeningQuestionSetId
            ? { id: body.listenerScreeningQuestionSetId, isActive: true }
            : { isActive: true },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
        })
      : null;
    if (isListenerApplication && !listenerQuestionSet) {
      return res.status(503).json({
        message: 'Listener screening test is not available right now. Please try again later.'
      });
    }
    if (
      isListenerApplication &&
      body.listenerScreeningQuestionSetVersion &&
      listenerQuestionSet?.version !== body.listenerScreeningQuestionSetVersion
    ) {
      return res.status(409).json({
        message:
          'Listener screening test changed. Please refresh the page and answer the latest test.'
      });
    }
    const listenerQuestions = listenerQuestionSet
      ? sanitizeListenerScreeningQuestions(listenerQuestionSet.questions)
      : [];
    if (isListenerApplication) {
      const expectedQuestionIds = new Set(listenerQuestions.map((question) => question.id));
      const answeredQuestionIds = new Set(
        body.listenerScreeningAnswers.map((answer) => answer.questionId)
      );
      if (
        body.listenerScreeningAnswers.length !== listenerQuestions.length ||
        answeredQuestionIds.size !== expectedQuestionIds.size ||
        [...expectedQuestionIds].some((questionId) => !answeredQuestionIds.has(questionId))
      ) {
        return res.status(400).json({
          message: 'Complete the latest listener screening test before submitting.'
        });
      }
    }

    const listenerScreening = isListenerApplication
      ? scoreListenerScreening(
          listenerQuestions,
          body.listenerScreeningAnswers,
          listenerQuestionSet?.passScore ?? 6
        )
      : null;
    const shouldAutoApprove = Boolean(listenerScreening?.passed);
    const listenerGuidelinesReadSeconds = Math.floor(body.listenerGuidelinesReadSeconds ?? 0);
    const listenerGuidelinesReadSessionToken = body.listenerGuidelinesReadSessionToken || '';
    const listenerGuidelinesReadSession = listenerGuidelinesReadSessionToken
      ? await prisma.listenerGuidelineReadSession.findUnique({
          where: { tokenHash: hashToken(listenerGuidelinesReadSessionToken) }
        })
      : null;
    const listenerGuidelinesReadStartedAt = listenerGuidelinesReadSession?.startedAt ?? null;
    const listenerGuidelinesServerElapsedSeconds = listenerGuidelinesReadSession
      ? Math.floor((Date.now() - listenerGuidelinesReadSession.startedAt.getTime()) / 1000)
      : 0;
    const listenerGuidelinesReadTimeSatisfied =
      listenerGuidelinesReadSeconds >= MINIMUM_LISTENER_GUIDELINES_READ_SECONDS &&
      listenerGuidelinesServerElapsedSeconds >= MINIMUM_LISTENER_GUIDELINES_READ_SECONDS;

    if (shouldAutoApprove) {
      if (!body.listenerGuidelinesAccepted) {
        return res.status(400).json({
          message: 'Read and accept the listener guidelines before auto-approval.'
        });
      }
      if (!listenerGuidelinesReadSession) {
        return res.status(400).json({
          message: 'Start the listener guideline reading session before auto-approval.'
        });
      }
      if (listenerGuidelinesReadSession.usedAt) {
        return res.status(400).json({
          message: 'This listener guideline reading session was already used. Please read again.'
        });
      }
      if (listenerGuidelinesReadSession.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({
          message: 'Your listener guideline reading session expired. Please read again.'
        });
      }
      if (
        listenerGuidelinesReadSession.email.toLowerCase() !== body.email.toLowerCase() ||
        listenerGuidelinesReadSession.phone !== body.phone ||
        listenerGuidelinesReadSession.applicationTrack !== body.applicationTrack
      ) {
        return res.status(400).json({
          message: 'Guideline reading session does not match this listener application.'
        });
      }
      if (!listenerGuidelinesReadTimeSatisfied) {
        return res.status(400).json({
          message:
            'Please spend at least 5 seconds reading the listener guidelines before auto-approval.'
        });
      }
      if (!body.listenerTrainingCompleted) {
        return res.status(400).json({
          message: 'Complete listener training before auto-approval.'
        });
      }
    }

    const application = await prisma.$transaction(async (tx) => {
      const hasAcceptedListenerGuidelines =
        isListenerApplication && Boolean(body.listenerGuidelinesAccepted);
      const hasCompletedListenerTraining =
        isListenerApplication && Boolean(body.listenerTrainingCompleted);
      const created = await tx.counsellorApplication.create({
        data: {
          applicationTrack: body.applicationTrack,
          careTeamType: body.careTeamType || CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
          status: shouldAutoApprove ? 'ONBOARDED' : 'NEW',
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          gender: body.gender ?? null,
          city: body.city,
          qualification: body.qualification || null,
          qualifiedFrom: body.qualifiedFrom || null,
          specialization: body.specialization || null,
          experienceYears: body.experienceYears || null,
          registrationDetails: body.registrationDetails || null,
          languages: body.languages,
          availability: body.availability,
          preferredChannel: body.preferredChannel,
          resumeLink: body.resumeLink || null,
          portfolioLink: body.portfolioLink || null,
          supervisionDetails: body.supervisionDetails || null,
          livedExperienceSummary: body.livedExperienceSummary || null,
          agreesToNonClinicalRole: body.agreesToNonClinicalRole,
          listenerScreeningAnswers: isListenerApplication
            ? body.listenerScreeningAnswers
            : undefined,
          listenerScreeningQuestionSetId: listenerQuestionSet?.id ?? null,
          listenerScreeningQuestionSetVersion: listenerQuestionSet?.version ?? null,
          listenerScreeningScore: listenerScreening?.score,
          listenerScreeningMaxScore: listenerScreening?.maxScore,
          listenerScreeningPassed: listenerScreening?.passed ?? false,
          listenerScreeningCompletedAt: listenerScreening ? new Date() : null,
          listenerGuidelinesAccepted: hasAcceptedListenerGuidelines
            ? Boolean(body.listenerGuidelinesAccepted)
            : false,
          listenerGuidelinesVersion: hasAcceptedListenerGuidelines
            ? body.listenerGuidelinesVersion || LISTENER_GUIDELINES_VERSION
            : null,
          listenerGuidelinesReadStartedAt: hasAcceptedListenerGuidelines
            ? listenerGuidelinesReadStartedAt
            : null,
          listenerGuidelinesReadSeconds: hasAcceptedListenerGuidelines
            ? listenerGuidelinesReadSeconds
            : null,
          listenerGuidelinesAcceptedAt: hasAcceptedListenerGuidelines ? new Date() : null,
          listenerTrainingCompleted: hasCompletedListenerTraining,
          listenerTrainingVersion: hasCompletedListenerTraining
            ? body.listenerTrainingVersion || LISTENER_TRAINING_VERSION
            : null,
          listenerTrainingCompletedAt: hasCompletedListenerTraining ? new Date() : null,
          autoApprovedAt: shouldAutoApprove ? new Date() : null,
          whyJoin: body.whyJoin,
          entryPage: body.entryPage || req.get('referer') || null,
          adminNote:
            listenerScreening && !listenerScreening.passed
              ? `Listener screening score ${listenerScreening.score}/${listenerScreening.maxScore}; manual review/orientation required.`
              : shouldAutoApprove
                ? `Auto-approved listener screening score ${listenerScreening?.score}/${listenerScreening?.maxScore}.`
                : null
        }
      });

      if (isListenerApplication && listenerScreening) {
        await tx.listenerScreeningAttempt.create({
          data: {
            applicationId: created.id,
            questionSetId: listenerQuestionSet?.id ?? null,
            questionSetVersion: listenerQuestionSet?.version ?? null,
            applicationTrack: created.applicationTrack,
            email: created.email,
            phone: created.phone,
            score: listenerScreening.score,
            maxScore: listenerScreening.maxScore,
            passed: listenerScreening.passed,
            guidelinesAccepted: hasAcceptedListenerGuidelines,
            guidelinesVersion: hasAcceptedListenerGuidelines
              ? body.listenerGuidelinesVersion || LISTENER_GUIDELINES_VERSION
              : null,
            guidelinesReadSessionId: listenerGuidelinesReadSession?.id ?? null,
            guidelinesReadSeconds: hasAcceptedListenerGuidelines
              ? listenerGuidelinesReadSeconds
              : null,
            trainingCompleted: hasCompletedListenerTraining,
            trainingVersion: hasCompletedListenerTraining
              ? body.listenerTrainingVersion || LISTENER_TRAINING_VERSION
              : null,
            cooldownExpiresAt: listenerScreening.passed
              ? null
              : new Date(Date.now() + LISTENER_SCREENING_COOLDOWN_HOURS * 60 * 60 * 1000),
            source: body.entryPage ? 'healing-web' : 'healing-web',
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null
          }
        });
      }

      if (listenerGuidelinesReadSession && hasAcceptedListenerGuidelines) {
        await tx.listenerGuidelineReadSession.update({
          where: { id: listenerGuidelinesReadSession.id },
          data: {
            completedAt: new Date(),
            usedAt: new Date()
          }
        });
      }

      if (shouldAutoApprove && isListenerTrack(created.applicationTrack)) {
        const autoApproval = await autoApproveListenerApplication(tx, {
          id: created.id,
          applicationTrack: created.applicationTrack,
          careTeamType: created.careTeamType,
          fullName: created.fullName,
          email: created.email,
          phone: created.phone,
          gender: created.gender,
          city: created.city,
          qualification: created.qualification,
          qualifiedFrom: created.qualifiedFrom,
          specialization: created.specialization,
          languages: created.languages,
          availability: created.availability,
          supervisionDetails: created.supervisionDetails,
          whyJoin: created.whyJoin
        });
        return tx.counsellorApplication.update({
          where: { id: created.id },
          data: { autoApprovedDoctorUserId: autoApproval.doctorUserId }
        });
      }
      return created;
    });

    if (!shouldAutoApprove) {
      await notifyAdminsAboutProviderApplication(application);
    }

    await writeAuditLog({
      action: shouldAutoApprove
        ? 'LISTENER_APPLICATION_AUTO_APPROVED'
        : isListenerApplication
          ? 'LISTENER_APPLICATION_SUBMITTED_FOR_REVIEW'
          : 'COUNSELLOR_APPLICATION_SUBMITTED',
      targetType: 'CounsellorApplication',
      targetId: application.id,
      summary: shouldAutoApprove
        ? `Auto-approved listener ${application.fullName} after screening.`
        : isListenerApplication
          ? `Listener ${application.fullName} submitted for manual review.`
          : `Care contributor ${application.fullName} submitted an application.`,
      metadata: {
        track: application.applicationTrack,
        careTeamType: application.careTeamType,
        status: application.status,
        screeningScore: listenerScreening?.score ?? null,
        screeningMaxScore: listenerScreening?.maxScore ?? null,
        screeningPassed: listenerScreening?.passed ?? null,
        screeningQuestionSetId: application.listenerScreeningQuestionSetId,
        screeningQuestionSetVersion: application.listenerScreeningQuestionSetVersion,
        guidelinesAccepted: application.listenerGuidelinesAccepted,
        guidelinesVersion: application.listenerGuidelinesVersion,
        guidelinesReadSeconds: application.listenerGuidelinesReadSeconds,
        guidelinesReadSessionId: listenerGuidelinesReadSession?.id ?? null,
        trainingCompleted: application.listenerTrainingCompleted,
        trainingVersion: application.listenerTrainingVersion,
        autoApprovedAt: application.autoApprovedAt?.toISOString() ?? null,
        autoApprovedDoctorUserId: application.autoApprovedDoctorUserId
      }
    });

    res.status(201).json({
      applicationId: application.id,
      success: true,
      autoApproved: shouldAutoApprove,
      screeningScore: listenerScreening?.score ?? null,
      screeningMaxScore: listenerScreening?.maxScore ?? null,
      screeningQuestionSetVersion: application.listenerScreeningQuestionSetVersion
    });
  })
);
