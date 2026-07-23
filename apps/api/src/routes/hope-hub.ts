import { Router } from 'express';
import { z } from 'zod';
import { PaymentStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, includeConsultationRelations, queryText } from '../utils/helpers.js';
import { ensureBillingPlans } from './catalog.js';
import { resolveConsultationCheckout } from '../services/checkout-pricing.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';

export const hopeHubRouter = Router();

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
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function defaultDescription(serviceName: string) {
  return `Hope Hub consultation request for ${serviceName}.`;
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

hopeHubRouter.post(
  '/hope-hub/bookings',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = hopeHubBookingSchema.parse(req.body);
    const amountInPaise = body.servicePriceInPaise ?? 99900;
    const slug = slugify(body.serviceName);

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

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user!.id,
        diseaseId: disease.id,
        clinicStoreId: null,
        consultationMode: 'INSTANT_ONLINE',
        intakeAnswers: {
          source: 'hope-hub',
          serviceName: body.serviceName,
          message: body.message || '',
          appointmentDate: body.appointmentDate,
          appointmentTime: body.appointmentTime,
          consultantName: body.consultantName || '',
          consultantPhone: body.consultantPhone || '',
          sessionDuration: body.sessionDuration || '',
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
              consultationFeeInPaise: checkout.grossAmountInPaise,
              discountInPaise: checkout.discountInPaise,
              walletRedeemedInPaise: checkout.walletRedeemedInPaise,
              payableInPaise: checkout.payableInPaise,
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
        serviceName: body.serviceName
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
