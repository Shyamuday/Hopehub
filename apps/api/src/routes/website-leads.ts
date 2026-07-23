import { Router } from 'express';
import { z } from 'zod';
import { authOptional } from '../auth.js';
import { upsertWebsiteLead } from '../services/website-leads.service.js';
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
