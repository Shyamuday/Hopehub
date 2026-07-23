import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../utils/helpers.js';

export const counsellorApplicationsRouter = Router();

export const counsellorApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  city: z.string().trim().min(2).max(120),
  qualification: z.string().trim().min(2).max(180),
  specialization: z.string().trim().min(2).max(160),
  experienceYears: z.string().trim().min(1).max(80),
  registrationDetails: z.string().trim().max(180).optional().or(z.literal('')),
  languages: z.string().trim().min(2).max(180),
  availability: z.string().trim().min(2).max(180),
  preferredChannel: z.enum(['email', 'phone', 'whatsapp', 'telegram']),
  resumeLink: z.string().trim().min(5).max(500),
  portfolioLink: z.string().trim().max(500).optional().or(z.literal('')),
  whyJoin: z.string().trim().min(40).max(3000),
  entryPage: z.string().trim().max(500).optional().or(z.literal(''))
});

counsellorApplicationsRouter.post(
  '/counsellor-applications',
  asyncRoute(async (req, res) => {
    const body = counsellorApplicationSchema.parse(req.body);
    const application = await prisma.counsellorApplication.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        city: body.city,
        qualification: body.qualification,
        specialization: body.specialization,
        experienceYears: body.experienceYears,
        registrationDetails: body.registrationDetails || null,
        languages: body.languages,
        availability: body.availability,
        preferredChannel: body.preferredChannel,
        resumeLink: body.resumeLink,
        portfolioLink: body.portfolioLink || null,
        whyJoin: body.whyJoin,
        entryPage: body.entryPage || req.get('referer') || null
      }
    });

    res.status(201).json({ applicationId: application.id, success: true });
  })
);
