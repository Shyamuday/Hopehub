import { Router } from 'express';
import { z } from 'zod';
import { HomeopathicDoctorType, HopeHubOfferingType, PaymentStatus, Role } from '@prisma/client';
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
import { hopeHubMediaMimeType, readHopeHubMediaFile } from '../services/hope-hub-media-storage.js';
import { getAssessmentDefinition, scoreAssessment } from '../services/assessment-definitions.js';

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
  offeringId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  offeringSlug: z.string().trim().min(1).max(160).optional().or(z.literal('')),
  paymentMode: z.enum(['FULL', 'PARTIAL']).optional(),
  concernCategory: z.string().trim().max(160).optional().or(z.literal('')),
  preferredExpertType: z.string().trim().max(160).optional().or(z.literal('')),
  sessionMode: z.string().trim().max(80).optional().or(z.literal('')),
  preferredLanguage: z.string().trim().max(80).optional().or(z.literal('')),
  safetyRisk: z.string().trim().max(80).optional().or(z.literal('')),
  previousTherapyOrMedication: z.string().trim().max(1000).optional().or(z.literal('')),
  emergencyConsent: z.boolean().optional(),
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

const organizationLeadSchema = z.object({
  organizationName: z.string().trim().min(2).max(160),
  organizationType: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(30).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  audienceSize: z.number().int().positive().max(1000000).optional().nullable(),
  needType: z.string().trim().max(120).optional().or(z.literal('')),
  preferredDate: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(3000).optional().or(z.literal('')),
  offeringId: z.string().trim().max(120).optional().or(z.literal('')),
  offeringSlug: z.string().trim().max(160).optional().or(z.literal('')),
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

const hopeHubAssessmentAttemptSchema = z.object({
  assessmentId: z.string().trim().min(1).max(120),
  assessmentType: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().max(120).optional().or(z.literal('')),
  title: z.string().trim().min(1).max(200).optional(),
  version: z.string().trim().min(1).max(40).optional(),
  answers: z.array(z.number().int().min(0).max(10)).min(1).max(120),
  totalScore: z.number().int().min(0).max(1000).optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
  level: z.string().trim().min(1).max(160).optional(),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(3000).optional().or(z.literal('')),
  suggestions: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  safetyFlag: z.boolean().optional(),
  source: z.string().trim().max(120).optional().or(z.literal('')),
  entryPage: z.string().trim().max(500).optional().or(z.literal('')),
  completedAt: z.string().datetime().optional()
});

function normalizeHopeHubMediaKey(value: string) {
  try {
    const decoded = value
      .split('/')
      .map((part) => decodeURIComponent(part))
      .join('/');
    if (!decoded.startsWith('hope-hub-media/')) return '';
    if (decoded.includes('..')) return '';
    return decoded;
  } catch {
    return '';
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function displayTimeFrom24Hour(value: string) {
  const [rawHour, rawMinute = '00'] = value.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${rawMinute.padStart(2, '0')} ${suffix}`;
}

function time24HourFromDisplay(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = match[3].toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function periodForTime(value: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(time24HourFromDisplay(value).split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
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

function clampPaise(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hopeHubDiscountSnapshot(
  offering: {
    id: string;
    code: string;
    discountEnabled: boolean;
    discountType: string;
    discountLabel: string | null;
    discountCode: string | null;
    discountPercent: number | null;
    discountFlatInPaise: number | null;
    discountMaxInPaise: number | null;
    discountStartsAt: Date | null;
    discountEndsAt: Date | null;
  } | null,
  grossInPaise: number
) {
  if (!offering?.discountEnabled || offering.discountType === 'NONE' || grossInPaise <= 0) {
    return { discountInPaise: 0, rule: null };
  }
  const now = new Date();
  if (offering.discountStartsAt && offering.discountStartsAt > now) {
    return { discountInPaise: 0, rule: null };
  }
  if (offering.discountEndsAt && offering.discountEndsAt < now) {
    return { discountInPaise: 0, rule: null };
  }

  let discountInPaise = 0;
  if (
    (offering.discountType === 'PERCENT' ||
      offering.discountType === 'REFERRAL' ||
      offering.discountType === 'CUSTOM') &&
    offering.discountPercent
  ) {
    discountInPaise = Math.round((grossInPaise * offering.discountPercent) / 100);
  }
  if (
    (offering.discountType === 'FLAT' ||
      offering.discountType === 'REFERRAL' ||
      offering.discountType === 'CUSTOM') &&
    offering.discountFlatInPaise
  ) {
    discountInPaise = Math.max(discountInPaise, offering.discountFlatInPaise);
  }
  if (offering.discountMaxInPaise) {
    discountInPaise = Math.min(discountInPaise, offering.discountMaxInPaise);
  }
  discountInPaise = clampPaise(discountInPaise, 0, Math.max(0, grossInPaise - 100));
  if (discountInPaise <= 0) return { discountInPaise: 0, rule: null };

  return {
    discountInPaise,
    rule: {
      source: 'hope-hub-offering',
      offeringId: offering.id,
      offeringCode: offering.code,
      type: offering.discountType,
      label: offering.discountLabel || 'Offer discount',
      code: offering.discountCode || null,
      percent: offering.discountPercent,
      flatInPaise: offering.discountFlatInPaise,
      maxInPaise: offering.discountMaxInPaise,
      startsAt: offering.discountStartsAt?.toISOString() ?? null,
      endsAt: offering.discountEndsAt?.toISOString() ?? null,
      amountInPaise: discountInPaise
    }
  };
}

function isOfferingDiscountActive(offering: {
  discountEnabled: boolean;
  discountType: string;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}) {
  if (!offering.discountEnabled || offering.discountType === 'NONE') return false;
  const now = new Date();
  if (offering.discountStartsAt && offering.discountStartsAt > now) return false;
  if (offering.discountEndsAt && offering.discountEndsAt < now) return false;
  return true;
}

function hopeHubPartialPaymentSnapshot(
  offering: {
    partialPaymentEnabled: boolean;
    partialPaymentType: string;
    partialPaymentLabel: string | null;
    partialPaymentPercent: number | null;
    partialPaymentFlatInPaise: number | null;
  } | null,
  netInPaise: number,
  requestedMode?: 'FULL' | 'PARTIAL'
) {
  if (
    requestedMode !== 'PARTIAL' ||
    !offering?.partialPaymentEnabled ||
    offering.partialPaymentType === 'NONE' ||
    netInPaise <= 0
  ) {
    return {
      paymentMode: 'FULL' as const,
      payableInPaise: netInPaise,
      balanceDueInPaise: 0,
      partialRule: null
    };
  }

  let payableInPaise = netInPaise;
  if (offering.partialPaymentType === 'PERCENT' && offering.partialPaymentPercent) {
    payableInPaise = Math.round((netInPaise * offering.partialPaymentPercent) / 100);
  }
  if (offering.partialPaymentType === 'FLAT' && offering.partialPaymentFlatInPaise) {
    payableInPaise = offering.partialPaymentFlatInPaise;
  }
  payableInPaise = clampPaise(payableInPaise, 100, netInPaise);
  return {
    paymentMode: payableInPaise < netInPaise ? ('PARTIAL' as const) : ('FULL' as const),
    payableInPaise,
    balanceDueInPaise: Math.max(0, netInPaise - payableInPaise),
    partialRule:
      payableInPaise < netInPaise
        ? {
            source: 'hope-hub-offering',
            type: offering.partialPaymentType,
            label: offering.partialPaymentLabel || 'Partial payment',
            percent: offering.partialPaymentPercent,
            flatInPaise: offering.partialPaymentFlatInPaise,
            payableInPaise,
            balanceDueInPaise: netInPaise - payableInPaise
          }
        : null
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
    slug: `${slugify(user.name || provider.designation || provider.specialty || 'expert')}-${provider.id}`,
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

function servicePublicPayload(service: {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  publicDescription: string | null;
  publicImageUrl: string | null;
  feeInPaise: number;
  intakeQuestions: unknown;
  publicFaq: unknown;
  publicPageContent: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
}) {
  const content = (service.publicPageContent ?? {}) as {
    benefits?: string[];
    approach?: string;
    category?: string;
    featured?: boolean;
    duration?: string;
  };
  return {
    id: service.slug || service.id,
    diseaseId: service.id,
    name: service.name,
    slug: service.slug,
    description: service.description,
    detailedDescription: service.publicDescription || service.description,
    benefits: Array.isArray(content.benefits) ? content.benefits : [],
    approach: content.approach || '',
    category: content.category || 'mental-health',
    featured: content.featured ?? true,
    imageUrl: service.publicImageUrl || '',
    pricing: { individual: Math.round(service.feeInPaise / 100), currency: 'INR' },
    feeInPaise: service.feeInPaise,
    duration: content.duration || `${HOPE_HUB_SESSION_DURATION_MINUTES} minutes`,
    intakeQuestions: service.intakeQuestions,
    publicFaq: service.publicFaq,
    seoTitle: service.seoTitle,
    seoDescription: service.seoDescription
  };
}

function offeringPublicPayload(
  offering: {
    id: string;
    code: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    type: string;
    priceInPaise: number | null;
    compareAtPriceInPaise: number | null;
    currency: string;
    discountEnabled: boolean;
    discountType: string;
    discountLabel: string | null;
    discountCode: string | null;
    discountPercent: number | null;
    discountFlatInPaise: number | null;
    discountMaxInPaise: number | null;
    discountStartsAt: Date | null;
    discountEndsAt: Date | null;
    partialPaymentEnabled: boolean;
    partialPaymentType: string;
    partialPaymentLabel: string | null;
    partialPaymentPercent: number | null;
    partialPaymentFlatInPaise: number | null;
    validityDays: number | null;
    sessionCount: number | null;
    sessionDurationMinutes: number | null;
    deliveryMode: string;
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
    seatLimit: number | null;
    venue: string | null;
    imageUrl: string | null;
    ctaLabel: string;
    routePath: string | null;
    benefits: string[];
    audience: string[];
    metadata: unknown;
    isFeatured: boolean;
    requiresLeadForm: boolean;
    sortOrder: number;
  },
  seatsBooked = 0
) {
  const seatsRemaining =
    offering.seatLimit == null ? null : Math.max(0, offering.seatLimit - seatsBooked);
  return {
    ...offering,
    eventStartsAt: offering.eventStartsAt?.toISOString() ?? null,
    eventEndsAt: offering.eventEndsAt?.toISOString() ?? null,
    discountStartsAt: offering.discountStartsAt?.toISOString() ?? null,
    discountEndsAt: offering.discountEndsAt?.toISOString() ?? null,
    isDiscountActive: isOfferingDiscountActive(offering),
    seatsBooked,
    seatsRemaining,
    isFull: seatsRemaining === 0,
    routePath:
      offering.routePath ||
      (offering.type === 'WORKSHOP' ||
      offering.type === 'MEETUP' ||
      offering.type === 'WEBINAR' ||
      offering.type === 'GROUP_SESSION'
        ? `/events/${offering.slug}`
        : offering.type === 'RECORDED_SESSION'
          ? `/resources/${offering.slug}`
          : offering.type === 'ORGANISATION_PROGRAM'
            ? '/organization'
            : `/packages/${offering.slug}`)
  };
}

function bannerPublicPayload(banner: {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  routePath: string;
  offeringId: string | null;
  backgroundColor: string | null;
  textColor: string | null;
}) {
  return banner;
}

const hopeHubServiceSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  publicDescription: true,
  publicImageUrl: true,
  feeInPaise: true,
  intakeQuestions: true,
  publicFaq: true,
  publicPageContent: true,
  seoTitle: true,
  seoDescription: true
} as const;

const hopeHubOfferingSelect = {
  id: true,
  code: true,
  slug: true,
  title: true,
  subtitle: true,
  description: true,
  type: true,
  priceInPaise: true,
  compareAtPriceInPaise: true,
  currency: true,
  discountEnabled: true,
  discountType: true,
  discountLabel: true,
  discountCode: true,
  discountPercent: true,
  discountFlatInPaise: true,
  discountMaxInPaise: true,
  discountStartsAt: true,
  discountEndsAt: true,
  partialPaymentEnabled: true,
  partialPaymentType: true,
  partialPaymentLabel: true,
  partialPaymentPercent: true,
  partialPaymentFlatInPaise: true,
  validityDays: true,
  sessionCount: true,
  sessionDurationMinutes: true,
  deliveryMode: true,
  eventStartsAt: true,
  eventEndsAt: true,
  seatLimit: true,
  venue: true,
  imageUrl: true,
  ctaLabel: true,
  routePath: true,
  benefits: true,
  audience: true,
  metadata: true,
  isFeatured: true,
  requiresLeadForm: true,
  sortOrder: true
} as const;

async function bookedSeatsByOfferingCode(codes: string[]) {
  if (!codes.length) return new Map<string, number>();
  const recentReservationCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const rows = await prisma.payment.groupBy({
    by: ['billingPlanCode'],
    where: {
      billingPlanCode: { in: codes },
      OR: [
        { status: PaymentStatus.PAID },
        { status: PaymentStatus.CREATED, createdAt: { gte: recentReservationCutoff } }
      ]
    },
    _count: { _all: true }
  });
  return new Map(rows.map((row) => [row.billingPlanCode || '', row._count._all]));
}

hopeHubRouter.get(
  /^\/hope-hub\/media\/(.+)$/,
  asyncRoute(async (req, res) => {
    const storageKey = normalizeHopeHubMediaKey(String(req.params[0] || ''));
    if (!storageKey) return res.status(404).json({ message: 'Media not found.' });
    try {
      const bytes = await readHopeHubMediaFile(storageKey);
      res.setHeader('Content-Type', hopeHubMediaMimeType(storageKey));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(bytes);
    } catch {
      res.status(404).json({ message: 'Media not found.' });
    }
  })
);

hopeHubRouter.get(
  '/hope-hub/offerings',
  asyncRoute(async (req, res) => {
    const type = queryText(req, 'type').trim();
    const featured = queryText(req, 'featured').trim();
    const normalizedType = Object.values(HopeHubOfferingType).includes(type as HopeHubOfferingType)
      ? (type as HopeHubOfferingType)
      : undefined;
    const where = {
      isActive: true,
      ...(normalizedType ? { type: normalizedType } : {}),
      ...(featured === 'true' ? { isFeatured: true } : {})
    };
    const offerings = await prisma.hopeHubOffering.findMany({
      where,
      select: hopeHubOfferingSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    const seatCounts = await bookedSeatsByOfferingCode(offerings.map((offering) => offering.code));
    res.json({
      offerings: offerings.map((offering) =>
        offeringPublicPayload(offering, seatCounts.get(offering.code) ?? 0)
      )
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/offerings/:slug',
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug');
    const offering = await prisma.hopeHubOffering.findFirst({
      where: { isActive: true, OR: [{ slug }, { code: slug }, { id: slug }] },
      select: hopeHubOfferingSelect
    });
    if (!offering) return res.status(404).json({ message: 'Offering not found.' });
    const seatCounts = await bookedSeatsByOfferingCode([offering.code]);
    res.json({ offering: offeringPublicPayload(offering, seatCounts.get(offering.code) ?? 0) });
  })
);

hopeHubRouter.get(
  '/hope-hub/banners',
  asyncRoute(async (_req, res) => {
    const now = new Date();
    const banners = await prisma.hopeHubBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
        ]
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        eyebrow: true,
        imageUrl: true,
        ctaLabel: true,
        routePath: true,
        offeringId: true,
        backgroundColor: true,
        textColor: true
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    res.json({ banners: banners.map(bannerPublicPayload) });
  })
);

hopeHubRouter.post(
  '/hope-hub/organization-leads',
  asyncRoute(async (req, res) => {
    const body = organizationLeadSchema.parse(req.body);
    const offering =
      body.offeringId || body.offeringSlug
        ? await prisma.hopeHubOffering.findFirst({
            where: {
              OR: [
                ...(body.offeringId ? [{ id: body.offeringId }, { code: body.offeringId }] : []),
                ...(body.offeringSlug ? [{ slug: body.offeringSlug }] : [])
              ]
            },
            select: { id: true }
          })
        : null;
    const lead = await prisma.hopeHubOrganizationLead.create({
      data: {
        organizationName: body.organizationName,
        organizationType: body.organizationType,
        contactName: body.contactName,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        city: body.city || null,
        audienceSize: body.audienceSize ?? null,
        needType: body.needType || null,
        preferredDate: body.preferredDate || null,
        notes: body.notes || null,
        offeringId: offering?.id ?? null,
        entryPage: body.entryPage || req.get('referer') || null
      }
    });
    res.status(201).json({ leadId: lead.id, success: true });
  })
);

hopeHubRouter.get(
  '/hope-hub/services',
  asyncRoute(async (_req, res) => {
    const services = await prisma.disease.findMany({
      where: { isActive: true, publicCategory: 'Hope Hub' },
      select: hopeHubServiceSelect,
      orderBy: [{ name: 'asc' }]
    });
    res.json({ services: services.map(servicePublicPayload) });
  })
);

hopeHubRouter.get(
  '/hope-hub/services/:id',
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const service = await prisma.disease.findFirst({
      where: {
        isActive: true,
        publicCategory: 'Hope Hub',
        OR: [{ id }, { slug: id }]
      },
      select: hopeHubServiceSelect
    });
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }
    res.json({ service: servicePublicPayload(service) });
  })
);

hopeHubRouter.get(
  '/hope-hub/slots',
  asyncRoute(async (req, res) => {
    const date = queryText(req, 'date');
    const providerId = queryText(req, 'providerId').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format.' });
    }

    if (providerId) {
      const provider = await prisma.doctor.findFirst({
        where: { id: providerId, showOnWebsite: true, user: { isActive: true } },
        select: { id: true }
      });
      if (!provider) {
        return res.status(404).json({ message: 'Expert not found.' });
      }

      const slots = await prisma.doctorSlot.findMany({
        where: { doctorId: provider.id, date: new Date(date), isBlocked: false },
        orderBy: { startTime: 'asc' }
      });

      return res.json({
        date,
        providerId,
        slots: slots.map((slot) => {
          const time = displayTimeFrom24Hour(slot.startTime);
          return {
            time,
            period: periodForTime(time),
            available: !slot.isBooked,
            booked: slot.isBooked
          };
        })
      });
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
    const concern = queryText(req, 'concern').trim();
    const language = queryText(req, 'language').trim();
    const modality = queryText(req, 'modality').trim();
    const sessionType = queryText(req, 'sessionType').trim();
    const ageGroup = queryText(req, 'ageGroup').trim();

    const psychologyWhere = {
      showOnWebsite: true,
      user: { isActive: true },
      ...(concern || language || modality || sessionType || ageGroup
        ? {
            mentalHealthProfile: {
              is: {
                ...(concern ? { concernsHandled: { has: concern } } : {}),
                ...(language ? { languages: { has: language } } : {}),
                ...(modality ? { modalities: { has: modality } } : {}),
                ...(sessionType ? { sessionTypes: { has: sessionType } } : {}),
                ...(ageGroup ? { ageGroups: { has: ageGroup } } : {})
              }
            }
          }
        : {}),
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
                  { bio: { contains: q, mode: 'insensitive' as const } },
                  { mentalHealthProfile: { is: { concernsHandled: { has: q } } } },
                  { mentalHealthProfile: { is: { modalities: { has: q } } } }
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
    const idOrSlug = routeParam(req, 'id');
    const providerId = idOrSlug.includes('-') ? idOrSlug.split('-').at(-1)! : idOrSlug;
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
    const definition = await getAssessmentDefinition(body.assessmentId);
    if (!definition) {
      return res.status(404).json({ message: 'Assessment definition not found.' });
    }

    let scored;
    try {
      scored = scoreAssessment(definition, body.answers);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Could not score assessment.'
      });
    }

    const previous = await prisma.hopeHubAssessmentAttempt.findFirst({
      where: {
        userId: req.user!.id,
        assessmentId: scored.assessmentId
      },
      orderBy: { completedAt: 'desc' },
      select: { id: true, retakeNumber: true, totalScore: true, level: true, completedAt: true }
    });

    const attempt = await prisma.hopeHubAssessmentAttempt.create({
      data: {
        userId: req.user!.id,
        assessmentId: scored.assessmentId,
        assessmentType: scored.assessmentType,
        category: scored.category || null,
        title: scored.title,
        version: scored.version,
        answers: scored.answers,
        totalScore: scored.total,
        maxScore: scored.maxScore,
        level: scored.level,
        color: scored.color || null,
        description: scored.description || null,
        suggestions: scored.suggestions,
        safetyFlag: scored.safetyFlag,
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
    const slug = slugify(body.serviceName);
    const selectedOffering =
      body.offeringId || body.offeringSlug
        ? await prisma.hopeHubOffering.findFirst({
            where: {
              isActive: true,
              OR: [
                ...(body.offeringId
                  ? [{ id: body.offeringId }, { code: body.offeringId }, { slug: body.offeringId }]
                  : []),
                ...(body.offeringSlug
                  ? [{ slug: body.offeringSlug }, { code: body.offeringSlug }]
                  : [])
              ]
            },
            select: hopeHubOfferingSelect
          })
        : null;
    if ((body.offeringId || body.offeringSlug) && !selectedOffering) {
      return res.status(400).json({ message: 'Selected Hope Hub offer is not available.' });
    }
    if (selectedOffering?.requiresLeadForm || selectedOffering?.type === 'ORGANISATION_PROGRAM') {
      return res
        .status(400)
        .json({ message: 'This offer needs a request call form, not checkout.' });
    }
    if (selectedOffering?.seatLimit) {
      const seatCounts = await bookedSeatsByOfferingCode([selectedOffering.code]);
      if ((seatCounts.get(selectedOffering.code) ?? 0) >= selectedOffering.seatLimit) {
        return res.status(409).json({ message: 'This event is full.' });
      }
    }
    const existingService = await prisma.disease.findFirst({
      where: {
        isActive: true,
        publicCategory: 'Hope Hub',
        OR: [{ name: body.serviceName }, { slug }]
      },
      select: { id: true, feeInPaise: true }
    });
    const amountInPaise =
      selectedOffering?.priceInPaise ??
      (body.servicePriceInPaise || existingService?.feeInPaise || HOPE_HUB_SESSION_FEE_IN_PAISE);
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ message: 'Selected offer cannot be paid online.' });
    }
    const offerDiscount = hopeHubDiscountSnapshot(selectedOffering, amountInPaise);
    const netAfterOfferDiscountInPaise = amountInPaise - offerDiscount.discountInPaise;
    const partialPayment = hopeHubPartialPaymentSnapshot(
      selectedOffering,
      netAfterOfferDiscountInPaise,
      body.paymentMode
    );
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
    const requestedSlot =
      requestedProvider && body.appointmentDate && body.appointmentTime
        ? await prisma.doctorSlot.findFirst({
            where: {
              doctorId: requestedProvider.id,
              date: new Date(body.appointmentDate),
              startTime: time24HourFromDisplay(body.appointmentTime),
              isBooked: false,
              isBlocked: false
            },
            select: { id: true }
          })
        : null;
    if (requestedProvider && !requestedSlot) {
      return res.status(409).json({ message: 'Selected expert slot is no longer available.' });
    }

    await ensureBillingPlans();
    const disease = existingService
      ? await prisma.disease.update({
          where: { id: existingService.id },
          data: { feeInPaise: amountInPaise }
        })
      : await prisma.disease.upsert({
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

    const selectedPlanCode = selectedOffering?.code || 'ONE_TIME';
    const selectedPlanName = selectedOffering?.title || 'One-Time Appointment';
    const packageValidUntil =
      selectedOffering?.validityDays && selectedOffering.validityDays > 0
        ? new Date(Date.now() + selectedOffering.validityDays * 24 * 60 * 60 * 1000)
        : null;
    const packageUsage =
      selectedOffering && (selectedOffering.sessionCount || 0) > 1
        ? {
            totalSessions: selectedOffering.sessionCount || 1,
            usedSessions: 0,
            remainingSessions: selectedOffering.sessionCount || 1,
            validUntil: packageValidUntil?.toISOString() ?? null
          }
        : null;

    const checkout = await resolveConsultationCheckout({
      patientId: req.user!.id,
      grossInPaise: partialPayment.payableInPaise
    });
    const chargeGrossInPaise = checkout.grossAmountInPaise;
    const finalPayableInPaise = checkout.payableInPaise;
    const totalDiscountInPaise = offerDiscount.discountInPaise + checkout.discountInPaise;
    const grossRevenueSplit = hopeHubRevenueSplit(amountInPaise);
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
          offeringId: selectedOffering?.id || body.offeringId || '',
          offeringSlug: selectedOffering?.slug || body.offeringSlug || '',
          offeringTitle: selectedOffering?.title || '',
          offeringType: selectedOffering?.type || '',
          providerId: requestedProvider?.id || body.providerId || '',
          requestedProviderName: requestedProvider?.user.name || '',
          concernCategory: body.concernCategory || '',
          preferredExpertType: body.preferredExpertType || '',
          sessionMode: body.sessionMode || '',
          preferredLanguage: body.preferredLanguage || '',
          safetyRisk: body.safetyRisk || '',
          previousTherapyOrMedication: body.previousTherapyOrMedication || '',
          emergencyConsent: Boolean(body.emergencyConsent),
          sessionDuration: `${selectedOffering?.sessionDurationMinutes || HOPE_HUB_SESSION_DURATION_MINUTES} minutes`,
          requestedSessionDuration: body.sessionDuration || '',
          preferredContact: body.preferredContact || '',
          urgencyLevel: body.urgencyLevel || '',
          preferredTime: body.preferredTime || '',
          preferAnonymousTelegram: Boolean(body.preferAnonymousTelegram),
          entryPage: body.entryPage || ''
        },
        billingPlanCode: selectedPlanCode,
        pricingSnapshot: {
          source: 'hope-hub',
          purchaseType: selectedOffering?.type || 'ONE_TIME',
          offeringId: selectedOffering?.id || null,
          offeringCode: selectedOffering?.code || null,
          offeringSlug: selectedOffering?.slug || null,
          offeringTitle: selectedOffering?.title || null,
          serviceName: body.serviceName,
          sessionFeeInPaise: amountInPaise,
          netAfterOfferDiscountInPaise,
          paymentMode: partialPayment.paymentMode,
          balanceDueInPaise: partialPayment.balanceDueInPaise,
          packageUsage,
          sessionDurationMinutes:
            selectedOffering?.sessionDurationMinutes || HOPE_HUB_SESSION_DURATION_MINUTES,
          sessionCount: selectedOffering?.sessionCount || 1,
          validityDays: selectedOffering?.validityDays || null,
          grossRevenueSplit,
          payableRevenueSplit,
          checkout: {
            ...checkout,
            packageGrossInPaise: amountInPaise,
            chargeGrossInPaise,
            offerDiscountInPaise: offerDiscount.discountInPaise,
            checkoutDiscountInPaise: checkout.discountInPaise,
            totalDiscountInPaise,
            payableTodayInPaise: finalPayableInPaise,
            balanceDueInPaise: partialPayment.balanceDueInPaise,
            paymentMode: partialPayment.paymentMode
          },
          offerDiscountRule: offerDiscount.rule,
          partialPaymentRule: partialPayment.partialRule
        },
        payment: {
          create: {
            grossAmountInPaise: chargeGrossInPaise,
            discountInPaise: checkout.discountInPaise,
            walletRedeemedInPaise: checkout.walletRedeemedInPaise,
            amountInPaise: finalPayableInPaise,
            billingPlanCode: selectedPlanCode,
            appliedRules: checkout.appliedRules,
            lineItems: {
              source: 'hope-hub',
              serviceName: body.serviceName,
              offeringId: selectedOffering?.id || null,
              offeringCode: selectedOffering?.code || null,
              offeringSlug: selectedOffering?.slug || null,
              offeringTitle: selectedOffering?.title || null,
              offeringType: selectedOffering?.type || null,
              providerId: requestedProvider?.id || body.providerId || '',
              requestedProviderName: requestedProvider?.user.name || '',
              sessionDurationMinutes:
                selectedOffering?.sessionDurationMinutes || HOPE_HUB_SESSION_DURATION_MINUTES,
              sessionCount: selectedOffering?.sessionCount || 1,
              validityDays: selectedOffering?.validityDays || null,
              packageGrossInPaise: amountInPaise,
              consultationFeeInPaise: chargeGrossInPaise,
              offerDiscountInPaise: offerDiscount.discountInPaise,
              checkoutDiscountInPaise: checkout.discountInPaise,
              discountInPaise: totalDiscountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              netAfterOfferDiscountInPaise,
              paymentMode: partialPayment.paymentMode,
              payableTodayInPaise: finalPayableInPaise,
              balanceDueInPaise: partialPayment.balanceDueInPaise,
              packageUsage,
              payableInPaise: finalPayableInPaise,
              grossRevenueSplit,
              payableRevenueSplit,
              planCode: selectedPlanCode,
              planName: selectedPlanName,
              offerDiscountRule: offerDiscount.rule,
              partialPaymentRule: partialPayment.partialRule,
              appliedRules: [
                offerDiscount.rule,
                partialPayment.partialRule,
                ...checkout.appliedRules
              ].filter(Boolean)
            },
            status: PaymentStatus.CREATED
          }
        }
      },
      include: includeConsultationRelations()
    });

    if (requestedSlot) {
      await prisma.doctorSlot.update({
        where: { id: requestedSlot.id },
        data: { isBooked: true }
      });
    }

    await prisma.websiteLead.create({
      data: {
        source: 'HOME_BOOKING',
        followUpStatus: 'BOOKED',
        visitorName: body.visitorName || req.user!.name,
        visitorEmail: body.visitorEmail || req.user!.email,
        visitorPhone: body.visitorPhone || req.user!.mobile,
        concern: [
          `Service: ${body.serviceName}`,
          selectedOffering ? `Offer: ${selectedOffering.title}` : '',
          `Appointment: ${body.appointmentDate} ${body.appointmentTime}`,
          body.preferredContact ? `Preferred contact: ${body.preferredContact}` : '',
          body.urgencyLevel ? `Urgency: ${body.urgencyLevel}` : '',
          body.concernCategory ? `Concern category: ${body.concernCategory}` : '',
          body.preferredExpertType ? `Preferred expert: ${body.preferredExpertType}` : '',
          body.preferredLanguage ? `Preferred language: ${body.preferredLanguage}` : '',
          body.safetyRisk ? `Safety risk: ${body.safetyRisk}` : '',
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
        offeringId: selectedOffering?.id ?? '',
        offeringCode: selectedOffering?.code ?? '',
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
    const assignedUserIds = Array.from(
      new Set(consultations.map((c) => c.assignedDoctorId).filter(Boolean) as string[])
    );
    const assignedProfiles = assignedUserIds.length
      ? await prisma.doctor.findMany({
          where: { userId: { in: assignedUserIds } },
          select: { id: true, userId: true }
        })
      : [];
    const providerIdByUserId = new Map(
      assignedProfiles.map((profile) => [profile.userId, profile.id] as const)
    );

    const leads = await prisma.websiteLead.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      consultations: consultations.map((consultation) => ({
        ...consultation,
        assignedProviderId: consultation.assignedDoctorId
          ? providerIdByUserId.get(consultation.assignedDoctorId) || null
          : null
      })),
      leads
    });
  })
);
