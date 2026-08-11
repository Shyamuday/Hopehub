import { Router } from 'express';
import { z } from 'zod';
import {
  CareTeamServicePricingMode,
  ConsultationMode,
  ConsultationStatus,
  FollowUpEntitlementStatus,
  HomeopathicDoctorType,
  HopeHubOfferingType,
  LivePresenceStatus,
  PaymentStatus,
  Role
} from '@prisma/client';
import { authOptional, authRequired, allowRoles } from '../auth.js';
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
import {
  HOPE_HUB_EVENTS,
  PRODUCT_EVENTS,
  trackProductEvent
} from '../services/product-analytics.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../utils/profile-image-url.js';
import { hopeHubMediaMimeType, readHopeHubMediaFile } from '../services/hope-hub-media-storage.js';
import {
  assertAssessmentAccess,
  getAssessmentDefinition,
  scoreAssessment
} from '../services/assessment-definitions.js';
import { isFirstPaidConsultation } from '../services/referral-codes.js';
import { getSiteConfigMap, getSiteConfigValue } from '../services/site-config.service.js';
import { upsertProviderEarningForPayment } from '../services/provider-earnings.js';
import { settleConsultationPaymentRewards } from '../services/reward-settlement.js';
import { notifyConsultationBooked } from '../services/consultation-reminders.js';
import { markDoctorBusy } from '../services/online-doctor-presence.js';
import { emitHopeHubLiveGroupMessage } from '../services/hope-hub-live-groups-realtime.js';
import { providerPublicReadiness } from '../doctor-capabilities.js';

export const hopeHubRouter = Router();

const HOPE_HUB_SESSION_FEE_IN_PAISE = 50000;
const HOPE_HUB_SESSION_DURATION_MINUTES = 30;
const HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT = 50;
const HOPE_HUB_PLATFORM_SHARE_PERCENT = 100 - HOPE_HUB_PSYCHOLOGIST_SHARE_PERCENT;

type HopeHubPublicDefaults = {
  serviceName: string;
  sessionPriceInPaise: number;
  sessionDurationMinutes: number;
  sessionLabel: string;
  careRoleLabel: string;
};

function positiveConfigInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

async function hopeHubPublicDefaults(): Promise<HopeHubPublicDefaults> {
  const config = await getSiteConfigMap([
    'hopeHubDefaultServiceName',
    'hopeHubDefaultSessionPriceInPaise',
    'hopeHubDefaultSessionDurationMinutes',
    'hopeHubDefaultSessionLabel',
    'hopeHubDefaultCareRoleLabel'
  ]);
  const duration = positiveConfigInt(
    config.hopeHubDefaultSessionDurationMinutes,
    HOPE_HUB_SESSION_DURATION_MINUTES
  );
  return {
    serviceName: config.hopeHubDefaultServiceName?.trim() || 'Mental wellness session',
    sessionPriceInPaise: positiveConfigInt(
      config.hopeHubDefaultSessionPriceInPaise,
      HOPE_HUB_SESSION_FEE_IN_PAISE
    ),
    sessionDurationMinutes: duration,
    sessionLabel: config.hopeHubDefaultSessionLabel?.trim() || `${duration} minutes`,
    careRoleLabel: config.hopeHubDefaultCareRoleLabel?.trim() || 'Hope Hub care guide'
  };
}

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
  careTeamServiceId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  offeringId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  offeringSlug: z.string().trim().min(1).max(160).optional().or(z.literal('')),
  paymentMode: z.enum(['FULL', 'PARTIAL']).optional(),
  promoCode: z.string().trim().min(2).max(32).optional().or(z.literal('')),
  walletRedeemInPaise: z.number().int().min(0).optional(),
  concernCategory: z.string().trim().max(160).optional().or(z.literal('')),
  preferredExpertType: z.string().trim().max(160).optional().or(z.literal('')),
  sessionMode: z.string().trim().max(80).optional().or(z.literal('')),
  preferredLanguage: z.string().trim().max(80).optional().or(z.literal('')),
  preferredProviderGender: z
    .enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .optional()
    .nullable(),
  safetyRisk: z.string().trim().max(80).optional().or(z.literal('')),
  previousTherapyOrMedication: z.string().trim().max(1000).optional().or(z.literal('')),
  emergencyConsent: z.boolean().optional(),
  listenerSupportConsent: z.boolean().optional().default(false),
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

const hopeHubQuickTalkSchema = z.object({
  providerId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  careTeamServiceId: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  message: z.string().trim().max(3000).optional().or(z.literal('')),
  concernCategory: z.string().trim().max(160).optional().or(z.literal('')),
  preferredExpertType: z.string().trim().max(160).optional().or(z.literal('')),
  sessionMode: z.string().trim().max(80).optional().or(z.literal('online_voice')),
  preferredLanguage: z.string().trim().max(80).optional().or(z.literal('')),
  preferredProviderGender: z
    .enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .optional()
    .nullable(),
  safetyRisk: z.string().trim().max(80).optional().or(z.literal('')),
  previousTherapyOrMedication: z.string().trim().max(1000).optional().or(z.literal('')),
  emergencyConsent: z.boolean().optional(),
  listenerSupportConsent: z.boolean().optional().default(false),
  walletRedeemInPaise: z.number().int().min(0).optional(),
  promoCode: z.string().trim().min(2).max(32).optional().or(z.literal('')),
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

const hopeHubLiveGroupCreateSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().min(3).max(160).optional().or(z.literal('')),
  description: z.string().trim().max(1200).optional().or(z.literal('')),
  callTitle: z.string().trim().max(140).optional().or(z.literal('')),
  callAgenda: z.string().trim().max(1200).optional().or(z.literal('')),
  mode: z.enum(['CHAT', 'VOICE', 'VIDEO']).optional(),
  status: z.enum(['LIVE', 'SCHEDULED']).optional()
});

const hopeHubLiveGroupMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

const hopeHubLiveGroupModeSchema = z.object({
  mode: z.enum(['CHAT', 'VOICE', 'VIDEO'])
});

const hopeHubLiveGroupDetailsSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(1200).optional().or(z.literal('')),
  callTitle: z.string().trim().max(140).optional().or(z.literal('')),
  callAgenda: z.string().trim().max(1200).optional().or(z.literal('')),
  pinnedMessage: z.string().trim().max(1200).optional().or(z.literal('')),
  roomRules: z.string().trim().max(2000).optional().or(z.literal('')),
  slowModeSeconds: z.number().int().min(0).max(300).optional()
});

const hopeHubLiveGroupModerationSchema = z.object({
  userId: z.string().trim().min(1).max(160),
  displayName: z.string().trim().max(160).optional().or(z.literal('')),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  action: z.enum(['MUTE', 'UNMUTE', 'BAN', 'UNBAN', 'REMOVE']),
  mutedMinutes: z.number().int().min(1).max(10080).optional(),
  reason: z.string().trim().max(1000).optional().or(z.literal(''))
});

const hopeHubLiveGroupReportSchema = z.object({
  messageId: z.string().trim().max(160).optional().or(z.literal('')),
  targetUserId: z.string().trim().max(160).optional().or(z.literal('')),
  targetDisplayName: z.string().trim().max(160).optional().or(z.literal('')),
  reason: z.string().trim().min(2).max(120),
  details: z.string().trim().max(1200).optional().or(z.literal(''))
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

function minutesBetweenTimes(start: string, end: string) {
  const [startHour = 0, startMinute = 0] = start.split(':').map(Number);
  const [endHour = 0, endMinute = 0] = end.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function periodForTime(value: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(time24HourFromDisplay(value).split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function appointmentDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcWeekRange(date: Date) {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addUtcDays(date, mondayOffset);
  const end = addUtcDays(start, 7);
  return { start, end };
}

async function providerBookingCapacityStatus(doctorId: string, appointmentDate: string) {
  const profile = await prisma.mentalHealthProviderProfile.findUnique({
    where: { doctorId },
    select: {
      acceptingNewUsers: true,
      maxSessionsPerDay: true,
      maxSessionsPerWeek: true
    }
  });

  if (!profile) return { available: true, message: '' };
  if (!profile.acceptingNewUsers) {
    return { available: false, message: 'This expert is not accepting new bookings right now.' };
  }

  const date = appointmentDateOnly(appointmentDate);
  if (!date) return { available: true, message: '' };

  if (profile.maxSessionsPerDay) {
    const dayBookedCount = await prisma.doctorSlot.count({
      where: { doctorId, date, isBooked: true, isBlocked: false }
    });
    if (dayBookedCount >= profile.maxSessionsPerDay) {
      return {
        available: false,
        message: 'This expert has reached their booking limit for the selected day.'
      };
    }
  }

  if (profile.maxSessionsPerWeek) {
    const { start, end } = utcWeekRange(date);
    const weekBookedCount = await prisma.doctorSlot.count({
      where: {
        doctorId,
        isBooked: true,
        isBlocked: false,
        date: { gte: start, lt: end }
      }
    });
    if (weekBookedCount >= profile.maxSessionsPerWeek) {
      return {
        available: false,
        message: 'This expert has reached their booking limit for the selected week.'
      };
    }
  }

  return { available: true, message: '' };
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
  grossInPaise: number,
  options: { isFirstPaidConsultation?: boolean } = {}
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
  if (offering.code === 'SINGLE_30' && options.isFirstPaidConsultation === false) {
    return {
      discountInPaise: 0,
      rule: {
        source: 'hope-hub-offering',
        offeringId: offering.id,
        offeringCode: offering.code,
        type: offering.discountType,
        label: 'First session offer already used',
        code: offering.discountCode || null,
        percent: offering.discountPercent,
        flatInPaise: offering.discountFlatInPaise,
        maxInPaise: offering.discountMaxInPaise,
        startsAt: offering.discountStartsAt?.toISOString() ?? null,
        endsAt: offering.discountEndsAt?.toISOString() ?? null,
        amountInPaise: 0,
        skippedReason: 'FIRST_PAID_CONSULTATION_ONLY'
      }
    };
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

type CareTeamServicePricingInput = {
  id: string;
  pricingMode: CareTeamServicePricingMode;
  priceInPaise: number;
  firstSessionPriceInPaise: number | null;
  followUpPriceInPaise: number | null;
  introSessionLimit: number;
  packageSessionCount: number | null;
  packagePriceInPaise: number | null;
  freeMinutes: number;
  pricePerMinuteInPaise: number | null;
  isFree: boolean;
  durationMinutes: number;
};

function rupeeLabel(amountInPaise: number) {
  return amountInPaise <= 0 ? 'Free' : `₹${Math.round(amountInPaise / 100)}`;
}

function careTeamServicePricingPreview(service: CareTeamServicePricingInput, previousUseCount = 0) {
  const introLimit = Math.max(1, service.introSessionLimit || 1);
  const basePrice = service.isFree ? 0 : Math.max(0, service.priceInPaise || 0);
  const firstPrice = Math.max(0, service.firstSessionPriceInPaise ?? basePrice);
  const followUpPrice = Math.max(0, service.followUpPriceInPaise ?? basePrice);
  const packagePrice = Math.max(0, service.packagePriceInPaise ?? basePrice);
  const packageSessions = Math.max(1, service.packageSessionCount ?? 1);
  const freeMinutes = Math.max(0, service.freeMinutes || 0);
  const billableMinutes = Math.max(0, (service.durationMinutes || 0) - freeMinutes);
  const pricePerMinute = Math.max(0, service.pricePerMinuteInPaise ?? 0);
  const perMinutePrice = billableMinutes * pricePerMinute;
  const introAvailable = previousUseCount < introLimit;

  switch (service.pricingMode) {
    case CareTeamServicePricingMode.FREE_VOLUNTEER:
      return {
        amountInPaise: 0,
        label: 'Free emotional support listener support',
        appliedRule: 'FREE_VOLUNTEER',
        sessionCount: 1
      };
    case CareTeamServicePricingMode.FREE_INTRO:
      return {
        amountInPaise: introAvailable ? 0 : followUpPrice,
        label: introAvailable
          ? `First session free, then ${rupeeLabel(followUpPrice)}`
          : `Follow-up ${rupeeLabel(followUpPrice)}`,
        appliedRule: introAvailable ? 'FREE_INTRO' : 'FOLLOW_UP_PRICE',
        sessionCount: 1
      };
    case CareTeamServicePricingMode.DISCOUNTED_FIRST:
      return {
        amountInPaise: introAvailable ? firstPrice : followUpPrice,
        label: introAvailable
          ? `First session ${rupeeLabel(firstPrice)}, then ${rupeeLabel(followUpPrice)}`
          : `Follow-up ${rupeeLabel(followUpPrice)}`,
        appliedRule: introAvailable ? 'DISCOUNTED_FIRST' : 'FOLLOW_UP_PRICE',
        sessionCount: 1
      };
    case CareTeamServicePricingMode.PACKAGE:
      return {
        amountInPaise: packagePrice,
        label: `${packageSessions} session package · ${rupeeLabel(packagePrice)}`,
        appliedRule: 'PACKAGE_PRICE',
        sessionCount: packageSessions
      };
    case CareTeamServicePricingMode.PER_MINUTE:
      return {
        amountInPaise: perMinutePrice,
        label:
          freeMinutes > 0
            ? `First ${freeMinutes} min free, then ${rupeeLabel(pricePerMinute)}/min · ${billableMinutes} billable min`
            : `${rupeeLabel(pricePerMinute)}/min · ${billableMinutes} min`,
        appliedRule: 'PER_MINUTE_PRICE',
        sessionCount: 1
      };
    case CareTeamServicePricingMode.FIXED:
    default:
      return {
        amountInPaise: basePrice,
        label: basePrice <= 0 ? 'Free' : `Fixed ${rupeeLabel(basePrice)}`,
        appliedRule: 'FIXED_PRICE',
        sessionCount: 1
      };
  }
}

function quickTalkSessionPricingLabel(
  service: CareTeamServicePricingInput | null,
  pricing: ReturnType<typeof careTeamServicePricingPreview> | null,
  fallbackDurationMinutes: number,
  fallbackAmountInPaise: number
) {
  const durationMinutes = service?.durationMinutes || fallbackDurationMinutes;
  const amountInPaise = pricing?.amountInPaise ?? fallbackAmountInPaise;
  const sessionLabel = `${durationMinutes} min live session`;
  if (amountInPaise <= 0) return `${sessionLabel} · Free`;
  if (!pricing) return `${sessionLabel} · ${rupeeLabel(amountInPaise)}`;
  if (pricing.appliedRule === 'PACKAGE_PRICE') return `${sessionLabel} · ${pricing.label}`;
  return `${sessionLabel} · ${rupeeLabel(amountInPaise)}`;
}

async function previousCareTeamServiceUseCount(patientId: string, careTeamServiceId: string) {
  const consultations = await prisma.consultation.findMany({
    where: {
      patientId,
      payment: { is: { status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } } }
    },
    select: { pricingSnapshot: true }
  });
  return consultations.filter((consultation) => {
    const snapshot = (consultation.pricingSnapshot || {}) as Record<string, unknown>;
    return snapshot['careTeamServiceId'] === careTeamServiceId;
  }).length;
}

type CareTeamPackageBalance = {
  consultationId: string;
  pricingSnapshot: Record<string, any>;
  packageUsage: Record<string, any>;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
};

function readPackageUsage(snapshot: Record<string, any>) {
  const usage = snapshot['packageUsage'] as Record<string, any> | null | undefined;
  if (!usage) return null;
  const totalSessions = Number(usage['totalSessions'] ?? 0);
  const usedSessions = Number(usage['usedSessions'] ?? 0);
  const remainingSessions = Number(usage['remainingSessions'] ?? 0);
  if (
    !Number.isFinite(totalSessions) ||
    !Number.isFinite(usedSessions) ||
    !Number.isFinite(remainingSessions)
  ) {
    return null;
  }
  return { usage, totalSessions, usedSessions, remainingSessions };
}

async function findActiveCareTeamPackageBalance(patientId: string, careTeamServiceId: string) {
  const consultations = await prisma.consultation.findMany({
    where: {
      patientId,
      payment: { is: { status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } } }
    },
    select: { id: true, pricingSnapshot: true },
    orderBy: { createdAt: 'asc' },
    take: 200
  });
  for (const consultation of consultations) {
    const snapshot = (consultation.pricingSnapshot || {}) as Record<string, any>;
    if (snapshot['careTeamServiceId'] !== careTeamServiceId) continue;
    if (snapshot['careTeamPricingRule'] !== 'PACKAGE_PRICE') continue;
    const parsed = readPackageUsage(snapshot);
    if (!parsed || parsed.remainingSessions <= 0) continue;
    return {
      consultationId: consultation.id,
      pricingSnapshot: snapshot,
      packageUsage: parsed.usage,
      totalSessions: parsed.totalSessions,
      usedSessions: parsed.usedSessions,
      remainingSessions: parsed.remainingSessions
    } satisfies CareTeamPackageBalance;
  }
  return null;
}

function careTeamPackageRedemptionPricing(packageBalance: CareTeamPackageBalance) {
  const remainingAfterThis = Math.max(0, packageBalance.remainingSessions - 1);
  return {
    amountInPaise: 0,
    label: `Using package balance · ${remainingAfterThis} session${remainingAfterThis === 1 ? '' : 's'} left after this`,
    appliedRule: 'PACKAGE_SESSION_REDEEMED',
    sessionCount: 1
  };
}

function careTeamServiceSelect() {
  return {
    id: true,
    title: true,
    description: true,
    pricingMode: true,
    priceInPaise: true,
    firstSessionPriceInPaise: true,
    followUpPriceInPaise: true,
    introSessionLimit: true,
    packageSessionCount: true,
    packagePriceInPaise: true,
    freeMinutes: true,
    pricePerMinuteInPaise: true,
    durationMinutes: true,
    isFree: true,
    mentalHealthProfile: {
      select: {
        careTeamType: true,
        careTeamTypes: true,
        doctor: {
          select: {
            id: true,
            userId: true,
            user: { select: { name: true } }
          }
        }
      }
    }
  } as const;
}

async function findAvailableCareTeamService(id: string, providerId?: string) {
  return prisma.careTeamService.findFirst({
    where: {
      id,
      isActive: true,
      mentalHealthProfile: {
        doctor: {
          ...(providerId ? { id: providerId } : {}),
          showOnWebsite: true,
          suspendedAt: null,
          user: { isActive: true }
        }
      }
    },
    select: careTeamServiceSelect()
  });
}

function careTeamRoleDisplay(careTeamType: string, defaultLabel: string) {
  const map: Record<
    string,
    {
      label: string;
      tierLabel: string;
      tone: string;
      description: string;
      scope: string;
      bestFor: string[];
      notFor: string[];
      ctaLabel: string;
      isClinicalCare: boolean;
    }
  > = {
    MENTAL_WELLNESS_PROFESSIONAL: {
      label: 'Verified Mental Health Professional',
      tierLabel: 'Professional care',
      tone: 'professional',
      description: 'Qualified support for structured mental-wellness consultations.',
      scope:
        'Can support structured counselling and mental-wellness care within their qualification.',
      bestFor: ['anxiety or stress support', 'relationship concerns', 'structured counselling'],
      notFor: [
        'medical emergencies',
        'instant diagnosis without assessment',
        'psychiatric prescription'
      ],
      ctaLabel: 'Book consultation',
      isClinicalCare: true
    },
    QUALIFIED_COUNSELLOR: {
      label: 'Qualified Counsellor',
      tierLabel: 'Counselling support',
      tone: 'professional',
      description: 'Trained counselling support for emotional concerns and guided conversations.',
      scope: 'Can provide counselling-style support and practical coping guidance.',
      bestFor: ['emotional clarity', 'stress and relationship support', 'guided coping tools'],
      notFor: ['emergency crisis care', 'medicine or prescription advice', 'formal diagnosis'],
      ctaLabel: 'Book counselling session',
      isClinicalCare: true
    },
    PSYCHOLOGY_STUDENT_VOLUNTEER: {
      label: 'Psychology Student Listener',
      tierLabel: 'Supervised emotional support listener',
      tone: 'student',
      description: 'Student listener support for listening, reflection, and non-clinical guidance.',
      scope: 'Non-clinical support. Works within Hope Hub guidance and escalation rules.',
      bestFor: ['listening support', 'study stress', 'daily emotional check-ins'],
      notFor: ['diagnosis', 'therapy replacement', 'high-risk or emergency concerns'],
      ctaLabel: 'Request student listener support',
      isClinicalCare: false
    },
    PEER_SUPPORT_VOLUNTEER: {
      label: 'Peer Support Listener',
      tierLabel: 'Peer support',
      tone: 'listener',
      description:
        'Lived-experience or peer emotional support listening for safe, human conversation.',
      scope: 'Non-clinical peer listening. Escalates safety concerns to the Hope Hub team.',
      bestFor: ['loneliness', 'breakup recovery', 'motivation and encouragement'],
      notFor: ['clinical treatment', 'diagnosis', 'crisis or emergency support'],
      ctaLabel: 'Request peer support',
      isClinicalCare: false
    },
    NLP_COACH: {
      label: 'NLP Coach',
      tierLabel: 'Coaching support',
      tone: 'coach',
      description: 'Coaching-oriented support for goals, reframing, habits, and confidence.',
      scope: 'Coaching support, not clinical therapy or medical care.',
      bestFor: ['confidence', 'habit change', 'goal clarity'],
      notFor: ['clinical diagnosis', 'emergency care', 'medical treatment'],
      ctaLabel: 'Book coaching session',
      isClinicalCare: false
    },
    LIFE_COACH: {
      label: 'Life Coach',
      tierLabel: 'Coaching support',
      tone: 'coach',
      description: 'Practical coaching for decisions, motivation, routines, and life direction.',
      scope: 'Coaching support, not clinical therapy or medical care.',
      bestFor: ['life direction', 'motivation', 'routine planning'],
      notFor: ['diagnosis', 'prescription', 'crisis intervention'],
      ctaLabel: 'Book coaching session',
      isClinicalCare: false
    },
    MEDITATION_BREATHWORK_GUIDE: {
      label: 'Meditation / Breathwork Guide',
      tierLabel: 'Wellness guide',
      tone: 'wellness',
      description: 'Guided relaxation, breathwork, mindfulness, and grounding support.',
      scope: 'Wellness practice guidance. Not a replacement for mental-health treatment.',
      bestFor: ['relaxation', 'breathing practice', 'mindfulness routines'],
      notFor: ['acute panic emergency', 'clinical treatment', 'medical advice'],
      ctaLabel: 'Book guided practice',
      isClinicalCare: false
    },
    CAREER_STUDY_MENTOR: {
      label: 'Career / Study Mentor',
      tierLabel: 'Mentor support',
      tone: 'mentor',
      description: 'Mentoring support for study pressure, focus, confidence, and career direction.',
      scope: 'Mentoring and practical guidance. Not clinical counselling.',
      bestFor: ['study stress', 'career confusion', 'focus and planning'],
      notFor: ['clinical therapy', 'diagnosis', 'emergency support'],
      ctaLabel: 'Book mentoring session',
      isClinicalCare: false
    }
  };

  return (
    map[careTeamType] || {
      label: defaultLabel,
      tierLabel: 'Hope Hub support',
      tone: 'support',
      description: 'Hope Hub support for emotional wellness and guided conversation.',
      scope: 'Support scope depends on the person’s qualification and service.',
      bestFor: ['emotional support', 'wellness guidance'],
      notFor: ['emergency care', 'medical crisis'],
      ctaLabel: 'Book session',
      isClinicalCare: false
    }
  );
}

function isListenerCareTeamType(careTeamType: string | null | undefined) {
  return (
    careTeamType === 'PSYCHOLOGY_STUDENT_VOLUNTEER' || careTeamType === 'PEER_SUPPORT_VOLUNTEER'
  );
}

function normalizedCareTeamTypes(
  mental?: {
    careTeamType?: string | null;
    careTeamTypes?: string[] | null;
  } | null
) {
  const types = mental?.careTeamTypes?.length
    ? mental.careTeamTypes
    : mental?.careTeamType
      ? [mental.careTeamType]
      : [];
  return Array.from(new Set(types));
}

function providerPublicPayload(
  provider: {
    id: string;
    specialty: string;
    designation: string | null;
    department: string | null;
    bio: string | null;
    yearsOfExperience: number | null;
    focusAreas: string[];
    mentalHealthProfile?: {
      careTeamType: string;
      careTeamTypes?: string[];
      qualifications: string[];
      qualifiedFrom: string | null;
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
      autoMatchEnabled: boolean;
      acceptingNewUsers: boolean;
      maxSessionsPerDay: number | null;
      maxSessionsPerWeek: number | null;
      services: Array<{
        id: string;
        title: string;
        description: string | null;
        pricingMode: CareTeamServicePricingMode;
        priceInPaise: number;
        firstSessionPriceInPaise: number | null;
        followUpPriceInPaise: number | null;
        introSessionLimit: number;
        packageSessionCount: number | null;
        packagePriceInPaise: number | null;
        freeMinutes: number;
        pricePerMinuteInPaise: number | null;
        currency: string;
        durationMinutes: number;
        isFree: boolean;
        isActive: boolean;
        sortOrder: number;
      }>;
    } | null;
    user: {
      id: string;
      name: string;
      gender: string | null;
      profileImageKey: string | null;
      profileImageUrl?: string | null;
    };
  },
  defaults: HopeHubPublicDefaults
) {
  const user = enrichWithProfileImageUrl(provider.user, userProfileImagePath);
  const focusAreas = provider.focusAreas || [];
  const mental = provider.mentalHealthProfile;
  const providerText = [
    provider.specialty,
    provider.designation,
    provider.department,
    ...focusAreas,
    ...(mental?.qualifications ?? []),
    ...(mental?.modalities ?? []),
    ...(mental?.sessionTypes ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const careTeamTypes = normalizedCareTeamTypes(mental);
  const careTeamType = careTeamTypes[0] ?? mental?.careTeamType ?? 'MENTAL_WELLNESS_PROFESSIONAL';
  const supportRole = careTeamType;
  const roleDisplay = careTeamRoleDisplay(careTeamType, defaults.careRoleLabel);
  const isScreenedListener = careTeamTypes.some((type) => isListenerCareTeamType(type));
  const activeServices = (mental?.services ?? [])
    .filter((service) => service.isActive)
    .map((service) => {
      const price = careTeamServicePricingPreview(service, 0);
      return {
        ...service,
        effectivePriceInPaise: price.amountInPaise,
        pricingLabel: price.label,
        pricingRule: price.appliedRule,
        effectiveSessionCount: price.sessionCount
      };
    });
  const primaryService = activeServices[0];
  return {
    id: provider.id,
    slug: `${slugify(user.name || provider.designation || provider.specialty || 'expert')}-${provider.id}`,
    userId: user.id,
    name: user.name,
    gender: user.gender,
    profileImageUrl: user.profileImageUrl,
    specialty: provider.specialty,
    designation: provider.designation,
    department: provider.department,
    supportRole,
    supportRoleLabel: roleDisplay.label,
    supportTierLabel: roleDisplay.tierLabel,
    supportTierTone: roleDisplay.tone,
    supportRoleDescription: roleDisplay.description,
    supportScope: roleDisplay.scope,
    supportBestFor: roleDisplay.bestFor,
    supportNotFor: roleDisplay.notFor,
    bookingCtaLabel: roleDisplay.ctaLabel,
    isClinicalCare: roleDisplay.isClinicalCare,
    isScreenedListener,
    listenerTrustLabel: isScreenedListener ? 'Screened emotional support listener' : null,
    listenerTrustNote: isScreenedListener
      ? 'Passed Hope Hub listener screening and follows non-clinical safety guidelines.'
      : null,
    careTeamType,
    careTeamTypes,
    bio: provider.bio,
    yearsOfExperience: provider.yearsOfExperience,
    focusAreas,
    qualifications: mental?.qualifications ?? [],
    qualifiedFrom: mental?.qualifiedFrom ?? null,
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
    autoMatchEnabled: mental?.autoMatchEnabled ?? true,
    acceptingNewUsers: mental?.acceptingNewUsers ?? true,
    maxSessionsPerDay: mental?.maxSessionsPerDay ?? null,
    maxSessionsPerWeek: mental?.maxSessionsPerWeek ?? null,
    services: activeServices,
    sessionFeeInPaise: primaryService?.effectivePriceInPaise ?? defaults.sessionPriceInPaise,
    sessionDurationMinutes: primaryService?.durationMinutes ?? defaults.sessionDurationMinutes
  };
}

function servicePublicPayload(
  service: {
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
  },
  defaults: HopeHubPublicDefaults
) {
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
    duration: content.duration || defaults.sessionLabel,
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

function mediaMetadataFromOffering(offering: { metadata: unknown }) {
  const metadata = (offering.metadata || {}) as Record<string, unknown>;
  return {
    accessMode: String(metadata['mediaAccessMode'] || 'PUBLIC'),
    accessNote:
      typeof metadata['mediaAccessNote'] === 'string' ? metadata['mediaAccessNote'] : null,
    allowedOfferingIds: Array.isArray(metadata['allowedOfferingIds'])
      ? metadata['allowedOfferingIds'].map(String)
      : [],
    allowedOfferingSlugs: Array.isArray(metadata['allowedOfferingSlugs'])
      ? metadata['allowedOfferingSlugs'].map(String)
      : [],
    allowedOfferingCodes: Array.isArray(metadata['allowedOfferingCodes'])
      ? metadata['allowedOfferingCodes'].map(String)
      : []
  };
}

function mediaLinkCount(metadata: unknown) {
  const data = (metadata || {}) as Record<string, unknown>;
  return [
    data['telegramGroupUrl'],
    data['telegramAudioUrl'],
    data['telegramVideoUrl'],
    data['recordedAudioUrl'],
    data['recordedVideoUrl'],
    data['youtubeUrl']
  ].filter(Boolean).length;
}

function paidStatuses() {
  return [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED];
}

async function resolveOfferingMediaAccess(input: {
  offering: { id: string; code: string; slug: string; metadata: unknown };
  userId?: string | null;
}) {
  const metadata = mediaMetadataFromOffering(input.offering);
  const mode = metadata.accessMode;

  if (mode === 'PUBLIC') {
    return { accessMode: mode, canAccess: true, reason: 'PUBLIC', accessNote: metadata.accessNote };
  }

  if (!input.userId) {
    return {
      accessMode: mode,
      canAccess: false,
      reason: 'LOGIN_REQUIRED',
      accessNote: metadata.accessNote
    };
  }

  if (mode === 'LOGIN_REQUIRED') {
    return {
      accessMode: mode,
      canAccess: true,
      reason: 'SIGNED_IN',
      accessNote: metadata.accessNote
    };
  }

  const allowedIds = new Set([input.offering.id, ...metadata.allowedOfferingIds]);
  const allowedSlugs = new Set([input.offering.slug, ...metadata.allowedOfferingSlugs]);
  const allowedCodes = new Set([input.offering.code, ...metadata.allowedOfferingCodes]);

  const paidConsultations = await prisma.consultation.findMany({
    where: {
      patientId: input.userId,
      payment: { status: { in: paidStatuses() } }
    },
    select: {
      billingPlanCode: true,
      intakeAnswers: true,
      pricingSnapshot: true,
      payment: { select: { billingPlanCode: true, lineItems: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const matched = paidConsultations.some((consultation) => {
    const intake = (consultation.intakeAnswers || {}) as Record<string, unknown>;
    const snapshot = (consultation.pricingSnapshot || {}) as Record<string, unknown>;
    const lineItems = (consultation.payment?.lineItems || {}) as Record<string, unknown>;
    const purchasedIds = [
      snapshot['offeringId'],
      intake['offeringId'],
      lineItems['offeringId']
    ].map((value) => String(value || ''));
    const purchasedSlugs = [
      snapshot['offeringSlug'],
      intake['offeringSlug'],
      lineItems['offeringSlug']
    ].map((value) => String(value || ''));
    const purchasedCodes = [
      consultation.billingPlanCode,
      consultation.payment?.billingPlanCode,
      snapshot['offeringCode'],
      lineItems['offeringCode']
    ].map((value) => String(value || ''));

    return (
      purchasedIds.some((id) => allowedIds.has(id)) ||
      purchasedSlugs.some((slug) => allowedSlugs.has(slug)) ||
      purchasedCodes.some((code) => allowedCodes.has(code))
    );
  });

  return {
    accessMode: mode,
    canAccess: matched,
    reason: matched ? 'PURCHASED' : 'PURCHASE_REQUIRED',
    accessNote: metadata.accessNote
  };
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

async function activeHopeHubBanners() {
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
  return banners.map(bannerPublicPayload);
}

async function activeHopeHubOfferings(params: { type?: string; featured?: boolean } = {}) {
  const normalizedType = Object.values(HopeHubOfferingType).includes(
    params.type as HopeHubOfferingType
  )
    ? (params.type as HopeHubOfferingType)
    : undefined;
  const where = {
    isActive: true,
    ...(normalizedType ? { type: normalizedType } : {}),
    ...(params.featured ? { isFeatured: true } : {})
  };
  const offerings = await prisma.hopeHubOffering.findMany({
    where,
    select: hopeHubOfferingSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
  });
  const seatCounts = await bookedSeatsByOfferingCode(offerings.map((offering) => offering.code));
  return offerings.map((offering) =>
    offeringPublicPayload(offering, seatCounts.get(offering.code) ?? 0)
  );
}

async function activeHopeHubServices() {
  const [services, defaults] = await Promise.all([
    prisma.disease.findMany({
      where: { isActive: true, publicCategory: 'Hope Hub' },
      select: hopeHubServiceSelect,
      orderBy: [{ name: 'asc' }]
    }),
    hopeHubPublicDefaults()
  ]);
  return services.map((service) => servicePublicPayload(service, defaults));
}

function hopeHubProviderWhere(params: {
  q?: string;
  roleGroup?: string;
  concern?: string;
  language?: string;
  modality?: string;
  sessionType?: string;
  ageGroup?: string;
  gender?: string;
  autoMatchOnly?: boolean;
}) {
  const {
    q,
    roleGroup,
    concern,
    language,
    modality,
    sessionType,
    ageGroup,
    gender,
    autoMatchOnly
  } = params;
  const roleGroupTypes: Record<string, string[]> = {
    PROFESSIONAL_CARE: ['MENTAL_WELLNESS_PROFESSIONAL', 'QUALIFIED_COUNSELLOR'],
    COACH_MENTOR: ['NLP_COACH', 'LIFE_COACH', 'MEDITATION_BREATHWORK_GUIDE', 'CAREER_STUDY_MENTOR'],
    EMOTIONAL_LISTENER: ['PSYCHOLOGY_STUDENT_VOLUNTEER', 'PEER_SUPPORT_VOLUNTEER'],
    PROFESSIONALS: ['MENTAL_WELLNESS_PROFESSIONAL'],
    COUNSELLORS: ['QUALIFIED_COUNSELLOR'],
    VOLUNTEERS: ['PSYCHOLOGY_STUDENT_VOLUNTEER', 'PEER_SUPPORT_VOLUNTEER'],
    COACHES: ['NLP_COACH', 'LIFE_COACH'],
    WELLNESS_GUIDES: ['MEDITATION_BREATHWORK_GUIDE'],
    MENTORS: ['CAREER_STUDY_MENTOR']
  };
  const roleTypes = roleGroup ? roleGroupTypes[roleGroup] || [] : [];
  return {
    showOnWebsite: true,
    suspendedAt: null,
    user: {
      isActive: true,
      ...(gender && gender !== 'PREFER_NOT_TO_SAY' ? { gender: gender as any } : {})
    },
    ...(autoMatchOnly ? { isAvailable: true } : {}),
    ...(roleTypes.length ||
    concern ||
    language ||
    modality ||
    sessionType ||
    ageGroup ||
    autoMatchOnly
      ? {
          mentalHealthProfile: {
            is: {
              ...(roleTypes.length
                ? {
                    OR: [
                      { careTeamType: { in: roleTypes as any[] } },
                      { careTeamTypes: { hasSome: roleTypes as any[] } }
                    ]
                  }
                : {}),
              ...(autoMatchOnly ? { autoMatchEnabled: true, acceptingNewUsers: true } : {}),
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
      { specialty: { contains: 'volunteer', mode: 'insensitive' as const } },
      { specialty: { contains: 'peer support', mode: 'insensitive' as const } },
      { designation: { contains: 'psycholog', mode: 'insensitive' as const } },
      { designation: { contains: 'volunteer', mode: 'insensitive' as const } },
      { designation: { contains: 'peer support', mode: 'insensitive' as const } },
      { department: { contains: 'mental', mode: 'insensitive' as const } },
      { department: { contains: 'wellness', mode: 'insensitive' as const } },
      { department: { contains: 'volunteer', mode: 'insensitive' as const } },
      {
        focusAreas: {
          hasSome: [
            'Psychology',
            'Anxiety support',
            'Stress management',
            'Counselling',
            'Volunteer support',
            'Peer support',
            'Non-clinical peer support'
          ]
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
}

async function activeHopeHubProviders(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  roleGroup?: string;
  concern?: string;
  language?: string;
  modality?: string;
  sessionType?: string;
  ageGroup?: string;
  gender?: string;
  autoMatchOnly?: boolean;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.max(1, Math.min(50, params.pageSize ?? 20));
  const where = hopeHubProviderWhere(params);
  const [providers, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
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
            careTeamType: true,
            careTeamTypes: true,
            qualifications: true,
            qualifiedFrom: true,
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
            acceptsHighRiskCases: true,
            autoMatchEnabled: true,
            acceptingNewUsers: true,
            maxSessionsPerDay: true,
            maxSessionsPerWeek: true,
            services: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
              select: {
                id: true,
                title: true,
                description: true,
                pricingMode: true,
                priceInPaise: true,
                firstSessionPriceInPaise: true,
                followUpPriceInPaise: true,
                introSessionLimit: true,
                packageSessionCount: true,
                packagePriceInPaise: true,
                freeMinutes: true,
                pricePerMinuteInPaise: true,
                currency: true,
                durationMinutes: true,
                isFree: true,
                isActive: true,
                sortOrder: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            gender: true,
            profileImageKey: true,
            profileImageUrl: true
          }
        }
      },
      orderBy: [{ websiteOrder: { sort: 'asc', nulls: 'last' } }, { user: { name: 'asc' } }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.doctor.count({ where })
  ]);
  const defaults = await hopeHubPublicDefaults();
  return {
    providers: providers.map((provider) => providerPublicPayload(provider, defaults)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

type HopeHubQuickTalkMode = 'chat' | 'voice' | 'video';

function normalizeQuickTalkMode(value: unknown): HopeHubQuickTalkMode {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('video')) return 'video';
  if (raw.includes('chat') || raw.includes('message')) return 'chat';
  return 'voice';
}

function quickTalkSessionModeLabel(mode: HopeHubQuickTalkMode) {
  if (mode === 'chat') return 'live_chat';
  if (mode === 'video') return 'online_video';
  return 'online_audio';
}

function quickTalkModeWhere(mode: HopeHubQuickTalkMode) {
  if (mode === 'chat') return { acceptsChat: true };
  if (mode === 'video') return { acceptsVideoCall: true };
  return { acceptsVoiceCall: true };
}

function careTeamServiceMatchesQuickTalkMode(
  service: { title?: string | null; description?: string | null },
  mode: HopeHubQuickTalkMode
) {
  const text = `${service.title || ''} ${service.description || ''}`.toLowerCase();
  if (mode === 'chat') return /\b(chat|message|text)\b/.test(text);
  if (mode === 'video') return /\b(video)\b/.test(text);
  return /\b(voice|audio|call)\b/.test(text);
}

function pickQuickTalkCareTeamService<
  T extends { title?: string | null; description?: string | null }
>(services: T[] | undefined, mode: HopeHubQuickTalkMode): T | null {
  const activeServices = services || [];
  return (
    activeServices.find((service) => careTeamServiceMatchesQuickTalkMode(service, mode)) ||
    activeServices[0] ||
    null
  );
}

function hopeHubLiveOnlineSessionWhere(mode: HopeHubQuickTalkMode = 'voice') {
  return {
    is: {
      enabled: true,
      liveStatus: LivePresenceStatus.ONLINE,
      ...quickTalkModeWhere(mode),
      lastHeartbeatAt: { gte: new Date(Date.now() - 90_000) }
    }
  };
}

async function activeLiveHopeHubProviders(params: {
  q?: string;
  roleGroup?: string;
  concern?: string;
  language?: string;
  modality?: string;
  sessionType?: string;
  ageGroup?: string;
  gender?: string;
  mode?: string;
}) {
  const mode = normalizeQuickTalkMode(params.mode);
  const providerResponse = await activeHopeHubProviders({
    ...params,
    page: 1,
    pageSize: 50,
    autoMatchOnly: true
  });
  const providerUserIds = providerResponse.providers.map((provider) => provider.userId);
  if (!providerUserIds.length) return [];

  const sessions = await prisma.doctorOnlineSession.findMany({
    where: {
      userId: { in: providerUserIds },
      enabled: true,
      liveStatus: LivePresenceStatus.ONLINE,
      ...quickTalkModeWhere(mode),
      lastHeartbeatAt: { gte: new Date(Date.now() - 90_000) }
    },
    select: {
      userId: true,
      liveStatus: true,
      wentLiveAt: true,
      acceptsChat: true,
      acceptsVoiceCall: true,
      acceptsVideoCall: true
    }
  });
  const liveByUserId = new Map(sessions.map((session) => [session.userId, session]));

  return providerResponse.providers
    .filter((provider) => liveByUserId.has(provider.userId))
    .map((provider) => {
      const session = liveByUserId.get(provider.userId)!;
      return {
        ...provider,
        quickTalkAvailable: true,
        liveStatus: session.liveStatus,
        acceptsChat: session.acceptsChat,
        acceptsVoiceCall: session.acceptsVoiceCall,
        acceptsVideoCall: session.acceptsVideoCall,
        liveConnectMode: mode,
        wentLiveAt: session.wentLiveAt?.toISOString() ?? null
      };
    });
}

async function findLiveHopeHubProviderForQuickTalk(params: {
  providerId?: string;
  roleGroup?: string;
  concern?: string;
  language?: string;
  gender?: string | null;
  mode?: string;
}) {
  const mode = normalizeQuickTalkMode(params.mode);
  return prisma.doctor.findFirst({
    where: {
      ...hopeHubProviderWhere({
        roleGroup: params.roleGroup,
        concern: params.concern,
        language: params.language,
        gender: params.gender || undefined,
        autoMatchOnly: true
      }),
      ...(params.providerId ? { id: params.providerId } : {}),
      onlineSession: hopeHubLiveOnlineSessionWhere(mode)
    },
    select: {
      id: true,
      userId: true,
      user: { select: { name: true } },
      mentalHealthProfile: {
        select: {
          careTeamType: true,
          careTeamTypes: true,
          services: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: careTeamServiceSelect()
          }
        }
      }
    },
    orderBy: [{ websiteOrder: 'asc' }, { updatedAt: 'desc' }]
  });
}

function publicOfferingQuote(offering: Awaited<ReturnType<typeof activeHopeHubOfferings>>[number]) {
  if (offering.priceInPaise == null) {
    return {
      grossInPaise: null,
      discountInPaise: 0,
      payableInPaise: null,
      isEligibleForDiscount: false,
      reason: 'CUSTOM_QUOTE',
      rule: null
    };
  }
  const discount = hopeHubDiscountSnapshot(
    {
      ...offering,
      discountStartsAt: offering.discountStartsAt ? new Date(offering.discountStartsAt) : null,
      discountEndsAt: offering.discountEndsAt ? new Date(offering.discountEndsAt) : null
    },
    offering.priceInPaise
  );
  return {
    grossInPaise: offering.priceInPaise,
    discountInPaise: discount.discountInPaise,
    payableInPaise: offering.priceInPaise - discount.discountInPaise,
    isEligibleForDiscount: discount.discountInPaise > 0,
    reason:
      discount.discountInPaise > 0
        ? 'DISCOUNT_APPLIED'
        : discount.rule?.skippedReason || 'NO_DISCOUNT',
    rule: discount.rule
  };
}

function serializeLiveGroup(group: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  callTitle?: string | null;
  callAgenda?: string | null;
  pinnedMessage?: string | null;
  roomRules?: string | null;
  status: string;
  mode: string;
  slowModeSeconds?: number;
  hostUserId: string | null;
  isPublic: boolean;
  startsAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages?: number };
  messages?: Array<{
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    senderRole: string | null;
    body: string;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    deletedByUserId?: string | null;
    createdAt: Date;
  }>;
}) {
  const lastMessage = group.messages?.[0] ? serializeLiveGroupMessage(group.messages[0]) : null;
  return {
    id: group.id,
    title: group.title,
    slug: group.slug,
    description: group.description,
    callTitle: group.callTitle ?? null,
    callAgenda: group.callAgenda ?? null,
    pinnedMessage: group.pinnedMessage ?? null,
    roomRules: group.roomRules ?? null,
    status: group.status,
    mode: group.mode,
    slowModeSeconds: group.slowModeSeconds ?? 0,
    hostUserId: group.hostUserId,
    isPublic: group.isPublic,
    startsAt: group.startsAt?.toISOString() ?? null,
    endedAt: group.endedAt?.toISOString() ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    messageCount: group._count?.messages ?? 0,
    lastMessage
  };
}

function serializeLiveGroupMessage(message: {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  body: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedByUserId?: string | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    groupId: message.groupId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    body: message.isDeleted ? 'Message removed by moderator.' : message.body,
    isDeleted: Boolean(message.isDeleted),
    deletedAt: message.deletedAt?.toISOString() ?? null,
    deletedByUserId: message.deletedByUserId ?? null,
    createdAt: message.createdAt.toISOString()
  };
}

async function liveGroupModerationFor(groupId: string, userId: string) {
  return prisma.hopeHubLiveGroupMemberModeration.findUnique({
    where: { groupId_userId: { groupId, userId } }
  });
}

function isMuted(moderation: Awaited<ReturnType<typeof liveGroupModerationFor>>) {
  if (!moderation?.isMuted) return false;
  return !moderation.mutedUntil || moderation.mutedUntil > new Date();
}

function moderationSummary(moderation: Awaited<ReturnType<typeof liveGroupModerationFor>>) {
  return {
    isMuted: isMuted(moderation),
    mutedUntil: moderation?.mutedUntil?.toISOString() ?? null,
    isBanned: Boolean(moderation?.isBanned),
    removedAt: moderation?.removedAt?.toISOString() ?? null,
    reason: moderation?.reason ?? null
  };
}

hopeHubRouter.get(
  '/hope-hub/live-groups',
  authOptional,
  asyncRoute(async (_req, res) => {
    const groups = await prisma.hopeHubLiveGroup.findMany({
      where: {
        isActive: true,
        isPublic: true,
        status: { in: ['LIVE', 'SCHEDULED'] }
      },
      include: {
        _count: { select: { messages: true } },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
    });

    res.json({ groups: groups.map(serializeLiveGroup) });
  })
);

hopeHubRouter.post(
  '/hope-hub/live-groups',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const body = hopeHubLiveGroupCreateSchema.parse(req.body);
    const baseSlug = slugify(body.slug || body.title);
    const slug = baseSlug || `live-group-${Date.now()}`;
    const existing = await prisma.hopeHubLiveGroup.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ message: 'A live group with this slug already exists.' });
    }

    const group = await prisma.hopeHubLiveGroup.create({
      data: {
        title: body.title,
        slug,
        description: body.description || null,
        callTitle: body.callTitle || body.title,
        callAgenda: body.callAgenda || null,
        status: body.status || 'LIVE',
        mode: 'CHAT',
        hostUserId: req.user?.id,
        createdByUserId: req.user?.id,
        startsAt: body.status === 'SCHEDULED' ? null : new Date()
      }
    });

    res.status(201).json({ group: serializeLiveGroup(group) });
  })
);

hopeHubRouter.get(
  '/hope-hub/live-groups/:id',
  authOptional,
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      },
      include: { _count: { select: { messages: true } } }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });
    const moderation = req.user ? await liveGroupModerationFor(group.id, req.user.id) : null;
    if (moderation?.isBanned) {
      return res.status(403).json({ message: 'You are banned from this group room.' });
    }

    const messages = await prisma.hopeHubLiveGroupMessage.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    res.json({
      group: serializeLiveGroup(group),
      messages: messages.map(serializeLiveGroupMessage),
      requiresLoginToSpeak: !req.user,
      moderation: moderationSummary(moderation)
    });
  })
);

hopeHubRouter.post(
  '/hope-hub/live-groups/:id/messages',
  authRequired,
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = hopeHubLiveGroupMessageSchema.parse(req.body);
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true,
        status: { in: ['LIVE', 'SCHEDULED'] }
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });
    const moderation = await liveGroupModerationFor(group.id, req.user!.id);
    if (moderation?.isBanned) {
      return res.status(403).json({ message: 'You are banned from this group room.' });
    }
    if (isMuted(moderation)) {
      return res.status(403).json({ message: 'You are muted in this group room.' });
    }
    if (group.slowModeSeconds > 0) {
      const recentMessage = await prisma.hopeHubLiveGroupMessage.findFirst({
        where: {
          groupId: group.id,
          senderId: req.user!.id,
          createdAt: { gt: new Date(Date.now() - group.slowModeSeconds * 1000) }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (recentMessage) {
        return res.status(429).json({
          message: `Slow mode is on. Please wait ${group.slowModeSeconds} seconds between messages.`
        });
      }
    }

    const message = await prisma.hopeHubLiveGroupMessage.create({
      data: {
        groupId: group.id,
        senderId: req.user!.id,
        senderName: req.user!.name,
        senderRole: req.user!.role,
        body: body.body
      }
    });
    const payload = serializeLiveGroupMessage(message);
    emitHopeHubLiveGroupMessage(group.id, payload);
    res.status(201).json({ message: payload });
  })
);

hopeHubRouter.post(
  '/hope-hub/live-groups/:id/reports',
  authRequired,
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = hopeHubLiveGroupReportSchema.parse(req.body);
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });

    const messageId = body.messageId || null;
    let message: {
      id: string;
      senderId: string;
      senderName: string;
    } | null = null;

    if (messageId) {
      message = await prisma.hopeHubLiveGroupMessage.findFirst({
        where: { id: messageId, groupId: group.id, isDeleted: false },
        select: { id: true, senderId: true, senderName: true }
      });
      if (!message) return res.status(404).json({ message: 'Message not found.' });
    }

    const report = await prisma.hopeHubLiveGroupReport.create({
      data: {
        groupId: group.id,
        messageId: message?.id ?? null,
        reporterUserId: req.user!.id,
        reporterName: req.user!.name,
        targetUserId: body.targetUserId || message?.senderId || null,
        targetDisplayName: body.targetDisplayName || message?.senderName || null,
        reason: body.reason,
        details: body.details || null
      }
    });

    res.status(201).json({
      report: {
        id: report.id,
        status: report.status,
        createdAt: report.createdAt.toISOString()
      }
    });
  })
);

hopeHubRouter.patch(
  '/hope-hub/live-groups/:id/details',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = hopeHubLiveGroupDetailsSchema.parse(req.body);
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });

    const updated = await prisma.hopeHubLiveGroup.update({
      where: { id: group.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.callTitle !== undefined ? { callTitle: body.callTitle || null } : {}),
        ...(body.callAgenda !== undefined ? { callAgenda: body.callAgenda || null } : {}),
        ...(body.pinnedMessage !== undefined ? { pinnedMessage: body.pinnedMessage || null } : {}),
        ...(body.roomRules !== undefined ? { roomRules: body.roomRules || null } : {}),
        ...(body.slowModeSeconds !== undefined ? { slowModeSeconds: body.slowModeSeconds } : {})
      }
    });

    res.json({ group: serializeLiveGroup(updated) });
  })
);

hopeHubRouter.post(
  '/hope-hub/live-groups/:id/moderation',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = hopeHubLiveGroupModerationSchema.parse(req.body);
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });
    if (body.userId === req.user!.id) {
      return res.status(400).json({ message: 'You cannot moderate yourself.' });
    }

    const now = new Date();
    const mutedUntil =
      body.action === 'MUTE' ? new Date(Date.now() + (body.mutedMinutes ?? 60) * 60 * 1000) : null;
    const moderation = await prisma.hopeHubLiveGroupMemberModeration.upsert({
      where: { groupId_userId: { groupId: group.id, userId: body.userId } },
      create: {
        groupId: group.id,
        userId: body.userId,
        displayName: body.displayName || null,
        role: body.role || null,
        isMuted: body.action === 'MUTE' || body.action === 'REMOVE',
        mutedUntil: body.action === 'MUTE' ? mutedUntil : body.action === 'REMOVE' ? now : null,
        isBanned: body.action === 'BAN',
        bannedAt: body.action === 'BAN' ? now : null,
        removedAt: body.action === 'REMOVE' ? now : null,
        reason: body.reason || null,
        moderatedByUserId: req.user!.id
      },
      update: {
        displayName: body.displayName || undefined,
        role: body.role || undefined,
        isMuted:
          body.action === 'MUTE' || body.action === 'REMOVE'
            ? true
            : body.action === 'UNMUTE'
              ? false
              : undefined,
        mutedUntil:
          body.action === 'MUTE'
            ? mutedUntil
            : body.action === 'UNMUTE'
              ? null
              : body.action === 'REMOVE'
                ? now
                : undefined,
        isBanned: body.action === 'BAN' ? true : body.action === 'UNBAN' ? false : undefined,
        bannedAt: body.action === 'BAN' ? now : body.action === 'UNBAN' ? null : undefined,
        removedAt: body.action === 'REMOVE' ? now : undefined,
        reason: body.reason || undefined,
        moderatedByUserId: req.user!.id
      }
    });

    res.json({ moderation: moderationSummary(moderation) });
  })
);

hopeHubRouter.delete(
  '/hope-hub/live-groups/:id/messages/:messageId',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const messageId = routeParam(req, 'messageId');
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      }
    });
    if (!group) return res.status(404).json({ message: 'Live group not found.' });

    const message = await prisma.hopeHubLiveGroupMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), deletedByUserId: req.user!.id }
    });
    res.json({ message: serializeLiveGroupMessage(message) });
  })
);

hopeHubRouter.patch(
  '/hope-hub/live-groups/:id/mode',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const body = hopeHubLiveGroupModeSchema.parse(req.body);
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });
    if (body.mode !== 'CHAT') {
      return res.status(410).json({
        code: 'GROUP_CALLS_DISABLED',
        message:
          'Group voice/video is disabled for now to avoid media server cost. Use open group chat or 1:1 Live Connect.'
      });
    }

    const updated = await prisma.hopeHubLiveGroup.update({
      where: { id: group.id },
      data: {
        mode: 'CHAT',
        status: group.status,
        startsAt: group.startsAt ?? new Date()
      }
    });

    res.json({ group: serializeLiveGroup(updated) });
  })
);

hopeHubRouter.post(
  '/hope-hub/live-groups/:id/call-token',
  authOptional,
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const group = await prisma.hopeHubLiveGroup.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
        isPublic: true,
        status: { in: ['LIVE', 'SCHEDULED'] }
      }
    });

    if (!group) return res.status(404).json({ message: 'Live group not found.' });
    const moderation = req.user ? await liveGroupModerationFor(group.id, req.user.id) : null;
    if (moderation?.isBanned) {
      return res.status(403).json({ message: 'You are banned from this group room.' });
    }

    res.status(410).json({
      code: 'GROUP_CALLS_DISABLED',
      message:
        'Group voice/video is disabled for now to avoid media server cost. Use open group chat or 1:1 Live Connect.',
      moderation: moderationSummary(moderation),
      group: serializeLiveGroup(group)
    });
  })
);

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
  '/hope-hub/bootstrap',
  authOptional,
  asyncRoute(async (_req, res) => {
    const [banners, offerings, services, providerResponse, defaultOfferingSlug] = await Promise.all(
      [
        activeHopeHubBanners(),
        activeHopeHubOfferings(),
        activeHopeHubServices(),
        activeHopeHubProviders({ page: 1, pageSize: 5 }),
        getSiteConfigValue('telegramDefaultOfferingSlug')
      ]
    );
    const singleSession = defaultOfferingSlug
      ? offerings.find((offering) => offering.slug === defaultOfferingSlug) || null
      : null;
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      banners,
      offerings,
      services,
      providers: providerResponse.providers,
      providerPagination: providerResponse.pagination,
      singleSessionQuote: singleSession
        ? { offering: singleSession, quote: publicOfferingQuote(singleSession) }
        : null
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/offerings',
  asyncRoute(async (req, res) => {
    const type = queryText(req, 'type').trim();
    const featured = queryText(req, 'featured').trim();
    res.json({ offerings: await activeHopeHubOfferings({ type, featured: featured === 'true' }) });
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
  '/hope-hub/offerings/:slug/access',
  authOptional,
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug');
    const offering = await prisma.hopeHubOffering.findFirst({
      where: { isActive: true, OR: [{ slug }, { code: slug }, { id: slug }] },
      select: hopeHubOfferingSelect
    });
    if (!offering) return res.status(404).json({ message: 'Offering not found.' });

    const access = await resolveOfferingMediaAccess({
      offering,
      userId: req.user?.id
    });

    res.json({
      offering: offeringPublicPayload(offering),
      access
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/offerings/:slug/quote',
  authOptional,
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug');
    const offering = await prisma.hopeHubOffering.findFirst({
      where: { isActive: true, OR: [{ slug }, { code: slug }, { id: slug }] },
      select: hopeHubOfferingSelect
    });
    if (!offering) return res.status(404).json({ message: 'Offering not found.' });
    if (offering.priceInPaise == null) {
      return res.json({
        offering: offeringPublicPayload(offering),
        quote: {
          grossInPaise: null,
          discountInPaise: 0,
          payableInPaise: null,
          isEligibleForDiscount: false,
          reason: 'CUSTOM_QUOTE'
        }
      });
    }

    const isFirstPaid =
      req.user && offering.code === 'SINGLE_30'
        ? await isFirstPaidConsultation(req.user.id)
        : undefined;
    const discount = hopeHubDiscountSnapshot(offering, offering.priceInPaise, {
      isFirstPaidConsultation: isFirstPaid
    });

    res.json({
      offering: offeringPublicPayload(offering),
      quote: {
        grossInPaise: offering.priceInPaise,
        discountInPaise: discount.discountInPaise,
        payableInPaise: offering.priceInPaise - discount.discountInPaise,
        isEligibleForDiscount: discount.discountInPaise > 0,
        reason:
          discount.discountInPaise > 0
            ? 'DISCOUNT_APPLIED'
            : discount.rule?.skippedReason || 'NO_DISCOUNT',
        rule: discount.rule
      }
    });
  })
);

hopeHubRouter.get(
  '/hope-hub/banners',
  asyncRoute(async (_req, res) => {
    res.json({ banners: await activeHopeHubBanners() });
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
    res.json({ services: await activeHopeHubServices() });
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
    res.json({ service: servicePublicPayload(service, await hopeHubPublicDefaults()) });
  })
);

hopeHubRouter.get(
  '/hope-hub/slots',
  asyncRoute(async (req, res) => {
    const date = queryText(req, 'date');
    const providerId = queryText(req, 'providerId').trim();
    const careTeamServiceId = queryText(req, 'careTeamServiceId').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format.' });
    }

    if (providerId) {
      const provider = await prisma.doctor.findFirst({
        where: { id: providerId, showOnWebsite: true, suspendedAt: null, user: { isActive: true } },
        select: { id: true, userId: true }
      });
      if (!provider) {
        return res.status(404).json({ message: 'Expert not found.' });
      }
      const readiness = await providerPublicReadiness(provider.userId);
      if (!readiness.ready) {
        return res.status(404).json({ message: 'Expert is not accepting bookings right now.' });
      }

      const careTeamService = careTeamServiceId
        ? await prisma.careTeamService.findFirst({
            where: {
              id: careTeamServiceId,
              isActive: true,
              mentalHealthProfile: { doctorId: provider.id }
            },
            select: { id: true, durationMinutes: true }
          })
        : null;
      if (careTeamServiceId && !careTeamService) {
        return res.status(404).json({ message: 'Service not found for this expert.' });
      }

      const [slots, capacity] = await Promise.all([
        prisma.doctorSlot.findMany({
          where: { doctorId: provider.id, date: new Date(date), isBlocked: false },
          orderBy: { startTime: 'asc' }
        }),
        providerBookingCapacityStatus(provider.id, date)
      ]);

      return res.json({
        date,
        providerId,
        careTeamServiceId: careTeamService?.id ?? undefined,
        capacityMessage: capacity.message || undefined,
        slots: slots
          .filter((slot) => {
            if (
              careTeamServiceId &&
              slot.careTeamServiceId &&
              slot.careTeamServiceId !== careTeamServiceId
            ) {
              return false;
            }
            if (
              careTeamService &&
              minutesBetweenTimes(slot.startTime, slot.endTime) < careTeamService.durationMinutes
            ) {
              return false;
            }
            return true;
          })
          .map((slot) => {
            const time = displayTimeFrom24Hour(slot.startTime);
            const available = capacity.available && !slot.isBooked;
            return {
              time,
              period: periodForTime(time),
              available,
              booked: !available
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
    res.json(
      await activeHopeHubProviders({
        page,
        pageSize,
        q: queryText(req, 'q').trim(),
        roleGroup: queryText(req, 'roleGroup').trim(),
        concern: queryText(req, 'concern').trim(),
        language: queryText(req, 'language').trim(),
        modality: queryText(req, 'modality').trim(),
        sessionType: queryText(req, 'sessionType').trim(),
        ageGroup: queryText(req, 'ageGroup').trim(),
        gender: queryText(req, 'gender').trim(),
        autoMatchOnly: queryText(req, 'autoMatchOnly').trim() === 'true'
      })
    );
  })
);

hopeHubRouter.get(
  '/hope-hub/quick-talk/providers',
  asyncRoute(async (req, res) => {
    const providers = await activeLiveHopeHubProviders({
      q: queryText(req, 'q').trim(),
      roleGroup: queryText(req, 'roleGroup').trim(),
      concern: queryText(req, 'concern').trim(),
      language: queryText(req, 'language').trim(),
      modality: queryText(req, 'modality').trim(),
      sessionType: queryText(req, 'sessionType').trim(),
      ageGroup: queryText(req, 'ageGroup').trim(),
      gender: queryText(req, 'gender').trim(),
      mode: queryText(req, 'mode').trim()
    });
    res.json({ providers, total: providers.length });
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
        suspendedAt: null,
        user: { isActive: true },
        OR: [
          { doctorType: HomeopathicDoctorType.PSYCHOLOGIST },
          { specialty: { contains: 'psycholog', mode: 'insensitive' } },
          { specialty: { contains: 'volunteer', mode: 'insensitive' } },
          { specialty: { contains: 'peer support', mode: 'insensitive' } },
          { designation: { contains: 'psycholog', mode: 'insensitive' } },
          { designation: { contains: 'volunteer', mode: 'insensitive' } },
          { designation: { contains: 'peer support', mode: 'insensitive' } },
          { department: { contains: 'mental', mode: 'insensitive' } },
          { department: { contains: 'wellness', mode: 'insensitive' } },
          { department: { contains: 'volunteer', mode: 'insensitive' } },
          {
            focusAreas: {
              hasSome: ['Volunteer support', 'Peer support', 'Non-clinical peer support']
            }
          }
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
            careTeamType: true,
            careTeamTypes: true,
            qualifications: true,
            qualifiedFrom: true,
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
            acceptsHighRiskCases: true,
            autoMatchEnabled: true,
            acceptingNewUsers: true,
            maxSessionsPerDay: true,
            maxSessionsPerWeek: true,
            services: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
              select: {
                id: true,
                title: true,
                description: true,
                pricingMode: true,
                priceInPaise: true,
                firstSessionPriceInPaise: true,
                followUpPriceInPaise: true,
                introSessionLimit: true,
                packageSessionCount: true,
                packagePriceInPaise: true,
                freeMinutes: true,
                pricePerMinuteInPaise: true,
                currency: true,
                durationMinutes: true,
                isFree: true,
                isActive: true,
                sortOrder: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            gender: true,
            profileImageKey: true,
            profileImageUrl: true
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found.' });
    }
    res.json({ provider: providerPublicPayload(provider, await hopeHubPublicDefaults()) });
  })
);

hopeHubRouter.get(
  '/hope-hub/care-team-pricing-templates',
  asyncRoute(async (_req, res) => {
    const templates = await prisma.careTeamPricingTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        pricingMode: true,
        priceInPaise: true,
        firstSessionPriceInPaise: true,
        followUpPriceInPaise: true,
        introSessionLimit: true,
        packageSessionCount: true,
        packagePriceInPaise: true,
        freeMinutes: true,
        pricePerMinuteInPaise: true,
        durationMinutes: true,
        isFree: true,
        sortOrder: true
      }
    });
    res.json({ templates });
  })
);

hopeHubRouter.get(
  '/hope-hub/care-team-services/:id/quote',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const providerId = queryText(req, 'providerId').trim();
    const service = await findAvailableCareTeamService(id, providerId || undefined);
    if (!service) {
      return res.status(404).json({ message: 'Selected care team service is not available.' });
    }

    const [previousUseCount, packageBalance] = await Promise.all([
      previousCareTeamServiceUseCount(req.user!.id, service.id),
      service.pricingMode === CareTeamServicePricingMode.PACKAGE
        ? findActiveCareTeamPackageBalance(req.user!.id, service.id)
        : Promise.resolve(null)
    ]);
    const pricing = packageBalance
      ? careTeamPackageRedemptionPricing(packageBalance)
      : careTeamServicePricingPreview(service, previousUseCount);

    res.json({
      service: {
        id: service.id,
        title: service.title,
        providerId: service.mentalHealthProfile.doctor.id,
        providerName: service.mentalHealthProfile.doctor.user.name,
        pricingMode: service.pricingMode,
        durationMinutes: service.durationMinutes
      },
      quote: {
        amountInPaise: pricing.amountInPaise,
        payableInPaise: pricing.amountInPaise,
        label: pricing.label,
        appliedRule: pricing.appliedRule,
        previousUseCount,
        sessionCount: pricing.sessionCount,
        requiresPayment: pricing.amountInPaise > 0,
        packageBalance: packageBalance
          ? {
              packageConsultationId: packageBalance.consultationId,
              totalSessions: packageBalance.totalSessions,
              usedSessions: packageBalance.usedSessions,
              remainingSessions: packageBalance.remainingSessions,
              remainingAfterThis: Math.max(0, packageBalance.remainingSessions - 1)
            }
          : null
      }
    });
  })
);

hopeHubRouter.post(
  '/hope-hub/quick-talk',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = hopeHubQuickTalkSchema.parse(req.body);
    const quickTalkMode = normalizeQuickTalkMode(body.sessionMode);
    const normalizedSessionMode = quickTalkSessionModeLabel(quickTalkMode);
    const defaults = await hopeHubPublicDefaults();
    const roleGroup = /professional/i.test(body.preferredExpertType || '')
      ? 'PROFESSIONALS'
      : /counsellor/i.test(body.preferredExpertType || '')
        ? 'COUNSELLORS'
        : /listener|volunteer|peer/i.test(body.preferredExpertType || '')
          ? 'VOLUNTEERS'
          : '';

    const selectedCareTeamService = body.careTeamServiceId
      ? await findAvailableCareTeamService(body.careTeamServiceId, body.providerId || undefined)
      : null;
    if (body.careTeamServiceId && !selectedCareTeamService) {
      return res.status(400).json({ message: 'Selected quick-talk service is not available.' });
    }

    const provider = await findLiveHopeHubProviderForQuickTalk({
      providerId:
        selectedCareTeamService?.mentalHealthProfile.doctor.id || body.providerId || undefined,
      roleGroup,
      concern: body.concernCategory || undefined,
      language: body.preferredLanguage || undefined,
      gender: body.preferredProviderGender || undefined,
      mode: quickTalkMode
    });
    if (!provider) {
      return res.status(409).json({
        message: body.providerId
          ? 'This expert is not available for Quick Talk right now.'
          : 'No Quick Talk expert is available right now.'
      });
    }

    const careTeamService =
      selectedCareTeamService ||
      pickQuickTalkCareTeamService(provider.mentalHealthProfile?.services, quickTalkMode);
    const quickTalkUsesListener =
      isListenerCareTeamType(provider.mentalHealthProfile?.careTeamType) ||
      isListenerCareTeamType(careTeamService?.mentalHealthProfile?.careTeamType);
    if (quickTalkUsesListener && !body.listenerSupportConsent) {
      return res.status(400).json({
        message:
          'Please confirm you understand listener support is non-clinical and not emergency care.'
      });
    }
    const previousUseCount = careTeamService
      ? await previousCareTeamServiceUseCount(req.user!.id, careTeamService.id)
      : 0;
    const careTeamServicePricing = careTeamService
      ? careTeamServicePricingPreview(careTeamService, previousUseCount)
      : null;
    const effectiveServiceName = careTeamService?.title || 'Quick Hope Hub talk';
    const selectedServiceDurationMinutes =
      careTeamService?.durationMinutes || defaults.sessionDurationMinutes;
    const amountInPaise = careTeamServicePricing?.amountInPaise ?? defaults.sessionPriceInPaise;
    if (amountInPaise < 0 || (!careTeamService && amountInPaise <= 0)) {
      return res.status(400).json({ message: 'Quick Talk payment is not available.' });
    }
    const quickTalkPricingLabel = quickTalkSessionPricingLabel(
      careTeamService,
      careTeamServicePricing,
      selectedServiceDurationMinutes,
      amountInPaise
    );

    const disease = await prisma.disease.upsert({
      where: { name: effectiveServiceName },
      create: {
        name: effectiveServiceName,
        slug: slugify(effectiveServiceName),
        description: defaultDescription(effectiveServiceName),
        publicDescription: defaultDescription(effectiveServiceName),
        publicCategory: 'Hope Hub',
        feeInPaise: amountInPaise,
        intakeQuestions: [
          { id: 'concern', label: 'What would you like support with?' },
          { id: 'quickTalk', label: 'Quick Talk request' }
        ]
      },
      update: {
        publicCategory: 'Hope Hub',
        feeInPaise: amountInPaise
      }
    });

    const checkout = await resolveConsultationCheckout({
      patientId: req.user!.id,
      grossInPaise: amountInPaise,
      walletRedeemInPaise: amountInPaise <= 0 ? 0 : body.walletRedeemInPaise,
      promoCode: body.promoCode || ''
    });
    const finalPayableInPaise = checkout.payableInPaise;
    const isFreeOrWalletPaid = finalPayableInPaise <= 0;
    const isFreeByPricing = amountInPaise <= 0;
    const paymentProvider = isFreeOrWalletPaid ? 'internal_free' : 'razorpay';
    const grossRevenueSplit = hopeHubRevenueSplit(amountInPaise);
    const payableRevenueSplit = hopeHubRevenueSplit(finalPayableInPaise);

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        clinicStoreId: null,
        consultationMode: ConsultationMode.INSTANT_ONLINE,
        preferredDoctorUserId: provider.userId,
        assignedDoctorId: isFreeOrWalletPaid ? provider.userId : null,
        status: isFreeOrWalletPaid
          ? ConsultationStatus.ASSIGNED
          : ConsultationStatus.PAYMENT_PENDING,
        billingPlanCode: 'ONE_TIME',
        intakeAnswers: {
          source: 'hope-hub-quick-talk',
          quickTalk: true,
          serviceName: effectiveServiceName,
          message: body.message || '',
          appointmentDate: new Date().toISOString().slice(0, 10),
          appointmentTime: 'ASAP',
          providerId: provider.id,
          requestedProviderName: provider.user.name,
          careTeamServiceId: careTeamService?.id || '',
          careTeamServiceTitle: careTeamService?.title || '',
          careTeamPricingMode: careTeamService?.pricingMode || '',
          careTeamPricingLabel: quickTalkPricingLabel,
          careTeamPreviousUseCount: previousUseCount,
          promoCode: body.promoCode || '',
          isFreeSession: isFreeByPricing,
          requiresPayment: !isFreeOrWalletPaid,
          concernCategory: body.concernCategory || '',
          preferredExpertType: body.preferredExpertType || '',
          sessionMode: normalizedSessionMode,
          quickTalkMode,
          preferredLanguage: body.preferredLanguage || '',
          preferredProviderGender: body.preferredProviderGender || '',
          safetyRisk: body.safetyRisk || '',
          previousTherapyOrMedication: body.previousTherapyOrMedication || '',
          emergencyConsent: Boolean(body.emergencyConsent),
          sessionDuration: `${selectedServiceDurationMinutes} minutes`,
          preferredContact: 'online',
          urgencyLevel: 'high',
          entryPage: body.entryPage || ''
        },
        pricingSnapshot: {
          source: 'hope-hub-quick-talk',
          purchaseType: 'QUICK_TALK',
          serviceName: effectiveServiceName,
          providerId: provider.id,
          requestedProviderName: provider.user.name,
          sessionMode: normalizedSessionMode,
          quickTalkMode,
          careTeamServiceId: careTeamService?.id || null,
          careTeamServiceTitle: careTeamService?.title || null,
          careTeamPricingMode: careTeamService?.pricingMode || null,
          careTeamPricingLabel: quickTalkPricingLabel,
          careTeamPricingRule: careTeamServicePricing?.appliedRule || null,
          careTeamPreviousUseCount: previousUseCount,
          promoCode: body.promoCode || null,
          isFreeSession: isFreeByPricing,
          requiresPayment: !isFreeOrWalletPaid,
          sessionDurationMinutes: selectedServiceDurationMinutes,
          sessionFeeInPaise: amountInPaise,
          grossRevenueSplit,
          payableRevenueSplit,
          checkout
        },
        payment: {
          create: {
            provider: paymentProvider,
            grossAmountInPaise: checkout.grossAmountInPaise,
            discountInPaise: checkout.discountInPaise,
            walletRedeemedInPaise: checkout.walletRedeemedInPaise,
            amountInPaise: finalPayableInPaise,
            billingPlanCode: 'ONE_TIME',
            appliedRules: checkout.appliedRules,
            lineItems: {
              source: 'hope-hub-quick-talk',
              purchaseType: 'QUICK_TALK',
              serviceName: effectiveServiceName,
              providerId: provider.id,
              requestedProviderName: provider.user.name,
              sessionMode: normalizedSessionMode,
              quickTalkMode,
              careTeamServiceId: careTeamService?.id || null,
              careTeamServiceTitle: careTeamService?.title || null,
              careTeamPricingMode: careTeamService?.pricingMode || null,
              careTeamPricingLabel: quickTalkPricingLabel,
              careTeamPricingRule: careTeamServicePricing?.appliedRule || null,
              careTeamPreviousUseCount: previousUseCount,
              promoCode: body.promoCode || null,
              isFreeSession: isFreeByPricing,
              requiresPayment: !isFreeOrWalletPaid,
              sessionDurationMinutes: selectedServiceDurationMinutes,
              consultationFeeInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              payableInPaise: finalPayableInPaise,
              grossRevenueSplit,
              payableRevenueSplit,
              planCode: 'ONE_TIME',
              planName: 'Quick Talk',
              appliedRules: checkout.appliedRules
            },
            status: isFreeOrWalletPaid ? PaymentStatus.PAID : PaymentStatus.CREATED
          }
        }
      },
      include: includeConsultationRelations()
    });

    if (isFreeOrWalletPaid && consultation.payment?.id) {
      await markDoctorBusy(provider.userId, 'BUSY');
      await upsertProviderEarningForPayment(consultation.payment.id);
      void settleConsultationPaymentRewards(consultation.payment.id).catch((err) =>
        console.error('[rewards] Quick Talk settlement failed after free checkout', err)
      );
      void notifyConsultationBooked(consultation.id).catch((err) =>
        console.error('[booking-reminders] Quick Talk booking notification failed', err)
      );
    }

    res.status(201).json({
      consultation,
      provider: {
        id: provider.id,
        userId: provider.userId,
        name: provider.user.name,
        quickTalkAvailable: true
      }
    });
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
      await assertAssessmentAccess(definition, req.user!.id);
      scored = scoreAssessment(definition, body.answers);
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
      return res.status(statusCode).json({
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
    const defaults = await hopeHubPublicDefaults();
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
    const selectedCareTeamService = body.careTeamServiceId
      ? await findAvailableCareTeamService(body.careTeamServiceId, body.providerId || undefined)
      : null;
    if (body.careTeamServiceId && !selectedCareTeamService) {
      return res.status(400).json({ message: 'Selected care team service is not available.' });
    }
    const [careTeamServiceUseCount, activeCareTeamPackageBalance] = selectedCareTeamService
      ? await Promise.all([
          previousCareTeamServiceUseCount(req.user!.id, selectedCareTeamService.id),
          selectedCareTeamService.pricingMode === CareTeamServicePricingMode.PACKAGE
            ? findActiveCareTeamPackageBalance(req.user!.id, selectedCareTeamService.id)
            : Promise.resolve(null)
        ])
      : [0, null];
    const careTeamServicePricing = selectedCareTeamService
      ? activeCareTeamPackageBalance
        ? careTeamPackageRedemptionPricing(activeCareTeamPackageBalance)
        : careTeamServicePricingPreview(selectedCareTeamService, careTeamServiceUseCount)
      : null;
    const effectiveServiceName = selectedCareTeamService?.title || body.serviceName;
    const selectedServiceDurationMinutes =
      selectedCareTeamService?.durationMinutes || defaults.sessionDurationMinutes;
    const slug = slugify(effectiveServiceName);
    const existingService = await prisma.disease.findFirst({
      where: {
        isActive: true,
        publicCategory: 'Hope Hub',
        OR: [{ name: effectiveServiceName }, { slug }]
      },
      select: { id: true, feeInPaise: true }
    });
    const amountInPaise =
      selectedOffering?.priceInPaise ??
      careTeamServicePricing?.amountInPaise ??
      (body.servicePriceInPaise || existingService?.feeInPaise || defaults.sessionPriceInPaise);
    if (amountInPaise < 0 || (!selectedCareTeamService && amountInPaise <= 0)) {
      return res.status(400).json({ message: 'Selected offer cannot be paid online.' });
    }
    const isFirstPaidHopeHubSession =
      !selectedOffering || selectedOffering.code !== 'SINGLE_30'
        ? undefined
        : await isFirstPaidConsultation(req.user!.id);
    const offerDiscount = hopeHubDiscountSnapshot(selectedOffering, amountInPaise, {
      isFirstPaidConsultation: isFirstPaidHopeHubSession
    });
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
            suspendedAt: null,
            user: { isActive: true },
            OR: [
              { doctorType: HomeopathicDoctorType.PSYCHOLOGIST },
              { specialty: { contains: 'psycholog', mode: 'insensitive' } },
              { specialty: { contains: 'volunteer', mode: 'insensitive' } },
              { specialty: { contains: 'peer support', mode: 'insensitive' } },
              { designation: { contains: 'psycholog', mode: 'insensitive' } },
              { designation: { contains: 'volunteer', mode: 'insensitive' } },
              { designation: { contains: 'peer support', mode: 'insensitive' } },
              { department: { contains: 'mental', mode: 'insensitive' } },
              { department: { contains: 'wellness', mode: 'insensitive' } },
              { department: { contains: 'volunteer', mode: 'insensitive' } },
              {
                focusAreas: {
                  hasSome: ['Volunteer support', 'Peer support', 'Non-clinical peer support']
                }
              }
            ]
          },
          select: {
            id: true,
            userId: true,
            user: { select: { name: true } },
            mentalHealthProfile: { select: { careTeamType: true, careTeamTypes: true } }
          }
        })
      : (selectedCareTeamService?.mentalHealthProfile.doctor ?? null);
    if (body.providerId && !requestedProvider) {
      return res.status(400).json({ message: 'Selected care team member is not available.' });
    }
    if (requestedProvider) {
      const readiness = await providerPublicReadiness(requestedProvider.userId);
      if (!readiness.ready) {
        return res.status(400).json({ message: 'Selected care team member is not available.' });
      }
    }
    const requestedProviderCareTeamTypes = body.providerId
      ? normalizedCareTeamTypes(
          (
            requestedProvider as {
              mentalHealthProfile?: {
                careTeamType?: string | null;
                careTeamTypes?: string[] | null;
              };
            } | null
          )?.mentalHealthProfile
        )
      : normalizedCareTeamTypes(selectedCareTeamService?.mentalHealthProfile);
    const bookingUsesListener = [
      ...normalizedCareTeamTypes(selectedCareTeamService?.mentalHealthProfile),
      ...requestedProviderCareTeamTypes
    ].some((type) => isListenerCareTeamType(type));
    if (bookingUsesListener && !body.listenerSupportConsent) {
      return res.status(400).json({
        message:
          'Please confirm you understand listener support is non-clinical and not emergency care.'
      });
    }
    const providerCapacity =
      requestedProvider && body.appointmentDate
        ? await providerBookingCapacityStatus(requestedProvider.id, body.appointmentDate)
        : { available: true, message: '' };
    if (!providerCapacity.available) {
      return res.status(409).json({ message: providerCapacity.message });
    }
    const requestedSlot =
      requestedProvider && body.appointmentDate && body.appointmentTime
        ? await prisma.doctorSlot.findFirst({
            where: {
              doctorId: requestedProvider.id,
              date: new Date(body.appointmentDate),
              startTime: time24HourFromDisplay(body.appointmentTime),
              isBooked: false,
              isBlocked: false,
              ...(selectedCareTeamService
                ? {
                    OR: [
                      { careTeamServiceId: null },
                      { careTeamServiceId: selectedCareTeamService.id }
                    ]
                  }
                : {})
            },
            select: { id: true, startTime: true, endTime: true }
          })
        : null;
    if (requestedProvider && !requestedSlot) {
      return res.status(409).json({ message: 'Selected expert slot is no longer available.' });
    }
    if (
      requestedSlot &&
      selectedCareTeamService &&
      minutesBetweenTimes(requestedSlot.startTime, requestedSlot.endTime) <
        selectedCareTeamService.durationMinutes
    ) {
      return res
        .status(409)
        .json({ message: 'Selected expert slot is too short for this service.' });
    }

    await ensureBillingPlans();
    const shouldSyncCatalogServiceFee =
      !selectedOffering && !selectedCareTeamService && !body.providerId;
    const disease = existingService
      ? shouldSyncCatalogServiceFee
        ? await prisma.disease.update({
            where: { id: existingService.id },
            data: { feeInPaise: amountInPaise }
          })
        : existingService
      : await prisma.disease.upsert({
          where: { name: effectiveServiceName },
          create: {
            name: effectiveServiceName,
            slug,
            description: defaultDescription(effectiveServiceName),
            publicDescription: defaultDescription(effectiveServiceName),
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
    const selectedCarePackageSessionCount = careTeamServicePricing?.sessionCount || 1;
    const packageUsage = activeCareTeamPackageBalance
      ? {
          source: 'care-team-service',
          type: 'REDEMPTION',
          packageConsultationId: activeCareTeamPackageBalance.consultationId,
          careTeamServiceId: selectedCareTeamService?.id || null,
          totalSessions: activeCareTeamPackageBalance.totalSessions,
          usedSessions: activeCareTeamPackageBalance.usedSessions + 1,
          remainingSessions: Math.max(0, activeCareTeamPackageBalance.remainingSessions - 1),
          validUntil: activeCareTeamPackageBalance.packageUsage['validUntil'] ?? null
        }
      : selectedCareTeamService?.pricingMode === CareTeamServicePricingMode.PACKAGE
        ? {
            source: 'care-team-service',
            type: 'PURCHASE',
            careTeamServiceId: selectedCareTeamService.id,
            totalSessions: selectedCarePackageSessionCount,
            usedSessions: 1,
            remainingSessions: Math.max(0, selectedCarePackageSessionCount - 1),
            validUntil: null
          }
        : selectedOffering && (selectedOffering.sessionCount || 0) > 1
          ? {
              source: 'hope-hub-offering',
              type: 'PURCHASE',
              totalSessions: selectedOffering.sessionCount || 1,
              usedSessions: 0,
              remainingSessions: selectedOffering.sessionCount || 1,
              validUntil: packageValidUntil?.toISOString() ?? null
            }
          : null;

    const checkout = await resolveConsultationCheckout({
      patientId: req.user!.id,
      grossInPaise: partialPayment.payableInPaise,
      walletRedeemInPaise: partialPayment.payableInPaise <= 0 ? 0 : body.walletRedeemInPaise,
      promoCode: body.promoCode || ''
    });
    const chargeGrossInPaise = checkout.grossAmountInPaise;
    const finalPayableInPaise = checkout.payableInPaise;
    const isFreeByPricing = amountInPaise <= 0;
    const requiresPayment = finalPayableInPaise > 0;
    const paymentProvider = requiresPayment ? 'razorpay' : 'internal_free';
    const totalDiscountInPaise = offerDiscount.discountInPaise + checkout.discountInPaise;
    const grossRevenueSplit = hopeHubRevenueSplit(amountInPaise);
    const payableRevenueSplit = hopeHubRevenueSplit(checkout.payableInPaise);

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        clinicStoreId: null,
        assignedDoctorId: requestedProvider?.userId ?? null,
        status:
          finalPayableInPaise <= 0 ? ConsultationStatus.PAID : ConsultationStatus.PAYMENT_PENDING,
        consultationMode: 'INSTANT_ONLINE',
        intakeAnswers: {
          source: 'hope-hub',
          serviceName: effectiveServiceName,
          message: body.message || '',
          appointmentDate: body.appointmentDate,
          appointmentTime: body.appointmentTime,
          consultantName: body.consultantName || '',
          consultantPhone: body.consultantPhone || '',
          offeringId: selectedOffering?.id || body.offeringId || '',
          offeringSlug: selectedOffering?.slug || body.offeringSlug || '',
          offeringTitle: selectedOffering?.title || '',
          offeringType: selectedOffering?.type || '',
          careTeamServiceId: selectedCareTeamService?.id || body.careTeamServiceId || '',
          careTeamServiceTitle: selectedCareTeamService?.title || '',
          careTeamPricingMode: selectedCareTeamService?.pricingMode || '',
          careTeamPricingLabel: careTeamServicePricing?.label || '',
          isFreeSession: isFreeByPricing,
          requiresPayment,
          careTeamFreeMinutes: selectedCareTeamService?.freeMinutes ?? null,
          careTeamPricePerMinuteInPaise: selectedCareTeamService?.pricePerMinuteInPaise ?? null,
          careTeamBillableMinutes:
            selectedCareTeamService?.pricingMode === CareTeamServicePricingMode.PER_MINUTE
              ? Math.max(
                  0,
                  (selectedCareTeamService.durationMinutes || 0) -
                    (selectedCareTeamService.freeMinutes || 0)
                )
              : null,
          careTeamPreviousUseCount: careTeamServiceUseCount,
          promoCode: body.promoCode || '',
          careTeamPackageConsultationId: activeCareTeamPackageBalance?.consultationId || '',
          careTeamPackageRemainingBefore: activeCareTeamPackageBalance?.remainingSessions ?? null,
          providerId: requestedProvider?.id || body.providerId || '',
          requestedProviderName: requestedProvider?.user.name || '',
          concernCategory: body.concernCategory || '',
          preferredExpertType: body.preferredExpertType || '',
          sessionMode: body.sessionMode || '',
          preferredLanguage: body.preferredLanguage || '',
          preferredProviderGender: body.preferredProviderGender || '',
          safetyRisk: body.safetyRisk || '',
          previousTherapyOrMedication: body.previousTherapyOrMedication || '',
          emergencyConsent: Boolean(body.emergencyConsent),
          sessionDuration: `${
            selectedOffering?.sessionDurationMinutes || selectedServiceDurationMinutes
          } minutes`,
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
          serviceName: effectiveServiceName,
          careTeamServiceId: selectedCareTeamService?.id || null,
          careTeamServiceTitle: selectedCareTeamService?.title || null,
          careTeamPricingMode: selectedCareTeamService?.pricingMode || null,
          careTeamPricingLabel: careTeamServicePricing?.label || null,
          careTeamPricingRule: careTeamServicePricing?.appliedRule || null,
          isFreeSession: isFreeByPricing,
          requiresPayment,
          careTeamFreeMinutes: selectedCareTeamService?.freeMinutes ?? null,
          careTeamPricePerMinuteInPaise: selectedCareTeamService?.pricePerMinuteInPaise ?? null,
          careTeamBillableMinutes:
            selectedCareTeamService?.pricingMode === CareTeamServicePricingMode.PER_MINUTE
              ? Math.max(
                  0,
                  (selectedCareTeamService.durationMinutes || 0) -
                    (selectedCareTeamService.freeMinutes || 0)
                )
              : null,
          careTeamPreviousUseCount: careTeamServiceUseCount,
          careTeamPackageConsultationId: activeCareTeamPackageBalance?.consultationId || null,
          careTeamPackageRemainingBefore: activeCareTeamPackageBalance?.remainingSessions ?? null,
          sessionFeeInPaise: amountInPaise,
          netAfterOfferDiscountInPaise,
          paymentMode: partialPayment.paymentMode,
          promoCode: body.promoCode || null,
          balanceDueInPaise: partialPayment.balanceDueInPaise,
          packageUsage,
          sessionDurationMinutes:
            selectedOffering?.sessionDurationMinutes || selectedServiceDurationMinutes,
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
            provider: paymentProvider,
            grossAmountInPaise: chargeGrossInPaise,
            discountInPaise: checkout.discountInPaise,
            walletRedeemedInPaise: checkout.walletRedeemedInPaise,
            amountInPaise: finalPayableInPaise,
            billingPlanCode: selectedPlanCode,
            appliedRules: checkout.appliedRules,
            lineItems: {
              source: 'hope-hub',
              serviceName: effectiveServiceName,
              offeringId: selectedOffering?.id || null,
              offeringCode: selectedOffering?.code || null,
              offeringSlug: selectedOffering?.slug || null,
              offeringTitle: selectedOffering?.title || null,
              offeringType: selectedOffering?.type || null,
              careTeamServiceId: selectedCareTeamService?.id || null,
              careTeamServiceTitle: selectedCareTeamService?.title || null,
              careTeamPricingMode: selectedCareTeamService?.pricingMode || null,
              careTeamPricingLabel: careTeamServicePricing?.label || null,
              careTeamPricingRule: careTeamServicePricing?.appliedRule || null,
              isFreeSession: isFreeByPricing,
              requiresPayment,
              careTeamFreeMinutes: selectedCareTeamService?.freeMinutes ?? null,
              careTeamPricePerMinuteInPaise: selectedCareTeamService?.pricePerMinuteInPaise ?? null,
              careTeamBillableMinutes:
                selectedCareTeamService?.pricingMode === CareTeamServicePricingMode.PER_MINUTE
                  ? Math.max(
                      0,
                      (selectedCareTeamService.durationMinutes || 0) -
                        (selectedCareTeamService.freeMinutes || 0)
                    )
                  : null,
              careTeamPreviousUseCount: careTeamServiceUseCount,
              promoCode: body.promoCode || null,
              careTeamPackageConsultationId: activeCareTeamPackageBalance?.consultationId || null,
              careTeamPackageRemainingBefore:
                activeCareTeamPackageBalance?.remainingSessions ?? null,
              providerId: requestedProvider?.id || body.providerId || '',
              requestedProviderName: requestedProvider?.user.name || '',
              sessionDurationMinutes:
                selectedOffering?.sessionDurationMinutes || selectedServiceDurationMinutes,
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
            status: finalPayableInPaise <= 0 ? PaymentStatus.PAID : PaymentStatus.CREATED
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

    if (consultation.payment?.status === PaymentStatus.PAID) {
      await upsertProviderEarningForPayment(consultation.payment.id);
      void settleConsultationPaymentRewards(consultation.payment.id).catch((err) =>
        console.error('[rewards] Hope Hub settlement failed after free checkout', err)
      );
      void notifyConsultationBooked(consultation.id).catch((err) =>
        console.error('[booking-reminders] Hope Hub booking notification failed', err)
      );
    }

    if (activeCareTeamPackageBalance) {
      const updatedPackageUsage = {
        ...activeCareTeamPackageBalance.packageUsage,
        usedSessions: activeCareTeamPackageBalance.usedSessions + 1,
        remainingSessions: Math.max(0, activeCareTeamPackageBalance.remainingSessions - 1),
        lastRedeemedAt: new Date().toISOString(),
        lastRedeemedConsultationId: consultation.id
      };
      const redemptionHistory = Array.isArray(
        activeCareTeamPackageBalance.pricingSnapshot['redemptions']
      )
        ? activeCareTeamPackageBalance.pricingSnapshot['redemptions']
        : [];
      await prisma.consultation.update({
        where: { id: activeCareTeamPackageBalance.consultationId },
        data: {
          pricingSnapshot: {
            ...activeCareTeamPackageBalance.pricingSnapshot,
            packageUsage: updatedPackageUsage,
            redemptions: [
              ...redemptionHistory,
              {
                consultationId: consultation.id,
                redeemedAt: new Date().toISOString(),
                appointmentDate: body.appointmentDate,
                appointmentTime: body.appointmentTime,
                providerId: requestedProvider?.id || body.providerId || ''
              }
            ]
          }
        }
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
          `Service: ${effectiveServiceName}`,
          selectedOffering ? `Offer: ${selectedOffering.title}` : '',
          selectedCareTeamService ? `Care team service: ${selectedCareTeamService.title}` : '',
          careTeamServicePricing?.label ? `Pricing: ${careTeamServicePricing.label}` : '',
          `Appointment: ${body.appointmentDate} ${body.appointmentTime}`,
          body.preferredContact ? `Preferred contact: ${body.preferredContact}` : '',
          body.urgencyLevel ? `Urgency: ${body.urgencyLevel}` : '',
          body.concernCategory ? `Concern category: ${body.concernCategory}` : '',
          body.preferredExpertType ? `Preferred expert: ${body.preferredExpertType}` : '',
          body.preferredLanguage ? `Preferred language: ${body.preferredLanguage}` : '',
          body.preferredProviderGender
            ? `Preferred provider gender: ${body.preferredProviderGender}`
            : '',
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
        serviceName: effectiveServiceName,
        offeringId: selectedOffering?.id ?? '',
        offeringCode: selectedOffering?.code ?? '',
        careTeamServiceId: selectedCareTeamService?.id ?? '',
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
      include: {
        ...includeConsultationRelations(),
        followUpEntitlement: true
      },
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
    const activeOfferings = await activeHopeHubOfferings();
    const resources = (
      await Promise.all(
        activeOfferings
          .filter((offering) => mediaLinkCount(offering.metadata) > 0)
          .map(async (offering) => ({
            offering,
            access: await resolveOfferingMediaAccess({ offering, userId: req.user!.id })
          }))
      )
    )
      .filter(({ access }) => access.canAccess)
      .map(({ offering, access }) => ({
        id: offering.id,
        slug: offering.slug,
        title: offering.title,
        subtitle: offering.subtitle,
        type: offering.type,
        routePath: offering.routePath,
        imageUrl: offering.imageUrl,
        mediaLinkCount: mediaLinkCount(offering.metadata),
        accessReason: access.reason
      }));
    const paidStatuses = new Set(['CAPTURED', 'PAID']);
    const summary = consultations.reduce(
      (acc, consultation) => {
        const paymentStatus = consultation.payment?.status?.toUpperCase() || '';
        const pricingSnapshot = (consultation.pricingSnapshot || {}) as Record<string, any>;
        const lineItems = (consultation.payment?.lineItems || {}) as Record<string, any>;
        const packageUsage = pricingSnapshot['packageUsage'] || lineItems['packageUsage'] || null;
        const balanceDueInPaise = Number(
          pricingSnapshot['balanceDueInPaise'] ?? lineItems['balanceDueInPaise'] ?? 0
        );
        const refundedInPaise = Number(consultation.payment?.refundedAmountInPaise || 0);

        if (!paidStatuses.has(paymentStatus)) acc.pendingPaymentCount += 1;
        if (consultation.followUpEntitlement?.status === FollowUpEntitlementStatus.AVAILABLE) {
          acc.availableFollowUpCount += 1;
        }
        if (packageUsage && Number(packageUsage.remainingSessions || 0) > 0) {
          acc.activePackageCount += 1;
        }
        acc.balanceDueInPaise += balanceDueInPaise;
        acc.refundedInPaise += refundedInPaise;
        return acc;
      },
      {
        totalBookings: consultations.length,
        pendingPaymentCount: 0,
        availableFollowUpCount: 0,
        activePackageCount: 0,
        balanceDueInPaise: 0,
        refundedInPaise: 0,
        requestCount: leads.length
      }
    );
    const packages = consultations
      .map((consultation) => {
        const pricingSnapshot = (consultation.pricingSnapshot || {}) as Record<string, any>;
        const lineItems = (consultation.payment?.lineItems || {}) as Record<string, any>;
        const packageUsage = pricingSnapshot['packageUsage'] || lineItems['packageUsage'] || null;
        if (!packageUsage || Number(packageUsage.remainingSessions || 0) <= 0) return null;
        return {
          consultationId: consultation.id,
          serviceName: pricingSnapshot['serviceName'] || consultation.disease?.name || 'Package',
          careTeamServiceId: pricingSnapshot['careTeamServiceId'] || null,
          providerId:
            pricingSnapshot['providerId'] ||
            lineItems['providerId'] ||
            (consultation.assignedDoctorId
              ? providerIdByUserId.get(consultation.assignedDoctorId) || null
              : null),
          providerName:
            pricingSnapshot['requestedProviderName'] ||
            lineItems['requestedProviderName'] ||
            consultation.assignedDoctor?.name ||
            '',
          pricingLabel: pricingSnapshot['careTeamPricingLabel'] || '',
          totalSessions: Number(packageUsage.totalSessions || 0),
          usedSessions: Number(packageUsage.usedSessions || 0),
          remainingSessions: Number(packageUsage.remainingSessions || 0),
          validUntil: packageUsage.validUntil || null,
          lastRedeemedAt: packageUsage.lastRedeemedAt || null,
          lastRedeemedConsultationId: packageUsage.lastRedeemedConsultationId || null
        };
      })
      .filter(Boolean);

    res.json({
      consultations: consultations.map((consultation) => ({
        ...consultation,
        assignedProviderId: consultation.assignedDoctorId
          ? providerIdByUserId.get(consultation.assignedDoctorId) || null
          : null
      })),
      leads,
      summary,
      resources,
      packages
    });
  })
);

hopeHubRouter.post(
  '/hope-hub/follow-ups/:id/request',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const entitlementId = routeParam(req, 'id');
    const entitlement = await prisma.consultationFollowUpEntitlement.findFirst({
      where: {
        id: entitlementId,
        patientId: req.user!.id
      }
    });
    if (!entitlement) {
      return res.status(404).json({ message: 'Follow-up session was not found.' });
    }
    if (entitlement.status !== FollowUpEntitlementStatus.AVAILABLE) {
      return res.status(409).json({ message: 'Follow-up session is not available to request.' });
    }
    if (entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now()) {
      await prisma.consultationFollowUpEntitlement.update({
        where: { id: entitlement.id },
        data: { status: FollowUpEntitlementStatus.EXPIRED }
      });
      return res.status(410).json({ message: 'Follow-up session has expired.' });
    }

    const updated = await prisma.consultationFollowUpEntitlement.update({
      where: { id: entitlement.id },
      data: {
        status: FollowUpEntitlementStatus.REQUESTED,
        requestedAt: new Date()
      }
    });

    void trackProductEvent({
      name: HOPE_HUB_EVENTS.FOLLOW_UP_REQUESTED,
      actorId: req.user!.id,
      actorRole: req.user!.role,
      properties: {
        entitlementId: entitlement.id,
        consultationId: entitlement.consultationId
      }
    });

    res.json({ entitlement: updated });
  })
);
