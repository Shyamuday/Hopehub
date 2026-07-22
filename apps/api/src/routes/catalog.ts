import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { DEFAULT_BILLING_PLANS } from '../constants/billing.constants.js';
import { asyncRoute, routeParam, queryText } from '../utils/helpers.js';
import {
  DISEASE_PUBLIC_CATEGORIES,
  DISEASE_PUBLIC_CATEGORY_KEYS
} from '../constants/disease-categories.constants.js';
import {
  getDiseaseBySlug,
  groupDiseasesByCategory,
  listDiseases,
  parsePublicFaq,
  reconcileDiagnosedDiseaseOptions,
  resolveDiseaseSlugInput,
  syncDiagnosedDiseaseOption,
  syncDiseaseCatalog
} from '../services/disease-catalog.js';
import { resolveDiseaseConsultationFee } from '../services/consultation-pricing.js';
import {
  getDiseasePublicPageEditPayload,
  mergeDiseasePublicPage,
  parsePublicPageContent,
  updateDiseasePublicPage
} from '../services/disease-public-page.js';
import { diseasePublicPageUpdateSchema } from '../types/disease-public-page.js';

export const router = Router();

const diseaseFaqSchema = z.array(
  z.object({
    question: z.string().min(3),
    answer: z.string().min(3)
  })
);

const diseaseMarketingFields = {
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(80)
    .nullable()
    .optional(),
  publicDescription: z.string().max(20_000).nullable().optional(),
  publicImageUrl: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  publicFaq: diseaseFaqSchema.nullable().optional()
};

export async function ensureBillingPlans() {
  await Promise.all(
    DEFAULT_BILLING_PLANS.map((plan) =>
      prisma.billingPlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          planType: plan.planType,
          priceInPaise: plan.priceInPaise,
          consultationsLimit: plan.consultationsLimit,
          isActive: true,
          sortOrder: plan.sortOrder
        },
        create: plan
      })
    )
  );
}

// ─── Public disease list ───────────────────────────────────────────────────────

router.get(
  '/diseases/categories',
  asyncRoute(async (_req, res) => {
    res.json({ categories: DISEASE_PUBLIC_CATEGORIES });
  })
);

router.get(
  '/diseases',
  asyncRoute(async (req, res) => {
    const q = queryText(req, 'q').trim() || undefined;
    const category = queryText(req, 'category').trim() || undefined;
    const grouped = queryText(req, 'grouped') !== 'false';
    const clinicStoreId = queryText(req, 'clinicStoreId').trim() || undefined;

    const diseases = await listDiseases({ q, category, activeOnly: true });
    const withFees = await Promise.all(
      diseases.map(async (disease) => {
        const feeInPaise = await resolveDiseaseConsultationFee(disease.id, clinicStoreId ?? null);
        return { ...disease, feeInPaise, baseFeeInPaise: disease.feeInPaise };
      })
    );

    if (!grouped) {
      res.json({ diseases: withFees });
      return;
    }

    res.json({
      diseases: withFees,
      ...groupDiseasesByCategory(withFees, { includeEmpty: !q && !category })
    });
  })
);

router.get(
  '/diseases/by-slug/:slug',
  asyncRoute(async (req, res) => {
    const disease = await getDiseaseBySlug(routeParam(req, 'slug'));
    if (!disease || !disease.isActive) {
      res.status(404).json({ message: 'Disease not found.' });
      return;
    }
    res.json({
      disease: {
        ...disease,
        publicFaq: parsePublicFaq(disease.publicFaq),
        publicPageContent: parsePublicPageContent(disease.publicPageContent),
        publicPage: mergeDiseasePublicPage(disease)
      }
    });
  })
);

// ─── Billing plans ─────────────────────────────────────────────────────────────

router.get(
  '/billing/plans',
  asyncRoute(async (_req, res) => {
    await ensureBillingPlans();
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceInPaise: 'asc' }]
    });
    res.json({ plans });
  })
);

// ─── Admin disease CRUD (kept alongside public routes for cohesion) ────────────

router.get(
  '/admin/diseases/categories',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (_req, res) => {
    res.json({ categories: DISEASE_PUBLIC_CATEGORIES });
  })
);

router.get(
  '/admin/diseases/list',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const q = queryText(req, 'q').trim() || undefined;
    const category = queryText(req, 'category').trim() || undefined;
    const grouped = queryText(req, 'grouped') !== 'false';

    const diseases = await prisma.disease.findMany({
      where: {
        ...(category ? { publicCategory: category } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
      },
      orderBy: [{ publicCategory: 'asc' }, { name: 'asc' }]
    });

    if (grouped) {
      const groupedDiseases = diseases.map((disease) => ({
        id: disease.id,
        name: disease.name,
        slug: disease.slug,
        description: disease.description,
        publicDescription: disease.publicDescription,
        publicImageUrl: disease.publicImageUrl,
        seoTitle: disease.seoTitle,
        seoDescription: disease.seoDescription,
        publicFaq: parsePublicFaq(disease.publicFaq),
        publicCategory: disease.publicCategory,
        feeInPaise: disease.feeInPaise,
        isActive: disease.isActive
      }));
      res.json({
        diseases,
        ...groupDiseasesByCategory(groupedDiseases, { includeEmpty: !q && !category })
      });
      return;
    }

    res.json({ diseases });
  })
);

router.post(
  '/admin/diseases/sync-catalog',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        defaultFeeInPaise: z.number().int().positive().optional()
      })
      .parse(req.body ?? {});

    const result = await syncDiseaseCatalog(body.defaultFeeInPaise);
    res.json(result);
  })
);

router.get(
  '/admin/diseases/:id/public-page',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const payload = await getDiseasePublicPageEditPayload(routeParam(req, 'id'));
    if (!payload) {
      res.status(404).json({ message: 'Disease not found.' });
      return;
    }
    res.json(payload);
  })
);

router.put(
  '/admin/diseases/:id/public-page',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = diseasePublicPageUpdateSchema.parse(req.body);
    const result = await updateDiseasePublicPage(routeParam(req, 'id'), body);
    if (!result) {
      res.status(404).json({ message: 'Disease not found.' });
      return;
    }
    res.json(result);
  })
);

router.post(
  '/admin/diseases/reconcile-options',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (_req, res) => {
    const result = await reconcileDiagnosedDiseaseOptions();
    res.json(result);
  })
);

router.post(
  '/admin/diseases',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        intakeQuestions: z.array(z.string().min(3)).min(1),
        publicCategory: z.enum(DISEASE_PUBLIC_CATEGORY_KEYS as [string, ...string[]]).optional(),
        ...diseaseMarketingFields
      })
      .parse(req.body);

    const disease = await prisma.disease.create({
      data: {
        name: body.name,
        description: body.description,
        feeInPaise: body.feeInPaise,
        intakeQuestions: body.intakeQuestions,
        publicCategory: body.publicCategory,
        publicDescription: body.publicDescription ?? null,
        publicImageUrl: body.publicImageUrl ?? null,
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        publicFaq: body.publicFaq ?? [],
        slug: await resolveDiseaseSlugInput(body.name, body.slug)
      }
    });
    await syncDiagnosedDiseaseOption(body.name);
    res.status(201).json({ disease: { ...disease, publicFaq: parsePublicFaq(disease.publicFaq) } });
  })
);

router.put(
  '/admin/diseases/:id',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(3),
        description: z.string().min(3),
        feeInPaise: z.number().int().positive(),
        isActive: z.boolean(),
        intakeQuestions: z.array(z.string().min(1)).min(1),
        publicCategory: z
          .enum(DISEASE_PUBLIC_CATEGORY_KEYS as [string, ...string[]])
          .nullable()
          .optional(),
        ...diseaseMarketingFields
      })
      .parse(req.body);

    const existing = await prisma.disease.findUnique({ where: { id: routeParam(req, 'id') } });
    if (!existing) {
      res.status(404).json({ message: 'Disease not found.' });
      return;
    }

    const disease = await prisma.disease.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        description: body.description,
        feeInPaise: body.feeInPaise,
        isActive: body.isActive,
        intakeQuestions: body.intakeQuestions,
        publicCategory: body.publicCategory,
        publicDescription: body.publicDescription,
        publicImageUrl: body.publicImageUrl ?? null,
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        publicFaq: body.publicFaq ?? [],
        slug: await resolveDiseaseSlugInput(body.name, body.slug, existing.id)
      }
    });
    await syncDiagnosedDiseaseOption(body.name);
    res.json({ disease: { ...disease, publicFaq: parsePublicFaq(disease.publicFaq) } });
  })
);

/** Public endpoint — returns doctors marked for website display. No auth required. */
router.get(
  '/doctors',
  asyncRoute(async (_req, res) => {
    const limitConfig = await prisma.siteConfig.findUnique({ where: { key: 'doctorListLimit' } });
    const limit = limitConfig
      ? Math.max(1, Math.min(50, parseInt(limitConfig.value, 10) || 12))
      : 12;

    const doctors = await prisma.doctor.findMany({
      where: { showOnWebsite: true, user: { isActive: true } },
      select: {
        id: true,
        specialty: true,
        doctorType: true,
        specialtyFocus: true,
        bio: true,
        yearsOfExperience: true,
        focusAreas: true,
        designation: true,
        websiteOrder: true,
        user: { select: { id: true, name: true } }
      },
      orderBy: [{ websiteOrder: { sort: 'asc', nulls: 'last' } }, { user: { name: 'asc' } }],
      take: limit
    });

    res.json({ doctors, limit });
  })
);

/** Public endpoint — published testimonials ordered by sortOrder then newest. */
router.get(
  '/testimonials',
  asyncRoute(async (_req, res) => {
    const testimonials = await prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
    });
    res.json({ testimonials });
  })
);

/** Public endpoint — published FAQ entries ordered by category + sortOrder. */
router.get(
  '/faq',
  asyncRoute(async (_req, res) => {
    const entries = await prisma.faqEntry.findMany({
      where: { isPublished: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' }
      ]
    });
    res.json({ entries });
  })
);

/** Public clinic branches for online booking location selection. */
router.get(
  '/clinics',
  asyncRoute(async (_req, res) => {
    const clinics = await prisma.store.findMany({
      where: { isActive: true, kind: 'BRANCH' },
      select: { id: true, name: true, code: true, address: true, phone: true },
      orderBy: { name: 'asc' }
    });
    res.json({ clinics });
  })
);

/** Public endpoint — select SiteConfig keys exposed to the public website. */
router.get(
  '/public-config',
  asyncRoute(async (_req, res) => {
    const PUBLIC_KEYS = [
      'whatsappPhone',
      'clinicName',
      'contactPhone',
      'contactPhoneTel',
      'contactEmail',
      'clinicAddressLine1',
      'clinicAddressLine2',
      'clinicAddressLine3',
      'clinicAddressLine4',
      'homeHeroEyebrow',
      'homeHeroHeadline',
      'homeHeroLead',
      'statConsultations',
      'statDoctors',
      'statRating',
      'statFollowUp',
      'statPatientsTreated',
      'statConditionsTreated',
      'statImprovement',
      'statSatisfaction'
    ];
    const DEFAULTS: Record<string, string> = {
      whatsappPhone: '919876543210',
      clinicName: 'HopeHub Care and Research Centre',
      contactPhone: '+91-98765-43210',
      contactPhoneTel: '+919876543210',
      contactEmail: 'support@hopehubcare.in',
      clinicAddressLine1: 'Ranchi Main Clinic',
      clinicAddressLine2: 'Near City Centre, Main Road',
      clinicAddressLine3: 'Ranchi, Jharkhand, India',
      clinicAddressLine4: 'Pincode — 834001',
      homeHeroEyebrow: 'Doctor-led homeopathy',
      homeHeroHeadline: 'Personalised homeopathic care for every health concern.',
      homeHeroLead:
        'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, and more — consult qualified homeopathic doctors online with prescriptions and follow-up.',
      statConsultations: '5,000+',
      statDoctors: '12+',
      statRating: '4.8★',
      statFollowUp: '92%',
      statPatientsTreated: '4,800+',
      statConditionsTreated: '15+',
      statImprovement: '92%',
      statSatisfaction: '4.8 / 5'
    };
    const rows = await prisma.siteConfig.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const map: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const config = Object.fromEntries(PUBLIC_KEYS.map((k) => [k, map[k] ?? DEFAULTS[k] ?? '']));
    res.json({ config });
  })
);
