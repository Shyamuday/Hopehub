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
import { asyncRoute } from '../utils/helpers.js';

export const counsellorApplicationsRouter = Router();

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const LISTENER_SCREENING_PASS_SCORE = 16;
const LISTENER_GUIDELINES_VERSION = 'listener-guidelines-v1-2026-08-07';
const AUTO_APPROVED_LISTENER_CHAT_VOICE_PRICE_IN_PAISE = 9900;
const AUTO_APPROVED_LISTENER_VIDEO_PRICE_IN_PAISE = 29900;
const AUTO_APPROVED_LISTENER_DURATION_MINUTES = 30;

const listenerScreeningQuestions = [
  { id: 'boundaries-role', correctOptionId: 'listen-and-boundary' },
  { id: 'crisis-self-harm', correctOptionId: 'escalate-immediately' },
  { id: 'confidentiality-risk', correctOptionId: 'explain-limits' },
  { id: 'diagnosis', correctOptionId: 'avoid-diagnosis' },
  { id: 'medication-advice', correctOptionId: 'refer-professional' },
  { id: 'active-listening', correctOptionId: 'reflect-and-ask' },
  { id: 'judgement', correctOptionId: 'validate-without-judging' },
  { id: 'dependency', correctOptionId: 'encourage-support-network' },
  { id: 'privacy', correctOptionId: 'no-personal-contact' },
  { id: 'minor-safety', correctOptionId: 'follow-safeguarding' },
  { id: 'abuse-disclosure', correctOptionId: 'validate-and-escalate' },
  { id: 'overpromising', correctOptionId: 'clear-scope' },
  { id: 'triggered-listener', correctOptionId: 'pause-and-supervise' },
  { id: 'cultural-sensitivity', correctOptionId: 'ask-respectfully' },
  { id: 'financial-request', correctOptionId: 'decline-and-report' },
  { id: 'romantic-boundary', correctOptionId: 'firm-boundary' },
  { id: 'data-notes', correctOptionId: 'minimal-safe-notes' },
  { id: 'high-risk-escalation', correctOptionId: 'warm-escalation' },
  { id: 'advice-giving', correctOptionId: 'support-choice' },
  { id: 'end-session', correctOptionId: 'summarize-next-step' }
] as const;

const listenerScreeningAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(80),
  optionId: z.string().trim().min(1).max(80)
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
    listenerGuidelinesAccepted: z.boolean().optional().default(false),
    listenerGuidelinesVersion: z.string().trim().max(120).optional().or(z.literal('')),
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
      if (body.listenerScreeningAnswers.length !== listenerScreeningQuestions.length) {
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
      if (body.listenerScreeningAnswers.length !== listenerScreeningQuestions.length) {
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

function scoreListenerScreening(answers: Array<{ questionId: string; optionId: string }>): {
  score: number;
  maxScore: number;
  passed: boolean;
} {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  const score = listenerScreeningQuestions.reduce(
    (total, question) =>
      total + (answerByQuestion.get(question.id) === question.correctOptionId ? 1 : 0),
    0
  );
  return {
    score,
    maxScore: listenerScreeningQuestions.length,
    passed: score >= LISTENER_SCREENING_PASS_SCORE
  };
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
  const existingUser = await tx.user.findUnique({
    where: { email: application.email },
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
      showOnWebsite: true,
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
      showOnWebsite: true,
      focusAreas
    },
    select: { id: true, userId: true }
  });

  const mentalHealthProfile = await tx.mentalHealthProviderProfile.upsert({
    where: { doctorId: doctor.id },
    create: {
      doctorId: doctor.id,
      careTeamType: application.careTeamType,
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

counsellorApplicationsRouter.post(
  '/counsellor-applications',
  asyncRoute(async (req, res) => {
    const body = counsellorApplicationSchema.parse(req.body);
    const listenerScreening = isListenerTrack(body.applicationTrack)
      ? scoreListenerScreening(body.listenerScreeningAnswers)
      : null;
    const shouldAutoApprove = Boolean(listenerScreening?.passed);
    if (shouldAutoApprove && !body.listenerGuidelinesAccepted) {
      return res.status(400).json({
        message: 'Read and accept the listener guidelines before auto-approval.'
      });
    }

    const application = await prisma.$transaction(async (tx) => {
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
          listenerScreeningAnswers: isListenerTrack(body.applicationTrack)
            ? body.listenerScreeningAnswers
            : undefined,
          listenerScreeningScore: listenerScreening?.score,
          listenerScreeningMaxScore: listenerScreening?.maxScore,
          listenerScreeningPassed: listenerScreening?.passed ?? false,
          listenerScreeningCompletedAt: listenerScreening ? new Date() : null,
          listenerGuidelinesAccepted: shouldAutoApprove
            ? Boolean(body.listenerGuidelinesAccepted)
            : false,
          listenerGuidelinesVersion: shouldAutoApprove
            ? body.listenerGuidelinesVersion || LISTENER_GUIDELINES_VERSION
            : null,
          listenerGuidelinesAcceptedAt: shouldAutoApprove ? new Date() : null,
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

    res.status(201).json({
      applicationId: application.id,
      success: true,
      autoApproved: shouldAutoApprove,
      screeningScore: listenerScreening?.score ?? null,
      screeningMaxScore: listenerScreening?.maxScore ?? null
    });
  })
);
