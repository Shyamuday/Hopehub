import { Router } from 'express';
import { Prisma, ProviderType, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { providerTypeLabel } from '../constants/homeopathic-doctor-types.js';
import { asyncRoute, queryText, routeParam, writeAuditLog } from '../utils/helpers.js';

export const servicesRouter = Router();

const serviceJsonArraySchema = z.array(z.string().min(1).max(500)).default([]);
const serviceFaqSchema = z
  .array(z.object({ question: z.string().min(3).max(300), answer: z.string().min(3).max(1200) }))
  .default([]);

const servicePayloadSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(100),
  title: z.string().min(3).max(160),
  shortTitle: z.string().max(80).nullable().optional(),
  category: z.string().min(2).max(80),
  subCategory: z.string().max(100).nullable().optional(),
  expertTypes: z.array(z.nativeEnum(ProviderType)).default([]),
  summary: z.string().min(10).max(1000),
  description: z.string().max(10_000).nullable().optional(),
  priceInPaise: z.number().int().min(0).max(5_000_000),
  compareAtPriceInPaise: z.number().int().min(0).max(5_000_000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(600).nullable().optional(),
  imageUrl: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  tags: z.array(z.string().min(1).max(40)).default([]),
  includes: serviceJsonArraySchema,
  outcomes: serviceJsonArraySchema,
  whoIsItFor: serviceJsonArraySchema,
  howItWorks: serviceJsonArraySchema,
  faqs: serviceFaqSchema,
  relatedDiseaseSlugs: z.array(z.string().min(1).max(100)).default([]),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});

const publicServiceQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  subCategory: z.string().trim().max(100).optional().default(''),
  expertType: z.nativeEnum(ProviderType).optional(),
  tag: z.string().trim().max(60).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  sort: z.enum(['featured', 'price-asc', 'price-desc', 'name']).optional().default('featured')
});

function jsonArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function jsonFaq(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { question: string; answer: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { question?: unknown }).question === 'string' &&
      typeof (item as { answer?: unknown }).answer === 'string'
  );
}

function serviceDto(service: {
  expertTypes: ProviderType[];
  includes: Prisma.JsonValue | null;
  outcomes: Prisma.JsonValue | null;
  whoIsItFor: Prisma.JsonValue | null;
  howItWorks: Prisma.JsonValue | null;
  faqs: Prisma.JsonValue | null;
  [key: string]: unknown;
}) {
  return {
    ...service,
    expertTypeLabels: service.expertTypes.map((type) => providerTypeLabel(type)),
    includes: jsonArray(service.includes),
    outcomes: jsonArray(service.outcomes),
    whoIsItFor: jsonArray(service.whoIsItFor),
    howItWorks: jsonArray(service.howItWorks),
    faqs: jsonFaq(service.faqs)
  };
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? []) as Prisma.InputJsonValue;
}

function serviceData(body: z.infer<typeof servicePayloadSchema>) {
  return {
    slug: body.slug,
    title: body.title,
    shortTitle: body.shortTitle ?? null,
    category: body.category,
    subCategory: body.subCategory ?? null,
    expertTypes: body.expertTypes,
    summary: body.summary,
    description: body.description ?? null,
    priceInPaise: body.priceInPaise,
    compareAtPriceInPaise: body.compareAtPriceInPaise ?? null,
    durationMinutes: body.durationMinutes ?? null,
    imageUrl: body.imageUrl ?? null,
    tags: body.tags,
    includes: inputJson(body.includes),
    outcomes: inputJson(body.outcomes),
    whoIsItFor: inputJson(body.whoIsItFor),
    howItWorks: inputJson(body.howItWorks),
    faqs: inputJson(body.faqs),
    relatedDiseaseSlugs: body.relatedDiseaseSlugs,
    seoTitle: body.seoTitle ?? null,
    seoDescription: body.seoDescription ?? null,
    isPublished: body.isPublished,
    isFeatured: body.isFeatured,
    sortOrder: body.sortOrder
  };
}

function publicWhere(
  filters: z.infer<typeof publicServiceQuerySchema>
): Prisma.HealthServiceWhereInput {
  const andFilters: Prisma.HealthServiceWhereInput[] = [];
  if (filters.q) {
    andFilters.push({
      OR: [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { shortTitle: { contains: filters.q, mode: 'insensitive' } },
        { summary: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { category: { contains: filters.q, mode: 'insensitive' } },
        { subCategory: { contains: filters.q, mode: 'insensitive' } },
        { tags: { has: filters.q } }
      ]
    });
  }
  if (filters.category) {
    andFilters.push({ category: { equals: filters.category, mode: 'insensitive' } });
  }
  if (filters.subCategory) {
    andFilters.push({ subCategory: { equals: filters.subCategory, mode: 'insensitive' } });
  }
  if (filters.expertType) {
    andFilters.push({ expertTypes: { has: filters.expertType } });
  }
  if (filters.tag) {
    andFilters.push({ tags: { has: filters.tag } });
  }

  return {
    isPublished: true,
    ...(andFilters.length ? { AND: andFilters } : {})
  };
}

function serviceOrderBy(sort: string): Prisma.HealthServiceOrderByWithRelationInput[] {
  if (sort === 'price-asc') return [{ priceInPaise: 'asc' }, { title: 'asc' }];
  if (sort === 'price-desc') return [{ priceInPaise: 'desc' }, { title: 'asc' }];
  if (sort === 'name') return [{ title: 'asc' }];
  return [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { title: 'asc' }];
}

async function serviceFilterOptions() {
  const allVisible = await prisma.healthService.findMany({
    where: { isPublished: true },
    select: { category: true, subCategory: true, expertTypes: true, tags: true }
  });
  return {
    categories: [...new Set(allVisible.map((service) => service.category))].sort(),
    subCategories: [
      ...new Set(
        allVisible
          .map((service) => service.subCategory)
          .filter((value): value is string => Boolean(value))
      )
    ].sort(),
    subCategoriesByCategory: allVisible.reduce<Record<string, string[]>>((acc, service) => {
      if (!service.subCategory) return acc;
      acc[service.category] = acc[service.category] || [];
      if (!acc[service.category].includes(service.subCategory)) {
        acc[service.category].push(service.subCategory);
        acc[service.category].sort();
      }
      return acc;
    }, {}),
    expertTypes: [...new Set(allVisible.flatMap((service) => service.expertTypes))]
      .sort((a, b) => providerTypeLabel(a).localeCompare(providerTypeLabel(b)))
      .map((value) => ({ value, label: providerTypeLabel(value) })),
    tags: [...new Set(allVisible.flatMap((service) => service.tags))].sort()
  };
}

servicesRouter.get(
  '/services',
  asyncRoute(async (req, res) => {
    const filters = publicServiceQuerySchema.parse(req.query);
    const where = publicWhere(filters);
    const [total, services, filterOptions] = await Promise.all([
      prisma.healthService.count({ where }),
      prisma.healthService.findMany({
        where,
        orderBy: serviceOrderBy(filters.sort),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      serviceFilterOptions()
    ]);

    res.json({
      services: services.map(serviceDto),
      filters,
      filterOptions,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
      }
    });
  })
);

servicesRouter.get(
  '/services/:slug',
  asyncRoute(async (req, res) => {
    const service = await prisma.healthService.findUnique({
      where: { slug: routeParam(req, 'slug') }
    });
    if (!service || !service.isPublished) {
      res.status(404).json({ message: 'Service not found.' });
      return;
    }

    const relatedServices = await prisma.healthService.findMany({
      where: {
        isPublished: true,
        id: { not: service.id },
        OR: [{ category: service.category }, { expertTypes: { hasSome: service.expertTypes } }]
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      take: 4
    });

    res.json({ service: serviceDto(service), relatedServices: relatedServices.map(serviceDto) });
  })
);

export function registerAdminServiceRoutes(router: Router) {
  router.get(
    '/admin/services',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      const where: Prisma.HealthServiceWhereInput = q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
              { subCategory: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {};
      const services = await prisma.healthService.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
      });
      res.json({
        services: services.map(serviceDto),
        providerTypes: Object.values(ProviderType).map((value) => ({
          value,
          label: providerTypeLabel(value)
        }))
      });
    })
  );

  router.post(
    '/admin/services',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = servicePayloadSchema.parse(req.body);
      const service = await prisma.healthService.create({ data: serviceData(body) });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'health_service.create',
        targetType: 'health_service',
        targetId: service.id,
        summary: `Service "${service.title}" created.`
      });
      res.status(201).json({ service: serviceDto(service) });
    })
  );

  router.post(
    '/admin/services/seed',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'health_service.seed',
        targetType: 'health_service',
        targetId: 'seed',
        summary: 'Service defaults are included in the database migration.'
      });
      res.json({ message: 'Default services are seeded by migration.' });
    })
  );

  router.patch(
    '/admin/services/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = servicePayloadSchema
        .partial({ slug: true, title: true, category: true, summary: true })
        .parse(req.body);
      const service = await prisma.healthService.update({
        where: { id: routeParam(req, 'id') },
        data: {
          ...(body.slug ? { slug: body.slug } : {}),
          ...(body.title ? { title: body.title } : {}),
          ...(body.category ? { category: body.category } : {}),
          ...(body.subCategory !== undefined ? { subCategory: body.subCategory ?? null } : {}),
          ...(body.summary ? { summary: body.summary } : {}),
          ...(body.shortTitle !== undefined ? { shortTitle: body.shortTitle ?? null } : {}),
          ...(body.expertTypes !== undefined ? { expertTypes: body.expertTypes } : {}),
          ...(body.description !== undefined ? { description: body.description ?? null } : {}),
          ...(body.priceInPaise !== undefined ? { priceInPaise: body.priceInPaise } : {}),
          ...(body.compareAtPriceInPaise !== undefined
            ? { compareAtPriceInPaise: body.compareAtPriceInPaise ?? null }
            : {}),
          ...(body.durationMinutes !== undefined
            ? { durationMinutes: body.durationMinutes ?? null }
            : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ?? null } : {}),
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
          ...(body.includes !== undefined ? { includes: inputJson(body.includes) } : {}),
          ...(body.outcomes !== undefined ? { outcomes: inputJson(body.outcomes) } : {}),
          ...(body.whoIsItFor !== undefined ? { whoIsItFor: inputJson(body.whoIsItFor) } : {}),
          ...(body.howItWorks !== undefined ? { howItWorks: inputJson(body.howItWorks) } : {}),
          ...(body.faqs !== undefined ? { faqs: inputJson(body.faqs) } : {}),
          ...(body.relatedDiseaseSlugs !== undefined
            ? { relatedDiseaseSlugs: body.relatedDiseaseSlugs }
            : {}),
          ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle ?? null } : {}),
          ...(body.seoDescription !== undefined
            ? { seoDescription: body.seoDescription ?? null }
            : {}),
          ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {})
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'health_service.update',
        targetType: 'health_service',
        targetId: service.id,
        summary: `Service "${service.title}" updated.`
      });
      res.json({ service: serviceDto(service) });
    })
  );

  router.delete(
    '/admin/services/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const service = await prisma.healthService.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'health_service.delete',
        targetType: 'health_service',
        targetId: id,
        summary: `Service "${service.title}" deleted.`
      });
      res.json({ message: 'Service deleted.' });
    })
  );
}
