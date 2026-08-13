import { Router } from 'express';
import {
  CareTeamServicePricingMode,
  HopeHubDiscountType,
  HopeHubDeliveryMode,
  HopeHubOfferingType,
  HopeHubOrganizationLeadStatus,
  HopeHubPartialPaymentType,
  Prisma,
  Role
} from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import { parseMultipartForm } from '../../utils/multipart.js';
import { deleteHopeHubMediaFile, saveHopeHubMedia } from '../../services/hope-hub-media-storage.js';

const emptyToNull = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
  });

const dateTimeOrNull = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? new Date(text) : null;
  });

const stringList = z.array(z.string().trim().min(1).max(160)).max(30).default([]);

const offeringSchema = z.object({
  code: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  subtitle: emptyToNull,
  description: z.string().trim().min(10).max(3000),
  type: z.nativeEnum(HopeHubOfferingType),
  priceInPaise: z.number().int().min(0).nullable().optional(),
  compareAtPriceInPaise: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().min(3).max(3).default('INR'),
  discountEnabled: z.boolean().default(false),
  discountType: z.nativeEnum(HopeHubDiscountType).default(HopeHubDiscountType.NONE),
  discountLabel: emptyToNull,
  discountCode: emptyToNull,
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  discountFlatInPaise: z.number().int().min(0).nullable().optional(),
  discountMaxInPaise: z.number().int().min(0).nullable().optional(),
  discountStartsAt: dateTimeOrNull,
  discountEndsAt: dateTimeOrNull,
  partialPaymentEnabled: z.boolean().default(false),
  partialPaymentType: z
    .nativeEnum(HopeHubPartialPaymentType)
    .default(HopeHubPartialPaymentType.NONE),
  partialPaymentLabel: emptyToNull,
  partialPaymentPercent: z.number().int().min(1).max(100).nullable().optional(),
  partialPaymentFlatInPaise: z.number().int().min(0).nullable().optional(),
  validityDays: z.number().int().positive().nullable().optional(),
  sessionCount: z.number().int().positive().nullable().optional(),
  sessionDurationMinutes: z.number().int().positive().nullable().optional(),
  deliveryMode: z.nativeEnum(HopeHubDeliveryMode).default(HopeHubDeliveryMode.ONLINE_AUDIO),
  eventStartsAt: dateTimeOrNull,
  eventEndsAt: dateTimeOrNull,
  seatLimit: z.number().int().positive().nullable().optional(),
  venue: emptyToNull,
  imageUrl: emptyToNull,
  ctaLabel: z.string().trim().min(2).max(80).default('Book now'),
  routePath: emptyToNull,
  benefits: stringList,
  audience: stringList,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  requiresLeadForm: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

const bannerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: emptyToNull,
  eyebrow: emptyToNull,
  imageUrl: emptyToNull,
  ctaLabel: z.string().trim().min(2).max(80).default('Explore'),
  routePath: z.string().trim().min(1).max(300),
  offeringId: emptyToNull,
  startsAt: dateTimeOrNull,
  endsAt: dateTimeOrNull,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  backgroundColor: emptyToNull,
  textColor: emptyToNull,
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const leadUpdateSchema = z.object({
  status: z.nativeEnum(HopeHubOrganizationLeadStatus).optional(),
  followUpNotes: emptyToNull
});

const carePricingTemplateSchema = z.object({
  applicableRoleCodes: z
    .array(
      z
        .string()
        .trim()
        .regex(/^[A-Z][A-Z0-9_]{2,63}$/)
    )
    .max(30)
    .default([]),
  title: z.string().trim().min(2).max(160),
  description: emptyToNull,
  pricingMode: z.nativeEnum(CareTeamServicePricingMode).default(CareTeamServicePricingMode.FIXED),
  priceInPaise: z.number().int().min(0).max(5000000).default(0),
  firstSessionPriceInPaise: z.number().int().min(0).max(5000000).nullable().optional(),
  followUpPriceInPaise: z.number().int().min(0).max(5000000).nullable().optional(),
  introSessionLimit: z.number().int().min(1).max(50).default(1),
  packageSessionCount: z.number().int().min(1).max(200).nullable().optional(),
  packagePriceInPaise: z.number().int().min(0).max(50000000).nullable().optional(),
  freeMinutes: z.number().int().min(0).max(480).default(0),
  pricePerMinuteInPaise: z.number().int().min(0).max(50000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).default(30),
  isFree: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
});

const MAX_HOPE_HUB_MEDIA_BYTES = 5 * 1024 * 1024;

async function invalidPricingTemplateRoles(roleCodes: readonly string[]) {
  if (!roleCodes.length) return [];
  const roles = await prisma.providerRoleDefinition.findMany({
    where: { code: { in: [...roleCodes] }, isActive: true },
    select: { code: true }
  });
  const valid = new Set(roles.map((role) => role.code));
  return roleCodes.filter((code) => !valid.has(code));
}

async function parseHopeHubMediaUpload(req: import('express').Request) {
  const form = await parseMultipartForm(req, { maxFileBytes: MAX_HOPE_HUB_MEDIA_BYTES });
  if (!form.file) throw new Error('EMPTY_FILE');
  return {
    mimeType: form.file.mimeType,
    fileName: form.fields['fileName'] || form.file.fileName,
    data: form.file.buffer
  };
}

function jsonValue(value: Record<string, unknown> | null | undefined) {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonObject);
}

function mapMediaUploadError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNSUPPORTED_MIME') {
    return {
      status: 400,
      message:
        'Only JPG, PNG, WebP, GIF, MP3, M4A, WAV, WebM, MP4, and MOV media files are allowed.'
    };
  }
  if (code === 'EMPTY_FILE') {
    return { status: 400, message: 'Media file is empty.' };
  }
  if (code === 'FILE_TOO_LARGE') {
    return {
      status: 400,
      message:
        'Media upload must be 5 MB or smaller. Use YouTube, Telegram, or direct S3 links for larger recordings.'
    };
  }
  return { status: 500, message: 'Could not save media file.' };
}

export function registerAdminHopeHubOfferingRoutes(router: Router) {
  router.get(
    '/admin/hope-hub/care-pricing-templates',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const templates = await prisma.careTeamPricingTemplate.findMany({
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
      });
      res.json({ templates });
    })
  );

  router.post(
    '/admin/hope-hub/care-pricing-templates',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = carePricingTemplateSchema.parse(req.body);
      const invalidRoles = await invalidPricingTemplateRoles(body.applicableRoleCodes);
      if (invalidRoles.length) {
        return res.status(400).json({
          message: `Unknown or inactive provider role: ${invalidRoles.join(', ')}`
        });
      }
      const template = await prisma.careTeamPricingTemplate.create({ data: body });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.care_pricing_template.create',
        targetType: 'care_team_pricing_template',
        targetId: template.id,
        summary: `Created care pricing template "${template.title}".`
      });
      res.status(201).json({ template });
    })
  );

  router.put(
    '/admin/hope-hub/care-pricing-templates/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = carePricingTemplateSchema.partial().parse(req.body);
      const invalidRoles = await invalidPricingTemplateRoles(body.applicableRoleCodes ?? []);
      if (invalidRoles.length) {
        return res.status(400).json({
          message: `Unknown or inactive provider role: ${invalidRoles.join(', ')}`
        });
      }
      const template = await prisma.careTeamPricingTemplate.update({ where: { id }, data: body });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.care_pricing_template.update',
        targetType: 'care_team_pricing_template',
        targetId: id,
        summary: `Updated care pricing template "${template.title}".`
      });
      res.json({ template });
    })
  );

  router.delete(
    '/admin/hope-hub/care-pricing-templates/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const template = await prisma.careTeamPricingTemplate.update({
        where: { id },
        data: { isActive: false }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.care_pricing_template.deactivate',
        targetType: 'care_team_pricing_template',
        targetId: id,
        summary: `Deactivated care pricing template "${template.title}".`
      });
      res.json({ template });
    })
  );

  router.post(
    '/admin/hope-hub/media',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      try {
        const body = await parseHopeHubMediaUpload(req);
        const saved = await saveHopeHubMedia({
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          uploadedById: req.user!.id
        });
        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'hopehub.media.upload',
          targetType: 'hope_hub_media',
          targetId: saved.storageKey,
          summary: `Uploaded Hope Hub media "${body.fileName || saved.storageKey}".`
        });
        res.status(201).json(saved);
      } catch (error) {
        const mapped = mapMediaUploadError(error);
        res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.delete(
    /^\/admin\/hope-hub\/media\/(.+)$/,
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      let storageKey = '';
      try {
        storageKey = String(req.params[0] || '')
          .split('/')
          .map((part) => decodeURIComponent(part))
          .join('/');
      } catch {
        return res.status(400).json({ message: 'Invalid Hope Hub media key.' });
      }

      if (!storageKey || !storageKey.startsWith('hope-hub-media/')) {
        return res.status(400).json({ message: 'Invalid Hope Hub media key.' });
      }

      await deleteHopeHubMediaFile(storageKey);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.media.delete',
        targetType: 'hope_hub_media',
        targetId: storageKey,
        summary: `Deleted Hope Hub media "${storageKey}".`
      });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/hope-hub/offerings',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const offerings = await prisma.hopeHubOffering.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      });
      res.json({ offerings });
    })
  );

  router.post(
    '/admin/hope-hub/offerings',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = offeringSchema.parse(req.body);
      const offering = await prisma.hopeHubOffering.create({
        data: { ...body, metadata: jsonValue(body.metadata) }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.offering.create',
        targetType: 'hope_hub_offering',
        targetId: offering.id,
        summary: `Created Hope Hub offering "${offering.title}".`
      });
      res.status(201).json({ offering });
    })
  );

  router.put(
    '/admin/hope-hub/offerings/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = offeringSchema.partial().parse(req.body);
      const offering = await prisma.hopeHubOffering.update({
        where: { id },
        data: { ...body, metadata: 'metadata' in body ? jsonValue(body.metadata) : undefined }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.offering.update',
        targetType: 'hope_hub_offering',
        targetId: id,
        summary: 'Updated Hope Hub offering.'
      });
      res.json({ offering });
    })
  );

  router.get(
    '/admin/hope-hub/banners',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const banners = await prisma.hopeHubBanner.findMany({
        include: { offering: { select: { id: true, title: true, slug: true, type: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      });
      res.json({ banners });
    })
  );

  router.post(
    '/admin/hope-hub/banners',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = bannerSchema.parse(req.body);
      const banner = await prisma.hopeHubBanner.create({
        data: { ...body, metadata: jsonValue(body.metadata) }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.banner.create',
        targetType: 'hope_hub_banner',
        targetId: banner.id,
        summary: `Created Hope Hub banner "${banner.title}".`
      });
      res.status(201).json({ banner });
    })
  );

  router.put(
    '/admin/hope-hub/banners/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = bannerSchema.partial().parse(req.body);
      const banner = await prisma.hopeHubBanner.update({
        where: { id },
        data: { ...body, metadata: 'metadata' in body ? jsonValue(body.metadata) : undefined }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.banner.update',
        targetType: 'hope_hub_banner',
        targetId: id,
        summary: 'Updated Hope Hub banner.'
      });
      res.json({ banner });
    })
  );

  router.get(
    '/admin/hope-hub/organization-leads',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const leads = await prisma.hopeHubOrganizationLead.findMany({
        include: { offering: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200
      });
      res.json({ leads });
    })
  );

  router.put(
    '/admin/hope-hub/organization-leads/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = leadUpdateSchema.parse(req.body);
      const lead = await prisma.hopeHubOrganizationLead.update({ where: { id }, data: body });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.organization_lead.update',
        targetType: 'hope_hub_organization_lead',
        targetId: id,
        summary: 'Updated Hope Hub organisation lead.'
      });
      res.json({ lead });
    })
  );
}
