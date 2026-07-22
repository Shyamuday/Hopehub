import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

/** Allowed config keys and their human-readable labels. */
const CONFIG_META: Record<string, { label: string; description: string }> = {
  doctorListLimit: {
    label: 'Doctor list limit',
    description: 'Maximum number of doctors shown on the public Our Doctors page (1–50).'
  },
  whatsappPhone: {
    label: 'WhatsApp phone number',
    description:
      'Phone number (with country code, no +) used for all WhatsApp CTAs site-wide. E.g. 919876543210.'
  },
  clinicName: {
    label: 'Clinic name',
    description: 'Public clinic name shown in header, emails, and meta tags.'
  },
  statConsultations: {
    label: 'Stat: consultations completed',
    description: 'Public headline stat shown on the homepage. E.g. "5,000+".'
  },
  statDoctors: {
    label: 'Stat: number of doctors',
    description: 'Public headline stat for provider count. E.g. "12+".'
  },
  statRating: {
    label: 'Stat: patient rating',
    description: 'Public satisfaction rating. E.g. "4.8★".'
  },
  statFollowUp: {
    label: 'Stat: follow-up compliance',
    description: 'Public follow-up stat. E.g. "92%".'
  },
  statPatientsTreated: {
    label: 'Testimonials: patients treated',
    description: 'Shown on the testimonials page. E.g. "4,800+".'
  },
  statConditionsTreated: {
    label: 'Testimonials: conditions treated',
    description: 'Shown on the testimonials page. E.g. "15+".'
  },
  statImprovement: {
    label: 'Testimonials: improvement rate',
    description: 'Shown on the testimonials page. E.g. "92%".'
  },
  statSatisfaction: {
    label: 'Testimonials: satisfaction score',
    description: 'Shown on the testimonials page. E.g. "4.8 / 5".'
  },
  contactPhone: {
    label: 'Contact phone (display)',
    description: 'Phone shown in the site footer. E.g. +91-98765-43210.'
  },
  contactPhoneTel: {
    label: 'Contact phone (tel link)',
    description: 'Digits for tel: links. E.g. +919876543210.'
  },
  contactEmail: {
    label: 'Contact email',
    description: 'Support email shown in the footer.'
  },
  clinicAddressLine1: {
    label: 'Address line 1',
    description: 'First line of clinic address in the footer.'
  },
  clinicAddressLine2: {
    label: 'Address line 2',
    description: 'Second address line.'
  },
  clinicAddressLine3: {
    label: 'Address line 3',
    description: 'Third address line (city/state).'
  },
  clinicAddressLine4: {
    label: 'Address line 4',
    description: 'Fourth address line (pincode/country).'
  },
  homeHeroEyebrow: {
    label: 'Home hero eyebrow',
    description: 'Small label above the homepage headline.'
  },
  homeHeroHeadline: {
    label: 'Home hero headline',
    description: 'Main headline on the homepage booking section.'
  },
  homeHeroLead: {
    label: 'Home hero lead text',
    description: 'Supporting paragraph under the homepage headline.'
  }
};

const ALLOWED_KEYS = Object.keys(CONFIG_META);

export function registerAdminSiteConfigRoutes(router: Router) {
  /** GET all known site config entries (fills in defaults for missing keys). */
  router.get(
    '/admin/site-config',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const rows = await prisma.siteConfig.findMany({ where: { key: { in: ALLOWED_KEYS } } });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      const config = ALLOWED_KEYS.map((key) => ({
        key,
        value: map[key] ?? defaults[key] ?? '',
        label: CONFIG_META[key].label,
        description: CONFIG_META[key].description
      }));

      res.json({ config });
    })
  );

  /** PATCH a single site config key. */
  router.patch(
    '/admin/site-config/:key',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const key = routeParam(req, 'key');
      if (!ALLOWED_KEYS.includes(key)) {
        return res.status(400).json({ message: `Unknown config key: ${key}` });
      }

      const { value } = z.object({ value: z.string().min(1).max(500) }).parse(req.body);

      const row = await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label: CONFIG_META[key].label },
        update: { value }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'site_config.update',
        targetType: 'site_config',
        targetId: key,
        summary: `Site config "${key}" updated to "${value}".`,
        metadata: { key, value }
      });

      res.json({ config: row });
    })
  );
}

const defaults: Record<string, string> = {
  doctorListLimit: '12',
  whatsappPhone: '919876543210',
  clinicName: 'HopeHub Care and Research Centre',
  statConsultations: '5,000+',
  statDoctors: '12+',
  statRating: '4.8★',
  statFollowUp: '92%',
  statPatientsTreated: '4,800+',
  statConditionsTreated: '15+',
  statImprovement: '92%',
  statSatisfaction: '4.8 / 5',
  contactPhone: '+91-98765-43210',
  contactPhoneTel: '+919876543210',
  contactEmail: 'support@hopehubcare.in',
  clinicAddressLine1: 'Ranchi Main Clinic',
  clinicAddressLine2: 'Near City Centre, Main Road',
  clinicAddressLine3: 'Ranchi, Jharkhand, India',
  clinicAddressLine4: 'Pincode — 834001',
  homeHeroEyebrow: 'Provider-led healthcare',
  homeHeroHeadline: 'Personalised care for every health concern.',
  homeHeroLead:
    'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, nutrition, rehabilitation, and more - consult qualified healthcare providers online with guidance, prescriptions where appropriate, and follow-up.'
};
