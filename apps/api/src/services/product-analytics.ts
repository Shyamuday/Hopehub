import { PaymentStatus, Prisma, ProductEventCategory, Role } from '@prisma/client';
import { prisma } from '../db.js';

export const PRODUCT_EVENTS = {
  PATIENT_LOGIN: 'patient.login',
  CONSULTATION_BOOKED: 'consultation.booked',
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  CONSULTATION_ASSIGNED: 'consultation.assigned',
  PRESCRIPTION_PUBLISHED: 'prescription.published',
  DOSE_TAKEN: 'dose.taken',
  DOCTOR_LOGIN: 'doctor.login',
  DOCTOR_WORKLIST_VIEWED: 'doctor.worklist_viewed',
  PAYMENT_CHECKOUT_OPENED: 'payment.checkout_opened'
} as const;

export const HOPE_HUB_EVENTS = {
  SERVICE_VIEWED: 'hope_hub.service_viewed',
  OFFER_VIEWED: 'hope_hub.offer_viewed',
  BOOKING_FORM_OPENED: 'hope_hub.booking_form_opened',
  SLOT_SELECTED: 'hope_hub.slot_selected',
  LOGIN_REQUIRED: 'hope_hub.login_required',
  PAYMENT_STARTED: 'hope_hub.payment_started',
  PAYMENT_SUCCESS: 'hope_hub.payment_success',
  PAYMENT_FAILED: 'hope_hub.payment_failed',
  FOLLOW_UP_REQUESTED: 'hope_hub.follow_up_requested'
} as const;

export const HOPE_HUB_FUNNEL_STEPS = [
  { key: HOPE_HUB_EVENTS.SERVICE_VIEWED, label: 'Service viewed' },
  { key: HOPE_HUB_EVENTS.OFFER_VIEWED, label: 'Offer viewed' },
  { key: HOPE_HUB_EVENTS.BOOKING_FORM_OPENED, label: 'Booking opened' },
  { key: HOPE_HUB_EVENTS.SLOT_SELECTED, label: 'Slot selected' },
  { key: PRODUCT_EVENTS.CONSULTATION_BOOKED, label: 'Booking created' },
  { key: PRODUCT_EVENTS.PAYMENT_INITIATED, label: 'Payment started' },
  { key: PRODUCT_EVENTS.PAYMENT_COMPLETED, label: 'Payment success' }
] as const;

export const PATIENT_FUNNEL_STEPS = [
  { key: PRODUCT_EVENTS.CONSULTATION_BOOKED, label: 'Consultation booked' },
  { key: PRODUCT_EVENTS.PAYMENT_INITIATED, label: 'Payment initiated' },
  { key: PRODUCT_EVENTS.PAYMENT_COMPLETED, label: 'Payment completed' },
  { key: PRODUCT_EVENTS.CONSULTATION_ASSIGNED, label: 'Doctor assigned' },
  { key: PRODUCT_EVENTS.PRESCRIPTION_PUBLISHED, label: 'Prescription published' },
  { key: PRODUCT_EVENTS.DOSE_TAKEN, label: 'First dose taken' }
] as const;

export async function trackProductEvent(input: {
  name: string;
  category?: ProductEventCategory;
  actorId?: string | null;
  actorRole?: Role | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
}) {
  try {
    await prisma.productEvent.create({
      data: {
        name: input.name,
        category: input.category ?? ProductEventCategory.FUNNEL,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        sessionId: input.sessionId ?? null,
        properties: (input.properties ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });
  } catch (error) {
    console.warn('[analytics] failed to track event', input.name, error);
  }
}

export async function buildProductFunnelReport(days: number) {
  const windowDays = Math.min(90, Math.max(7, days));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (windowDays - 1));
  start.setHours(0, 0, 0, 0);

  const eventNames = [
    PRODUCT_EVENTS.PATIENT_LOGIN,
    ...PATIENT_FUNNEL_STEPS.map((step) => step.key),
    PRODUCT_EVENTS.DOCTOR_WORKLIST_VIEWED
  ];

  const events = await prisma.productEvent.findMany({
    where: {
      name: { in: eventNames },
      createdAt: { gte: start, lte: end }
    },
    select: { name: true, createdAt: true, actorId: true }
  });

  const counts = new Map<string, number>();
  const uniqueActors = new Map<string, Set<string>>();
  const daily = new Map<string, Map<string, number>>();

  for (const name of eventNames) {
    counts.set(name, 0);
    uniqueActors.set(name, new Set());
  }

  for (const event of events) {
    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    if (event.actorId) {
      uniqueActors.get(event.name)?.add(event.actorId);
    }
    const dayKey = event.createdAt.toISOString().slice(0, 10);
    if (!daily.has(dayKey)) daily.set(dayKey, new Map());
    const dayMap = daily.get(dayKey)!;
    dayMap.set(event.name, (dayMap.get(event.name) ?? 0) + 1);
  }

  const funnel = PATIENT_FUNNEL_STEPS.map((step, index) => {
    const total = counts.get(step.key) ?? 0;
    const unique = uniqueActors.get(step.key)?.size ?? 0;
    const firstTotal = counts.get(PATIENT_FUNNEL_STEPS[0].key) ?? 0;
    const prevTotal = index === 0 ? total : (counts.get(PATIENT_FUNNEL_STEPS[index - 1].key) ?? 0);
    return {
      key: step.key,
      label: step.label,
      total,
      uniqueActors: unique,
      conversionFromStart: firstTotal ? Math.round((total / firstTotal) * 100) : 0,
      conversionFromPrevious: prevTotal
        ? Math.round((total / prevTotal) * 100)
        : index === 0
          ? 100
          : 0
    };
  });

  const dailyTrend = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayCounts]) => ({
      date,
      consultationBooked: dayCounts.get(PRODUCT_EVENTS.CONSULTATION_BOOKED) ?? 0,
      paymentCompleted: dayCounts.get(PRODUCT_EVENTS.PAYMENT_COMPLETED) ?? 0,
      prescriptionPublished: dayCounts.get(PRODUCT_EVENTS.PRESCRIPTION_PUBLISHED) ?? 0,
      doseTaken: dayCounts.get(PRODUCT_EVENTS.DOSE_TAKEN) ?? 0
    }));

  return {
    windowDays,
    summary: {
      patientLogins: counts.get(PRODUCT_EVENTS.PATIENT_LOGIN) ?? 0,
      consultationsBooked: counts.get(PRODUCT_EVENTS.CONSULTATION_BOOKED) ?? 0,
      paymentsCompleted: counts.get(PRODUCT_EVENTS.PAYMENT_COMPLETED) ?? 0,
      prescriptionsPublished: counts.get(PRODUCT_EVENTS.PRESCRIPTION_PUBLISHED) ?? 0,
      dosesTaken: counts.get(PRODUCT_EVENTS.DOSE_TAKEN) ?? 0,
      doctorWorklistViews: counts.get(PRODUCT_EVENTS.DOCTOR_WORKLIST_VIEWED) ?? 0
    },
    funnel,
    dailyTrend
  };
}

export async function buildHopeHubAnalyticsReport(days: number) {
  const windowDays = Math.min(90, Math.max(1, days));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (windowDays - 1));
  start.setHours(0, 0, 0, 0);

  const eventNames = [
    ...HOPE_HUB_FUNNEL_STEPS.map((step) => step.key),
    HOPE_HUB_EVENTS.LOGIN_REQUIRED,
    HOPE_HUB_EVENTS.PAYMENT_FAILED,
    HOPE_HUB_EVENTS.FOLLOW_UP_REQUESTED
  ];

  const [events, consultations, payments] = await Promise.all([
    prisma.productEvent.findMany({
      where: { name: { in: eventNames }, createdAt: { gte: start, lte: end } },
      select: { name: true, createdAt: true, actorId: true, properties: true }
    }),
    prisma.consultation.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        OR: [
          { disease: { publicCategory: 'Hope Hub' } },
          { intakeAnswers: { path: ['source'], equals: 'hope-hub' } }
        ]
      },
      select: {
        id: true,
        createdAt: true,
        billingPlanCode: true,
        intakeAnswers: true,
        pricingSnapshot: true,
        disease: { select: { name: true } },
        payment: {
          select: {
            status: true,
            amountInPaise: true,
            discountInPaise: true,
            lineItems: true
          }
        }
      }
    }),
    prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        consultation: {
          OR: [
            { disease: { publicCategory: 'Hope Hub' } },
            { intakeAnswers: { path: ['source'], equals: 'hope-hub' } }
          ]
        }
      },
      select: { status: true, amountInPaise: true, discountInPaise: true, lineItems: true }
    })
  ]);

  const counts = new Map<string, number>();
  const uniqueActors = new Map<string, Set<string>>();
  const daily = new Map<string, Map<string, number>>();
  for (const name of eventNames) {
    counts.set(name, 0);
    uniqueActors.set(name, new Set());
  }

  const topServiceCounts = new Map<string, number>();
  const topOfferCounts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    if (event.actorId) uniqueActors.get(event.name)?.add(event.actorId);
    const dayKey = event.createdAt.toISOString().slice(0, 10);
    if (!daily.has(dayKey)) daily.set(dayKey, new Map());
    const dayMap = daily.get(dayKey)!;
    dayMap.set(event.name, (dayMap.get(event.name) ?? 0) + 1);

    const properties = (event.properties || {}) as Record<string, unknown>;
    const serviceName = String(properties['serviceName'] || '').trim();
    const offeringTitle = String(properties['offeringTitle'] || '').trim();
    if (serviceName)
      topServiceCounts.set(serviceName, (topServiceCounts.get(serviceName) ?? 0) + 1);
    if (offeringTitle)
      topOfferCounts.set(offeringTitle, (topOfferCounts.get(offeringTitle) ?? 0) + 1);
  }

  let revenueInPaise = 0;
  let failedPayments = 0;
  let pendingPayments = 0;
  let offerDiscountInPaise = 0;
  let checkoutDiscountInPaise = 0;
  const couponUsage = new Map<string, { count: number; discountInPaise: number }>();

  for (const payment of payments) {
    if (
      payment.status === PaymentStatus.PAID ||
      payment.status === PaymentStatus.PARTIALLY_REFUNDED
    ) {
      revenueInPaise += payment.amountInPaise || 0;
    } else if (payment.status === PaymentStatus.FAILED) {
      failedPayments += 1;
    } else if (payment.status === PaymentStatus.CREATED) {
      pendingPayments += 1;
    }
    const lineItems = (payment.lineItems || {}) as Record<string, any>;
    offerDiscountInPaise += Number(lineItems['offerDiscountInPaise'] || 0);
    checkoutDiscountInPaise += Number(
      lineItems['checkoutDiscountInPaise'] || payment.discountInPaise || 0
    );
    const rule = lineItems['offerDiscountRule'] as Record<string, any> | null;
    const coupon = String(
      rule?.['code'] || rule?.['discountCode'] || lineItems['couponCode'] || ''
    ).trim();
    if (coupon) {
      const current = couponUsage.get(coupon) || { count: 0, discountInPaise: 0 };
      current.count += 1;
      current.discountInPaise += Number(
        lineItems['offerDiscountInPaise'] || payment.discountInPaise || 0
      );
      couponUsage.set(coupon, current);
    }
  }

  for (const consultation of consultations) {
    const intake = (consultation.intakeAnswers || {}) as Record<string, unknown>;
    const snapshot = (consultation.pricingSnapshot || {}) as Record<string, unknown>;
    const serviceName = String(
      snapshot['serviceName'] || intake['serviceName'] || consultation.disease?.name || 'Hope Hub'
    );
    const offeringTitle = String(snapshot['offeringTitle'] || intake['offeringTitle'] || '').trim();
    topServiceCounts.set(serviceName, (topServiceCounts.get(serviceName) ?? 0) + 1);
    if (offeringTitle)
      topOfferCounts.set(offeringTitle, (topOfferCounts.get(offeringTitle) ?? 0) + 1);
  }

  const funnel = HOPE_HUB_FUNNEL_STEPS.map((step, index) => {
    const total = counts.get(step.key) ?? 0;
    const firstTotal = counts.get(HOPE_HUB_FUNNEL_STEPS[0].key) ?? 0;
    const prevTotal = index === 0 ? total : (counts.get(HOPE_HUB_FUNNEL_STEPS[index - 1].key) ?? 0);
    return {
      key: step.key,
      label: step.label,
      total,
      uniqueActors: uniqueActors.get(step.key)?.size ?? 0,
      conversionFromStart: firstTotal ? Math.round((total / firstTotal) * 100) : 0,
      conversionFromPrevious: prevTotal
        ? Math.round((total / prevTotal) * 100)
        : index === 0
          ? 100
          : 0
    };
  });

  const dailyTrend = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayCounts]) => ({
      date,
      serviceViewed: dayCounts.get(HOPE_HUB_EVENTS.SERVICE_VIEWED) ?? 0,
      bookingOpened: dayCounts.get(HOPE_HUB_EVENTS.BOOKING_FORM_OPENED) ?? 0,
      slotSelected: dayCounts.get(HOPE_HUB_EVENTS.SLOT_SELECTED) ?? 0,
      paymentStarted:
        (dayCounts.get(HOPE_HUB_EVENTS.PAYMENT_STARTED) ?? 0) +
        (dayCounts.get(PRODUCT_EVENTS.PAYMENT_INITIATED) ?? 0),
      paymentSuccess:
        (dayCounts.get(HOPE_HUB_EVENTS.PAYMENT_SUCCESS) ?? 0) +
        (dayCounts.get(PRODUCT_EVENTS.PAYMENT_COMPLETED) ?? 0),
      paymentFailed: dayCounts.get(HOPE_HUB_EVENTS.PAYMENT_FAILED) ?? 0
    }));

  const toTopRows = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    windowDays,
    summary: {
      bookings: consultations.length,
      revenueInPaise,
      failedPayments,
      pendingPayments,
      paymentStarted:
        (counts.get(HOPE_HUB_EVENTS.PAYMENT_STARTED) ?? 0) +
        (counts.get(PRODUCT_EVENTS.PAYMENT_INITIATED) ?? 0),
      paymentSuccess:
        (counts.get(HOPE_HUB_EVENTS.PAYMENT_SUCCESS) ?? 0) +
        (counts.get(PRODUCT_EVENTS.PAYMENT_COMPLETED) ?? 0),
      loginRequired: counts.get(HOPE_HUB_EVENTS.LOGIN_REQUIRED) ?? 0,
      followUpsRequested: counts.get(HOPE_HUB_EVENTS.FOLLOW_UP_REQUESTED) ?? 0,
      offerDiscountInPaise,
      checkoutDiscountInPaise
    },
    funnel,
    dailyTrend,
    topServices: toTopRows(topServiceCounts),
    topOffers: toTopRows(topOfferCounts),
    couponUsage: Array.from(couponUsage.entries()).map(([code, value]) => ({ code, ...value }))
  };
}
