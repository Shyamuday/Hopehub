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
import { groupDiseasesByCategory, syncDiseaseCatalog } from '../services/disease-catalog.js';

export const router = Router();

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

    const diseases = await prisma.disease.findMany({
      where: {
        isActive: true,
        ...(category ? { publicCategory: category } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
      },
      orderBy: [{ publicCategory: 'asc' }, { name: 'asc' }]
    });

    if (!grouped) {
      res.json({ diseases });
      return;
    }

    const groupedRows = diseases.map((disease) => ({
      id: disease.id,
      name: disease.name,
      description: disease.description,
      publicCategory: disease.publicCategory,
      feeInPaise: disease.feeInPaise,
      isActive: disease.isActive
    }));

    res.json({
      diseases,
      ...groupDiseasesByCategory(groupedRows, { includeEmpty: !q && !category })
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
        description: disease.description,
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
        publicCategory: z.enum(DISEASE_PUBLIC_CATEGORY_KEYS as [string, ...string[]]).optional()
      })
      .parse(req.body);

    const disease = await prisma.disease.create({ data: body });
    res.status(201).json({ disease });
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
        publicCategory: z.enum(DISEASE_PUBLIC_CATEGORY_KEYS as [string, ...string[]]).nullable().optional()
      })
      .parse(req.body);

    const disease = await prisma.disease.update({
      where: { id: routeParam(req, 'id') },
      data: body
    });
    res.json({ disease });
  })
);

/** Public endpoint — returns doctors marked for website display. No auth required. */
router.get(
  '/doctors',
  asyncRoute(async (_req, res) => {
    const limitConfig = await prisma.siteConfig.findUnique({ where: { key: 'doctorListLimit' } });
    const limit = limitConfig ? Math.max(1, Math.min(50, parseInt(limitConfig.value, 10) || 12)) : 12;

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
      orderBy: [{ category: 'asc' }, { sortOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }]
    });
    res.json({ entries });
  })
);

/** Public endpoint — published blog posts with optional category filter. */
router.get(
  '/blog',
  asyncRoute(async (req, res) => {
    const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true, ...(category ? { category } : {}) },
      select: { id: true, slug: true, title: true, excerpt: true, category: true, readTime: true, publishedAt: true, createdAt: true },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
    });
    const categories = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    res.json({ posts, categories: categories.map((c) => c.category) });
  })
);

/** Public endpoint — select SiteConfig keys exposed to the public website. */
router.get(
  '/public-config',
  asyncRoute(async (_req, res) => {
    const PUBLIC_KEYS = [
      'whatsappPhone', 'clinicName',
      'statConsultations', 'statDoctors', 'statRating', 'statFollowUp',
      'statPatientsTreated', 'statConditionsTreated', 'statImprovement', 'statSatisfaction'
    ];
    const DEFAULTS: Record<string, string> = {
      whatsappPhone: '919876543210',
      clinicName: 'Vitalis Care and Research Centre',
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
