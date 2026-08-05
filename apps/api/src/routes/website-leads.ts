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
