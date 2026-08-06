import { Router } from 'express';
import { z } from 'zod';
import { CareTeamMemberType } from '@prisma/client';
import { prisma } from '../db.js';
import { notifyAdminsAboutProviderApplication } from '../services/provider-application-notifications.js';
import { asyncRoute } from '../utils/helpers.js';

export const counsellorApplicationsRouter = Router();

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

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
    }
  });

counsellorApplicationsRouter.post(
  '/counsellor-applications',
  asyncRoute(async (req, res) => {
    const body = counsellorApplicationSchema.parse(req.body);
    const application = await prisma.counsellorApplication.create({
      data: {
        applicationTrack: body.applicationTrack,
        careTeamType: body.careTeamType || CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
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
        whyJoin: body.whyJoin,
        entryPage: body.entryPage || req.get('referer') || null
      }
    });

    await notifyAdminsAboutProviderApplication(application);

    res.status(201).json({ applicationId: application.id, success: true });
  })
);
