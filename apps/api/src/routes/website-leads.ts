import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authOptional } from '../auth.js';
import { upsertWebsiteLead } from '../services/website-leads.service.js';
import { notifyStaffOnVisitorLead } from '../services/visitor-lead-notifications.js';
import { asyncRoute } from '../utils/helpers.js';

export const websiteLeadsRouter = Router();

const websiteLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  serviceInterest: z.string().trim().max(160).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(3000),
  preferredContact: z.enum(['email', 'phone', 'whatsapp', 'telegram']).optional(),
  urgencyLevel: z.enum(['low', 'normal', 'high']).optional(),
  preferredTime: z.string().trim().max(120).optional().or(z.literal('')),
  preferAnonymousTelegram: z.boolean().optional(),
  appointmentDate: z.string().trim().max(80).optional().or(z.literal('')),
  appointmentTime: z.string().trim().max(80).optional().or(z.literal('')),
  selectedService: z.string().trim().max(160).optional().or(z.literal('')),
  selectedConsultant: z.string().trim().max(160).optional().or(z.literal('')),
  consultantPhone: z.string().trim().max(30).optional().or(z.literal('')),
  sessionDuration: z.string().trim().max(80).optional().or(z.literal('')),
  bookingSource: z.string().trim().max(120).optional().or(z.literal('')),
  entryPage: z.string().trim().max(500).optional().or(z.literal('')),
  visitorKey: z.string().trim().max(80).optional().or(z.literal(''))
});

const feedbackSchema = z.object({
  feedbackType: z.enum([
    'IMPROVEMENT',
    'COMPLAINT',
    'BUG',
    'SERVICE_EXPERIENCE',
    'PRAISE',
    'OTHER'
  ]),
  message: z.string().trim().min(15).max(4000),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  pageOrFeature: z.string().trim().max(160).optional().or(z.literal('')),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  preferredContact: z.enum(['email', 'phone', 'whatsapp', 'telegram', 'none']).default('none'),
  allowFollowUp: z.boolean().default(false),
  isAnonymous: z.boolean().default(true),
  consentToPublish: z.boolean().default(false),
  entryPage: z.string().trim().max(500).optional().or(z.literal('')),
  visitorKey: z.string().trim().max(80).optional().or(z.literal(''))
});

const telegramAdminApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  telegramUsername: z
    .string()
    .trim()
    .regex(/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/, 'Enter a valid Telegram username.'),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  availability: z.enum(['DAILY', 'WEEKDAYS', 'WEEKENDS', 'EVENINGS', 'FLEXIBLE']),
  moderationExperience: z.string().trim().max(1500).optional().or(z.literal('')),
  motivation: z.string().trim().min(20).max(2000),
  ageConfirmed: z.literal(true),
  rulesAccepted: z.literal(true),
  safetyAccepted: z.literal(true),
  entryPage: z.string().trim().max(500).optional().or(z.literal('')),
  visitorKey: z.string().trim().max(80).optional().or(z.literal(''))
});

const TELEGRAM_ADMIN_AVAILABILITY_LABELS: Record<
  z.infer<typeof telegramAdminApplicationSchema>['availability'],
  string
> = {
  DAILY: 'A little time daily',
  WEEKDAYS: 'Weekdays',
  WEEKENDS: 'Weekends',
  EVENINGS: 'Evenings',
  FLEXIBLE: 'Flexible / as needed'
};

const FEEDBACK_TYPE_LABELS: Record<z.infer<typeof feedbackSchema>['feedbackType'], string> = {
  IMPROVEMENT: 'Improvement idea',
  COMPLAINT: 'Complaint',
  BUG: 'Bug or technical issue',
  SERVICE_EXPERIENCE: 'Service experience',
  PRAISE: 'Praise / review',
  OTHER: 'Other feedback'
};

function compactDetails(body: z.infer<typeof websiteLeadSchema>) {
  const details = [
    body.serviceInterest && `Service interest: ${body.serviceInterest}`,
    body.selectedService && `Selected service: ${body.selectedService}`,
    body.selectedConsultant && `Preferred consultant: ${body.selectedConsultant}`,
    body.consultantPhone && `Consultant phone: ${body.consultantPhone}`,
    body.sessionDuration && `Session duration: ${body.sessionDuration}`,
    body.appointmentDate && `Preferred date: ${body.appointmentDate}`,
    body.appointmentTime && `Preferred time: ${body.appointmentTime}`,
    body.preferredTime && `Preferred callback time: ${body.preferredTime}`,
    body.urgencyLevel && `Urgency: ${body.urgencyLevel}`,
    body.preferAnonymousTelegram && 'Low-identity Telegram follow-up requested',
    body.preferredContact && `Preferred contact: ${body.preferredContact}`,
    body.bookingSource && `Source: ${body.bookingSource}`,
    `Message: ${body.message}`
  ].filter(Boolean);

  return details.join('\n');
}

websiteLeadsRouter.post(
  '/website-leads',
  authOptional,
  asyncRoute(async (req, res) => {
    const body = websiteLeadSchema.parse(req.body);
    const lead = await upsertWebsiteLead({
      source: 'HOME_BOOKING',
      visitorName: body.name,
      visitorEmail: body.email || null,
      visitorPhone: body.phone || null,
      concern: compactDetails(body),
      entryPage: body.entryPage || req.get('referer') || null,
      visitorKey: body.visitorKey || null,
      preferredCallbackTime:
        body.preferredTime || body.appointmentDate || body.appointmentTime
          ? [body.preferredTime, body.appointmentDate, body.appointmentTime]
              .filter(Boolean)
              .join(' ')
          : null,
      userId: req.user?.id
    });

    res.status(201).json({ id: lead.id, success: true });
  })
);

websiteLeadsRouter.post(
  '/website-leads/telegram-admin-applications',
  authOptional,
  asyncRoute(async (req, res) => {
    const body = telegramAdminApplicationSchema.parse(req.body);
    const username = body.telegramUsername.startsWith('@')
      ? body.telegramUsername
      : `@${body.telegramUsername}`;
    const availability = TELEGRAM_ADMIN_AVAILABILITY_LABELS[body.availability];
    const concern = [
      'Application: Telegram group admin',
      `Telegram: ${username}`,
      body.city ? `City: ${body.city}` : null,
      `Availability: ${availability}`,
      `Moderation experience: ${body.moderationExperience || 'No prior experience shared'}`,
      `Why they want to help: ${body.motivation}`,
      'Age 18+ confirmed: Yes',
      'Community rules accepted: Yes',
      'Safety, privacy, and escalation responsibilities accepted: Yes'
    ]
      .filter(Boolean)
      .join('\n');

    const lead = await prisma.websiteLead.create({
      data: {
        source: 'HOME_BOOKING',
        followUpStatus: 'NEEDS_CALLBACK',
        visitorName: body.fullName,
        visitorEmail: body.email || req.user?.email || null,
        visitorPhone: body.phone || req.user?.mobile || null,
        concern,
        entryPage: body.entryPage || req.get('referer') || null,
        visitorKey: body.visitorKey || null,
        preferredCallbackTime: `${availability}; Telegram ${username}`,
        userId: req.user?.id ?? null
      }
    });

    void notifyStaffOnVisitorLead(lead);

    res.status(201).json({
      id: lead.id,
      success: true,
      message: 'Telegram group admin application submitted for review.'
    });
  })
);

websiteLeadsRouter.post(
  '/website-leads/feedback',
  authOptional,
  asyncRoute(async (req, res) => {
    const body = feedbackSchema.parse(req.body);
    const typeLabel = FEEDBACK_TYPE_LABELS[body.feedbackType];
    const canContact =
      body.allowFollowUp &&
      body.preferredContact !== 'none' &&
      Boolean(body.email || body.phone || req.user?.email || req.user?.mobile);
    const visitorName =
      body.isAnonymous && !body.allowFollowUp ? null : body.name || req.user?.name || null;
    const visitorEmail = body.email || req.user?.email || null;
    const visitorPhone = body.phone || req.user?.mobile || null;
    const concern = [
      `Feedback type: ${typeLabel}`,
      body.rating ? `Rating: ${body.rating}/5` : null,
      body.pageOrFeature ? `Page/feature: ${body.pageOrFeature}` : null,
      `Follow-up allowed: ${canContact ? `Yes via ${body.preferredContact}` : 'No'}`,
      body.consentToPublish ? 'Publish consent: Yes, after admin approval' : 'Publish consent: No',
      `Message: ${body.message}`
    ]
      .filter(Boolean)
      .join('\n');

    const lead = await prisma.websiteLead.create({
      data: {
        source: 'HOME_BOOKING',
        followUpStatus: body.feedbackType === 'PRAISE' && !canContact ? 'NEW' : 'NEEDS_CALLBACK',
        visitorName,
        visitorEmail: canContact ? visitorEmail : visitorEmail || null,
        visitorPhone: canContact ? visitorPhone : visitorPhone || null,
        concern,
        entryPage: body.entryPage || req.get('referer') || null,
        visitorKey: body.visitorKey || null,
        preferredCallbackTime: canContact ? `Preferred contact: ${body.preferredContact}` : null,
        userId: req.user?.id ?? null
      }
    });

    let testimonialId: string | null = null;
    if (body.consentToPublish) {
      const testimonial = await prisma.testimonial.create({
        data: {
          patientName:
            body.isAnonymous || !visitorName?.trim() ? 'Anonymous Hope Hub member' : visitorName,
          condition: body.pageOrFeature || typeLabel,
          quote: body.message,
          stars: body.rating ?? 5,
          isAnonymous: body.isAnonymous,
          consentToPublish: true,
          submitterEmail: visitorEmail,
          source: 'public-feedback',
          entryPage: body.entryPage || req.get('referer') || null,
          isPublished: false
        }
      });
      testimonialId = testimonial.id;
    }

    void notifyStaffOnVisitorLead(lead);

    res.status(201).json({
      id: lead.id,
      testimonialId,
      success: true,
      message: 'Feedback submitted for admin review.'
    });
  })
);
