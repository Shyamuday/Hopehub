import { Router } from 'express';
import { z } from 'zod';
import { HomeopathicDoctorType, PaymentStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import {
  asyncRoute,
  includeConsultationRelations,
  queryPositiveInt,
  queryText,
  routeParam
} from '../utils/helpers.js';
import { ensureBillingPlans } from './catalog.js';
import { resolveConsultationCheckout } from '../services/checkout-pricing.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../utils/profile-image-url.js';

export const hopeHubRouter = Router();

const HOPE_HUB_SESSION_FEE_IN_PAISE = 50000;
const HOPE_HUB_SESSION_DURATION_MINUTES = 30;
const HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT = 50;
const HOPE_HUB_PLATFORM_SHARE_PERCENT = 100 - HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT;

const HOPE_HUB_TIME_SLOTS = [
  { time: '9:00 AM', period: 'morning' },
  { time: '9:30 AM', period: 'morning' },
  { time: '10:00 AM', period: 'morning' },
  { time: '10:30 AM', period: 'morning' },
  { time: '11:00 AM', period: 'morning' },
  { time: '11:30 AM', period: 'morning' },
  { time: '1:00 PM', period: 'afternoon' },
  { time: '1:30 PM', period: 'afternoon' },
  { time: '2:00 PM', period: 'afternoon' },
  { time: '2:30 PM', period: 'afternoon' },
  { time: '3:00 PM', period: 'afternoon' },
  { time: '3:30 PM', period: 'afternoon' },
  { time: '4:00 PM', period: 'afternoon' },
  { time: '4:30 PM', period: 'afternoon' },
  { time: '6:00 PM', period: 'evening' },
  { time: '6:30 PM', period: 'evening' },
  { time: '7:00 PM', period: 'evening' },
  { time: '7:30 PM', period: 'evening' }
] as const;

const hopeHubBookingSchema = z.object({
  serviceName: z.string().trim().min(2).max(160),
  servicePriceInPaise: z.number().int().min(100).max(10000000).optional(),
  message: z.string().trim().max(3000).optional().or(z.literal('')),
  appointmentDate: z.string().trim().min(1).max(80),
  appointmentTime: z.string().trim().min(1).max(80),
  consultantName: z.string().trim().max(160).optional().or(z.literal('')),
  consultantPhone: z.string().trim().max(30).optional().or(z.literal('')),
  sessionDuration: z.string().trim().max(80).optional().or(z.literal('')),
  visitorName: z.string().trim().max(120).optional().or(z.literal('')),
  visitorEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  visitorPhone: z.string().trim().max(30).optional().or(z.literal('')),
  preferredContact: z.enum(['email', 'phone', 'whatsapp', 'telegram']).optional(),
  urgencyLevel: z.enum(['low', 'normal', 'high']).optional(),
  preferredTime: z.string().trim().max(120).optional().or(z.literal('')),
  preferAnonymousTelegram: z.boolean().optional(),
  providerId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

const hopeHubAssessmentAttemptSchema = z.object({
  assessmentId: z.string().trim().min(1).max(120),
  assessmentType: z.string().trim().min(1).max(120),
  category: z.string().trim().max(120).optional().or(z.literal('')),
  title: z.string().trim().min(1).max(200),
  version: z.string().trim().min(1).max(40).optional(),
  answers: z.array(z.number().int().min(0).max(10)).min(1).max(120),
  totalScore: z.number().int().min(0).max(1000),
  maxScore: z.number().int().min(1).max(1000),
  level: z.string().trim().min(1).max(160),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(3000).optional().or(z.literal('')),
  suggestions: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  safetyFlag: z.boolean().optional(),
  source: z.string().trim().max(120).optional().or(z.literal('')),
  entryPage: z.string().trim().max(500).optional().or(z.literal('')),
  completedAt: z.string().datetime().optional()
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function serializeAssessmentAttempt(attempt: {
  id: string;
  assessmentId: string;
  assessmentType: string;
  category: string | null;
  title: string;
  version: string;
  answers: unknown;
  totalScore: number;
  maxScore: number;
  level: string;
  color: string | null;
  description: string | null;
  suggestions: unknown;
  safetyFlag: boolean;
  retakeNumber: number;
  previousId: string | null;
  source: string | null;
  entryPage: string | null;
  completedAt: Date;
  createdAt: Date;
}) {
  return {
    ...attempt,
    completedAt: attempt.completedAt.toISOString(),
    createdAt: attempt.createdAt.toISOString()
  };
}

function defaultDescription(serviceName: string) {
  return `Hope Hub consultation request for ${serviceName}.`;
}

function hopeHubRevenueSplit(amountInPaise: number) {
  const psychologistShareInPaise = Math.round(
    (amountInPaise * HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT) / 100
  );
  return {
    shareModel: 'HOPE_HUB_50_50',
    psychologistSharePercent: HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT,
    platformSharePercent: HOPE_HUB_PLATFORM_SHARE_PERCENT,
    psychologistShareInPaise,
    platformShareInPaise: amountInPaise - psychologistShareInPaise
  };
}

function providerPublicPayload(provider: {
  id: string;
  specialty: string;
  designation: string | null;
  department: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  focusAreas: string[];
  mentalHealthProfile?: {
    qualifications: string[];
    licenseNumber: string | null;
    licenseCouncil: string | null;
    languages: string[];
    modalities: string[];
    sessionTypes: string[];
    ageGroups: string[];
    concernsHandled: string[];
    introSessionTitle: string | null;
    counsellingApproach: string | null;
    safetyEscalationNote: string | null;
    acceptsHighRiskCases: boolean;
  } | null;
  user: { id: string; name: string; profileImageKey: string | null };
}) {
  const user = enrichWithProfileImageUrl(provider.user, userProfileImagePath);
  const focusAreas = provider.focusAreas || [];
  const mental = provider.mentalHealthProfile;
  return {
    id: provider.id,
    userId: user.id,
    name: user.name,
    profileImageUrl: user.profileImageUrl,
    specialty: provider.specialty,
    designation: provider.designation,
    department: provider.department,
    bio: provider.bio,
    yearsOfExperience: provider.yearsOfExperience,
    focusAreas,
    qualifications: mental?.qualifications ?? [],
    licenseNumber: mental?.licenseNumber ?? null,
    licenseCouncil: mental?.licenseCouncil ?? null,
    languages: mental?.languages?.length
      ? mental.languages
      : focusAreas
          .filter((item) => /^language:/i.test(item))
          .map((item) => item.replace(/^language:\s*/i, '')),
    modalities: mental?.modalities?.length
      ? mental.modalities
      : focusAreas
          .filter((item) => /^modality:/i.test(item))
          .map((item) => item.replace(/^modality:\s*/i, '')),
    sessionTypes: mental?.sessionTypes?.length
      ? mental.sessionTypes
      : focusAreas
          .filter((item) => /^session:/i.test(item))
          .map((item) => item.replace(/^session:\s*/i, '')),
    ageGroups: mental?.ageGroups ?? [],
    concernsHandled: mental?.concernsHandled?.length
      ? mental.concernsHandled
      : focusAreas.filter((item) => !/^(language|modality|session):/i.test(item)),
    introSessionTitle: mental?.introSessionTitle ?? null,
    counsellingApproach: mental?.counsellingApproach ?? null,
    safetyEscalationNote: mental?.safetyEscalationNote ?? null,
    acceptsHighRiskCases: mental?.acceptsHighRiskCases ?? false,
    sessionFeeInPaise: HOPE_HUB_SESSION_FEE_IN_PAISE,
    sessionDurationMinutes: HOPE_HUB_SESSION_DURATION_MINUTES
  };
}

hopeHubRouter.get(
  '/hope-hub/slots',
  asyncRoute(async (req, res) => {
    const date = queryText(req, 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format.' });
    }

    const consultations = await prisma.consultation.findMany({
      where: {
        disease: { publicCategory: 'Hope Hub' },
        status: { not: 'CANCELLED' }
      },
      select: { intakeAnswers: true }
    });

    const bookedTimes = new Set(
      consultations
        .map((consultation) => consultation.intakeAnswers as Record<string, unknown>)
        .filter((answers) => answers['appointmentDate'] === date)
        .map((answers) => String(answers['appointmentTime'] || ''))
        .filter(Boolean)
    );

    const selectedDate = new Date(`${date}T00:00:00`);
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

    res.json({
      date,
      slots: HOPE_HUB_TIME_SLOTS.map((slot) => ({
        time: slot.time,
        period: slot.period,
        available: !isWeekend && !bookedTimes.has(slot.time),
        booked: bookedTimes.has(slot.time)
      }))
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/providers',
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = Math.max(1, Math.min(50, queryPositiveInt(req, 'pageSize', 20)));
    const q = queryText(req, 'q').trim();

    const psychologyWhere = {
      showOnWebsite: true,
      user: { isActive: true },
      OR: [
        { doctorType: HomeopathicDoctorType.PSYCHOLOGIST },
        { specialty: { contains: 'psycholog', mode: 'insensitive' as const } },
        { designation: { contains: 'psycholog', mode: 'insensitive' as const } },
        { department: { contains: 'mental', mode: 'insensitive' as const } },
        { department: { contains: 'wellness', mode: 'insensitive' as const } },
        {
          focusAreas: {
            hasSome: ['Psychology', 'Anxiety support', 'Stress management', 'Counselling']
          }
        }
      ],
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { user: { name: { contains: q, mode: 'insensitive' as const } } },
                  { specialty: { contains: q, mode: 'insensitive' as const } },
                  { designation: { contains: q, mode: 'insensitive' as const } },
                  { department: { contains: q, mode: 'insensitive' as const } },
                  { bio: { contains: q, mode: 'insensitive' as const } }
                ]
              }
            ]
          }
        : {})
    };

    const [providers, total] = await Promise.all([
      prisma.doctor.findMany({
        where: psychologyWhere,
        select: {
          id: true,
          specialty: true,
          designation: true,
          department: true,
          bio: true,
          yearsOfExperience: true,
          focusAreas: true,
          websiteOrder: true,
          mentalHealthProfile: {
            select: {
              qualifications: true,
              licenseNumber: true,
              licenseCouncil: true,
              languages: true,
              modalities: true,
              sessionTypes: true,
              ageGroups: true,
              concernsHandled: true,
              introSessionTitle: true,
              counsellingApproach: true,
              safetyEscalationNote: true,
              acceptsHighRiskCases: true
            }
          },
          user: { select: { id: true, name: true, profileImageKey: true } }
        },
        orderBy: [{ websiteOrder: { sort: 'asc', nulls: 'last' } }, { user: { name: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.doctor.count({ where: psychologyWhere })
    ]);

    res.json({
      providers: providers.map(providerPublicPayload),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/providers/:id',
  asyncRoute(async (req, res) => {
    const providerId = routeParam(req, 'id');
    const provider = await prisma.doctor.findFirst({
      where: {
        id: providerId,
        showOnWebsite: true,
        user: { isActive: true },
        OR: [
          { doctorType: HomeopathicDoctorType.PSYCHOLOGIST },
          { specialty: { contains: 'psycholog', mode: 'insensitive' } },
          { designation: { contains: 'psycholog', mode: 'insensitive' } },
          { department: { contains: 'mental', mode: 'insensitive' } },
          { department: { contains: 'wellness', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        specialty: true,
        designation: true,
        department: true,
        bio: true,
        yearsOfExperience: true,
        focusAreas: true,
        mentalHealthProfile: {
          select: {
            qualifications: true,
            licenseNumber: true,
            licenseCouncil: true,
            languages: true,
            modalities: true,
            sessionTypes: true,
            ageGroups: true,
            concernsHandled: true,
            introSessionTitle: true,
            counsellingApproach: true,
            safetyEscalationNote: true,
            acceptsHighRiskCases: true
          }
        },
        user: { select: { id: true, name: true, profileImageKey: true } }
      }
    });

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found.' });
    }
    res.json({ provider: providerPublicPayload(provider) });
  })
);

hopeHubRouter.post(
  '/hope-hub/assessments',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = hopeHubAssessmentAttemptSchema.parse(req.body);
    const normalizedAnswers = body.answers.map((answer) => Number(answer || 0));
    const computedTotal = normalizedAnswers.reduce((sum, answer) => sum + answer, 0);
    if (computedTotal !== body.totalScore) {
      return res.status(400).json({ message: 'Assessment score does not match answers.' });
    }

    const previous = await prisma.hopeHubAssessmentAttempt.findFirst({
      where: {
        userId: req.user!.id,
        assessmentId: body.assessmentId
      },
      orderBy: { completedAt: 'desc' },
      select: { id: true, retakeNumber: true, totalScore: true, level: true, completedAt: true }
    });

    const attempt = await prisma.hopeHubAssessmentAttempt.create({
      data: {
        userId: req.user!.id,
        assessmentId: body.assessmentId,
        assessmentType: body.assessmentType,
        category: body.category || null,
        title: body.title,
        version: body.version || 'v1',
        answers: normalizedAnswers,
        totalScore: computedTotal,
        maxScore: body.maxScore,
        level: body.level,
        color: body.color || null,
        description: body.description || null,
        suggestions: body.suggestions ?? [],
        safetyFlag: Boolean(body.safetyFlag),
        retakeNumber: (previous?.retakeNumber ?? 0) + 1,
        previousId: previous?.id ?? null,
        source: body.source || null,
        entryPage: body.entryPage || null,
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date()
      }
    });

    void trackProductEvent({
      name: 'hope_hub_assessment_completed',
      actorId: req.user!.id,
      actorRole: req.user!.role,
      properties: {
        source: 'hope-hub',
        attemptId: attempt.id,
        assessmentId: attempt.assessmentId,
        assessmentType: attempt.assessmentType,
        totalScore: attempt.totalScore,
        level: attempt.level,
        safetyFlag: attempt.safetyFlag,
        retakeNumber: attempt.retakeNumber,
        previousScore: previous?.totalScore ?? null
      }
    });

    res.status(201).json({
      attempt: serializeAssessmentAttempt(attempt),
      previous: previous
        ? {
            ...previous,
            completedAt: previous.completedAt.toISOString()
          }
        : null
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/assessments',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1);
    const pageSize = Math.max(1, Math.min(50, queryPositiveInt(req, 'pageSize', 20)));
    const assessmentId = queryText(req, 'assessmentId').trim();

    const where = {
      userId: req.user!.id,
      ...(assessmentId ? { assessmentId } : {})
    };

    const [attempts, total] = await Promise.all([
      prisma.hopeHubAssessmentAttempt.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.hopeHubAssessmentAttempt.count({ where })
    ]);

    res.json({
      attempts: attempts.map(serializeAssessmentAttempt),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/assessments/latest',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const assessmentId = queryText(req, 'assessmentId').trim();
    if (!assessmentId) {
      return res.status(400).json({ message: 'assessmentId is required.' });
    }

    const latest = await prisma.hopeHubAssessmentAttempt.findFirst({
      where: { userId: req.user!.id, assessmentId },
      orderBy: { completedAt: 'desc' }
    });

    res.json({ attempt: latest ? serializeAssessmentAttempt(latest) : null });
  })
);

hopeHubRouter.post(
  '/hope-hub/bookings',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = hopeHubBookingSchema.parse(req.body);
    const amountInPaise = HOPE_HUB_SESSION_FEE_IN_PAISE;
    const slug = slugify(body.serviceName);
    const requestedProvider = body.providerId
      ? await prisma.doctor.findFirst({
          where: {
            id: body.providerId,
            showOnWebsite: true,
            user: { isActive: true },
            OR: [
              { doctorType: HomeopathicDoctorType.PSYCHOLOGIST },
              { specialty: { contains: 'psycholog', mode: 'insensitive' } },
              { designation: { contains: 'psycholog', mode: 'insensitive' } },
              { department: { contains: 'mental', mode: 'insensitive' } },
              { department: { contains: 'wellness', mode: 'insensitive' } }
            ]
          },
          select: { id: true, userId: true, user: { select: { name: true } } }
        })
      : null;

    await ensureBillingPlans();
    const disease = await prisma.disease.upsert({
      where: { name: body.serviceName },
      create: {
        name: body.serviceName,
        slug,
        description: defaultDescription(body.serviceName),
        publicDescription: defaultDescription(body.serviceName),
        publicCategory: 'Hope Hub',
        feeInPaise: amountInPaise,
        intakeQuestions: [
          { id: 'concern', label: 'What would you like support with?' },
          { id: 'appointment', label: 'Preferred appointment slot' }
        ]
      },
      update: {
        publicCategory: 'Hope Hub',
        feeInPaise: amountInPaise
      }
    });

    const selectedPlan = await prisma.billingPlan.findFirst({
      where: { code: 'ONE_TIME', isActive: true }
    });
    if (!selectedPlan) {
      return res.status(400).json({ message: 'One-time consultation plan is not available.' });
    }

    const checkout = await resolveConsultationCheckout({
      patientId: req.user!.id,
      grossInPaise: amountInPaise
    });
    const grossRevenueSplit = hopeHubRevenueSplit(checkout.grossAmountInPaise);
    const payableRevenueSplit = hopeHubRevenueSplit(checkout.payableInPaise);

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        clinicStoreId: null,
        assignedDoctorId: requestedProvider?.userId ?? null,
        consultationMode: 'INSTANT_ONLINE',
        intakeAnswers: {
          source: 'hope-hub',
          serviceName: body.serviceName,
          message: body.message || '',
          appointmentDate: body.appointmentDate,
          appointmentTime: body.appointmentTime,
          consultantName: body.consultantName || '',
          consultantPhone: body.consultantPhone || '',
          providerId: requestedProvider?.id || body.providerId || '',
          requestedProviderName: requestedProvider?.user.name || '',
          sessionDuration: `${HOPE_HUB_SESSION_DURATION_MINUTES} minutes`,
          requestedSessionDuration: body.sessionDuration || '',
          preferredContact: body.preferredContact || '',
          urgencyLevel: body.urgencyLevel || '',
          preferredTime: body.preferredTime || '',
          preferAnonymousTelegram: Boolean(body.preferAnonymousTelegram),
          entryPage: body.entryPage || ''
        },
        billingPlanCode: selectedPlan.code,
        pricingSnapshot: {
          source: 'hope-hub',
          purchaseType: 'ONE_TIME',
          serviceName: body.serviceName,
          sessionFeeInPaise: amountInPaise,
          sessionDurationMinutes: HOPE_HUB_SESSION_DURATION_MINUTES,
          grossRevenueSplit,
          payableRevenueSplit,
          checkout
        },
        payment: {
          create: {
            grossAmountInPaise: checkout.grossAmountInPaise,
            discountInPaise: checkout.discountInPaise,
            walletRedeemedInPaise: checkout.walletRedeemedInPaise,
            amountInPaise: checkout.payableInPaise,
            billingPlanCode: selectedPlan.code,
            appliedRules: checkout.appliedRules,
            lineItems: {
              source: 'hope-hub',
              serviceName: body.serviceName,
              providerId: requestedProvider?.id || body.providerId || '',
              requestedProviderName: requestedProvider?.user.name || '',
              sessionDurationMinutes: HOPE_HUB_SESSION_DURATION_MINUTES,
              consultationFeeInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              payableInPaise: checkout.payableInPaise,
              grossRevenueSplit,
              payableRevenueSplit,
              planCode: selectedPlan.code,
              planName: selectedPlan.name,
              appliedRules: checkout.appliedRules
            },
            status: PaymentStatus.CREATED
          }
        }
      },
      include: includeConsultationRelations()
    });

    await prisma.websiteLead.create({
      data: {
        source: 'HOME_BOOKING',
        followUpStatus: 'BOOKED',
        visitorName: body.visitorName || req.user!.name,
        visitorEmail: body.visitorEmail || req.user!.email,
        visitorPhone: body.visitorPhone || req.user!.mobile,
        concern: [
          `Service: ${body.serviceName}`,
          `Appointment: ${body.appointmentDate} ${body.appointmentTime}`,
          body.preferredContact ? `Preferred contact: ${body.preferredContact}` : '',
          body.urgencyLevel ? `Urgency: ${body.urgencyLevel}` : '',
          body.preferredTime ? `Preferred callback time: ${body.preferredTime}` : '',
          requestedProvider ? `Requested expert: ${requestedProvider.user.name}` : '',
          body.preferAnonymousTelegram ? 'Low-identity Telegram follow-up requested' : '',
          body.message ? `Message: ${body.message}` : ''
        ]
          .filter(Boolean)
          .join('\n'),
        entryPage: body.entryPage || null,
        userId: req.user!.id,
        registeredAt: new Date(),
        bookedAt: new Date(),
        consultationId: consultation.id
      }
    });

    void trackProductEvent({
      name: PRODUCT_EVENTS.CONSULTATION_BOOKED,
      actorId: req.user!.id,
      actorRole: req.user!.role,
      properties: {
        source: 'hope-hub',
        consultationId: consultation.id,
        diseaseId: disease.id,
        serviceName: body.serviceName,
        providerId: requestedProvider?.id ?? body.providerId ?? ''
      }
    });

    res.status(201).json({ consultation });
  })
);

hopeHubRouter.get(
  '/hope-hub/dashboard',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const consultations = await prisma.consultation.findMany({
      where: { patientId: req.user!.id },
      include: includeConsultationRelations(),
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const leads = await prisma.websiteLead.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({ consultations, leads });
  })
);
