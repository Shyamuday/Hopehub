import { Router } from 'express';
import { z } from 'zod';
import {
  EmailCampaignAudience,
  EmailCampaignRecipientStatus,
  EmailCampaignStatus,
  EmailMarketingContactStatus,
  EmailSuppressionReason,
  Role
} from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import { getEmailConfigStatus, isEmailConfigured, sendEmail } from '../../services/mail.js';
import {
  campaignCreateData,
  importMarketingContacts,
  personalizeMarketingContent,
  previewEmailCampaignAudience,
  queueEmailCampaign,
  reconcileRegisteredMarketingContacts,
  refreshEmailCampaignMetrics,
  sanitizeMarketingHtml,
  suppressMarketingEmail
} from '../../services/email-marketing.js';

const ACCESS_ROLES = [Role.ADMIN, Role.HR] as const;
const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(180),
  previewText: z.string().trim().max(240).optional().default(''),
  htmlBody: z.string().trim().min(1).max(250_000),
  textBody: z.string().trim().min(1).max(100_000),
  audience: z.nativeEnum(EmailCampaignAudience),
  registeredRole: z.nativeEnum(Role).nullable().optional(),
  templateId: z.string().trim().min(1).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  complianceConfirmed: z.literal(true)
});
const campaignUpdateSchema = campaignSchema
  .omit({ complianceConfirmed: true })
  .partial()
  .extend({ complianceConfirmed: z.literal(true) });
const importSchema = z.object({
  contacts: z.string().trim().min(3).max(500_000),
  sourceLabel: z.string().trim().min(2).max(120),
  consentBasis: z.string().trim().min(5).max(500),
  consentConfirmed: z.literal(true)
});
const previewSchema = z.object({
  audience: z.nativeEnum(EmailCampaignAudience),
  registeredRole: z.nativeEnum(Role).nullable().optional()
});
const testSchema = z.object({ to: z.string().trim().email() });
const suppressSchema = z.object({ reason: z.string().trim().min(3).max(300).optional() });
const templateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().max(1000).optional().default(''),
  subject: z.string().trim().min(2).max(180),
  previewText: z.string().trim().max(240).optional().default(''),
  htmlBody: z.string().trim().min(1).max(250_000),
  textBody: z.string().trim().min(1).max(100_000),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(100)
});
const templateUpdateSchema = templateSchema.partial();

function campaignInclude() {
  return {
    createdBy: { select: { id: true, name: true, email: true } },
    template: { select: { id: true, name: true } }
  } as const;
}

export function registerAdminEmailMarketingRoutes(router: Router) {
  router.get(
    '/admin/email-marketing/overview',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (_req, res) => {
      await reconcileRegisteredMarketingContacts();
      const [registeredAudience, promotional, converted, suppressed, campaigns, queued, sent] =
        await Promise.all([
          previewEmailCampaignAudience(EmailCampaignAudience.REGISTERED_USERS, null),
          prisma.emailMarketingContact.count({
            where: { status: EmailMarketingContactStatus.ACTIVE }
          }),
          prisma.emailMarketingContact.count({
            where: { status: EmailMarketingContactStatus.CONVERTED }
          }),
          prisma.emailSuppression.count(),
          prisma.emailCampaign.count(),
          prisma.emailCampaignRecipient.count({
            where: {
              status: {
                in: [EmailCampaignRecipientStatus.QUEUED, EmailCampaignRecipientStatus.PROCESSING]
              }
            }
          }),
          prisma.emailCampaignRecipient.count({
            where: { status: EmailCampaignRecipientStatus.SENT }
          })
        ]);
      res.json({
        registered: registeredAudience.registered,
        promotional,
        converted,
        suppressed,
        campaigns,
        queued,
        sent,
        emailConfig: getEmailConfigStatus()
      });
    })
  );

  router.get(
    '/admin/email-marketing/templates',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const includeInactive = String(req.query.includeInactive || '') === 'true';
      const templates = await prisma.emailMarketingTemplate.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
      });
      res.json({ templates });
    })
  );

  router.post(
    '/admin/email-marketing/templates',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = templateSchema.parse(req.body);
      const template = await prisma.emailMarketingTemplate.create({
        data: {
          ...body,
          category: body.category.toUpperCase(),
          description: body.description || null,
          previewText: body.previewText || null,
          htmlBody: sanitizeMarketingHtml(body.htmlBody),
          createdById: req.user!.id
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_TEMPLATE_CREATED',
        targetType: 'EmailMarketingTemplate',
        targetId: template.id,
        summary: `Created email template ${template.name}`,
        metadata: { category: template.category }
      });
      res.status(201).json({ template });
    })
  );

  router.patch(
    '/admin/email-marketing/templates/:id',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = templateUpdateSchema.parse(req.body);
      const existing = await prisma.emailMarketingTemplate.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Template not found.' });
      const template = await prisma.emailMarketingTemplate.update({
        where: { id },
        data: {
          ...body,
          ...(body.category !== undefined ? { category: body.category.toUpperCase() } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.previewText !== undefined ? { previewText: body.previewText || null } : {}),
          ...(body.htmlBody !== undefined ? { htmlBody: sanitizeMarketingHtml(body.htmlBody) } : {})
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_TEMPLATE_UPDATED',
        targetType: 'EmailMarketingTemplate',
        targetId: template.id,
        summary: `Updated email template ${template.name}`,
        metadata: { category: template.category, isActive: template.isActive }
      });
      res.json({ template });
    })
  );

  router.post(
    '/admin/email-marketing/templates/:id/duplicate',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const source = await prisma.emailMarketingTemplate.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!source) return res.status(404).json({ message: 'Template not found.' });
      const template = await prisma.emailMarketingTemplate.create({
        data: {
          name: `${source.name} copy`.slice(0, 120),
          category: source.category,
          description: source.description,
          subject: source.subject,
          previewText: source.previewText,
          htmlBody: source.htmlBody,
          textBody: source.textBody,
          isActive: true,
          sortOrder: source.sortOrder + 1,
          createdById: req.user!.id
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_TEMPLATE_DUPLICATED',
        targetType: 'EmailMarketingTemplate',
        targetId: template.id,
        summary: `Duplicated email template ${source.name}`,
        metadata: { sourceTemplateId: source.id }
      });
      res.status(201).json({ template });
    })
  );

  router.post(
    '/admin/email-marketing/audience-preview',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = previewSchema.parse(req.body);
      res.json(await previewEmailCampaignAudience(body.audience, body.registeredRole || null));
    })
  );

  router.get(
    '/admin/email-marketing/contacts',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      await reconcileRegisteredMarketingContacts();
      const query = String(req.query.q || '').trim();
      const status = z.nativeEnum(EmailMarketingContactStatus).safeParse(req.query.status);
      const page = Math.max(1, Number(req.query.page || 1));
      const take = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
      const where = {
        ...(status.success ? { status: status.data } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' as const } },
                { name: { contains: query, mode: 'insensitive' as const } },
                { sourceLabel: { contains: query, mode: 'insensitive' as const } }
              ]
            }
          : {})
      };
      const [contacts, total] = await Promise.all([
        prisma.emailMarketingContact.findMany({
          where,
          include: { registeredUser: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * take,
          take
        }),
        prisma.emailMarketingContact.count({ where })
      ]);
      res.json({ contacts, total, page, pages: Math.max(1, Math.ceil(total / take)) });
    })
  );

  router.post(
    '/admin/email-marketing/contacts/import',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = importSchema.parse(req.body);
      const result = await importMarketingContacts({
        rawContacts: body.contacts,
        sourceLabel: body.sourceLabel,
        consentBasis: body.consentBasis,
        importedById: req.user!.id
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_CONTACTS_IMPORTED',
        targetType: 'EmailMarketingContact',
        targetId: body.sourceLabel,
        summary: `Imported ${result.imported} new promotional contacts`,
        metadata: { ...result, sourceLabel: body.sourceLabel }
      });
      res.status(201).json(result);
    })
  );

  router.post(
    '/admin/email-marketing/contacts/:id/suppress',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = suppressSchema.parse(req.body);
      const contact = await prisma.emailMarketingContact.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!contact) return res.status(404).json({ message: 'Contact not found.' });
      await suppressMarketingEmail({
        email: contact.email,
        reason: EmailSuppressionReason.MANUAL,
        source: body.reason || `admin:${req.user!.id}`
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_CONTACT_SUPPRESSED',
        targetType: 'EmailMarketingContact',
        targetId: contact.id,
        summary: `Suppressed ${contact.email}`,
        metadata: { reason: body.reason || null }
      });
      res.json({ message: 'Contact suppressed from all future campaigns.' });
    })
  );

  router.get(
    '/admin/email-marketing/campaigns',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (_req, res) => {
      const campaigns = await prisma.emailCampaign.findMany({
        include: campaignInclude(),
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json({ campaigns });
    })
  );

  router.get(
    '/admin/email-marketing/deliveries',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const query = String(req.query.q || '').trim();
      const status = z.nativeEnum(EmailCampaignRecipientStatus).safeParse(req.query.status);
      const campaignId = String(req.query.campaignId || '').trim();
      const page = Math.max(1, Number(req.query.page || 1));
      const take = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
      const where = {
        ...(status.success ? { status: status.data } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' as const } },
                { name: { contains: query, mode: 'insensitive' as const } },
                {
                  campaign: {
                    name: { contains: query, mode: 'insensitive' as const }
                  }
                }
              ]
            }
          : {})
      };
      const [deliveries, total] = await Promise.all([
        prisma.emailCampaignRecipient.findMany({
          where,
          include: { campaign: { select: { id: true, name: true, subject: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * take,
          take
        }),
        prisma.emailCampaignRecipient.count({ where })
      ]);
      res.json({ deliveries, total, page, pages: Math.max(1, Math.ceil(total / take)) });
    })
  );

  router.get(
    '/admin/email-marketing/campaigns/:id',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id },
        include: campaignInclude()
      });
      if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
      const recipients = await prisma.emailCampaignRecipient.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' },
        take: 250
      });
      res.json({ campaign, recipients });
    })
  );

  router.post(
    '/admin/email-marketing/campaigns',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = campaignSchema.parse(req.body);
      if (
        body.templateId &&
        !(await prisma.emailMarketingTemplate.count({ where: { id: body.templateId } }))
      ) {
        return res.status(400).json({ message: 'Selected email template no longer exists.' });
      }
      if (body.scheduledAt && !isEmailConfigured()) {
        return res.status(503).json({
          message: 'Email delivery is not configured. Configure SMTP before scheduling.'
        });
      }
      if (body.scheduledAt && body.scheduledAt <= new Date()) {
        return res.status(400).json({ message: 'Scheduled time must be in the future.' });
      }
      const campaign = await prisma.emailCampaign.create({
        data: campaignCreateData({ ...body, createdById: req.user!.id }),
        include: campaignInclude()
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: body.scheduledAt
          ? 'EMAIL_MARKETING_CAMPAIGN_SCHEDULED'
          : 'EMAIL_MARKETING_CAMPAIGN_CREATED',
        targetType: 'EmailCampaign',
        targetId: campaign.id,
        summary: `${body.scheduledAt ? 'Scheduled' : 'Created'} email campaign ${campaign.name}`,
        metadata: { audience: campaign.audience, scheduledAt: campaign.scheduledAt }
      });
      res.status(201).json({ campaign });
    })
  );

  router.patch(
    '/admin/email-marketing/campaigns/:id',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = campaignUpdateSchema.parse(req.body);
      const existing = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Campaign not found.' });
      if (existing.status !== EmailCampaignStatus.DRAFT) {
        return res.status(409).json({ message: 'Only draft campaigns can be edited.' });
      }
      if (
        body.templateId &&
        !(await prisma.emailMarketingTemplate.count({ where: { id: body.templateId } }))
      ) {
        return res.status(400).json({ message: 'Selected email template no longer exists.' });
      }
      const campaign = await prisma.emailCampaign.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.subject !== undefined ? { subject: body.subject.trim() } : {}),
          ...(body.previewText !== undefined
            ? { previewText: body.previewText.trim() || null }
            : {}),
          ...(body.htmlBody !== undefined
            ? { htmlBody: sanitizeMarketingHtml(body.htmlBody) }
            : {}),
          ...(body.textBody !== undefined ? { textBody: body.textBody.trim() } : {}),
          ...(body.audience !== undefined ? { audience: body.audience } : {}),
          ...(body.registeredRole !== undefined ? { registeredRole: body.registeredRole } : {}),
          ...(body.templateId !== undefined ? { templateId: body.templateId } : {})
        },
        include: campaignInclude()
      });
      res.json({ campaign });
    })
  );

  router.post(
    '/admin/email-marketing/campaigns/:id/test',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const body = testSchema.parse(req.body);
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
      const testRecipient = { email: body.to, name: 'Test Recipient' };
      await sendEmail({
        to: body.to,
        subject: `[TEST] ${personalizeMarketingContent(campaign.subject, testRecipient)}`,
        text: `TEST EMAIL — no campaign recipient was recorded.\n\n${personalizeMarketingContent(campaign.textBody, testRecipient)}`,
        html: `<div style="padding:10px;background:#fef3c7;font-weight:700">TEST EMAIL — no campaign recipient was recorded.</div>${sanitizeMarketingHtml(personalizeMarketingContent(campaign.htmlBody, testRecipient, true))}`
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_CAMPAIGN_TEST_SENT',
        targetType: 'EmailCampaign',
        targetId: campaign.id,
        summary: `Sent a test for ${campaign.name} to ${body.to}`,
        metadata: { to: body.to }
      });
      res.json({ message: `Test email sent to ${body.to}.` });
    })
  );

  router.post(
    '/admin/email-marketing/campaigns/:id/launch',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const confirmation = z.object({ confirmation: z.literal('SEND') }).parse(req.body);
      void confirmation;
      if (!isEmailConfigured()) {
        return res.status(503).json({
          message: 'Email delivery is not configured. Configure SMTP before launching.'
        });
      }
      const campaign = await queueEmailCampaign(routeParam(req, 'id'));
      if (campaign.status === EmailCampaignStatus.FAILED && campaign.recipientCount === 0) {
        return res.status(409).json({
          message: 'No eligible recipients remain after registration and suppression checks.'
        });
      }
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_CAMPAIGN_QUEUED',
        targetType: 'EmailCampaign',
        targetId: campaign.id,
        summary: `Queued ${campaign.name} for ${campaign.recipientCount} recipients`,
        metadata: { audience: campaign.audience, recipientCount: campaign.recipientCount }
      });
      res.json({ campaign });
    })
  );

  router.post(
    '/admin/email-marketing/campaigns/:id/cancel',
    authRequired,
    allowRoles(...ACCESS_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const existing = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Campaign not found.' });
      if (
        existing.status === EmailCampaignStatus.COMPLETED ||
        existing.status === EmailCampaignStatus.CANCELLED
      ) {
        return res.status(409).json({ message: 'Campaign is already closed.' });
      }
      await prisma.$transaction([
        prisma.emailCampaign.update({
          where: { id },
          data: { status: EmailCampaignStatus.CANCELLED, completedAt: new Date() }
        }),
        prisma.emailCampaignRecipient.updateMany({
          where: {
            campaignId: id,
            status: {
              in: [EmailCampaignRecipientStatus.QUEUED, EmailCampaignRecipientStatus.PROCESSING]
            }
          },
          data: { status: EmailCampaignRecipientStatus.CANCELLED, processingAt: null }
        })
      ]);
      await refreshEmailCampaignMetrics(id);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'EMAIL_MARKETING_CAMPAIGN_CANCELLED',
        targetType: 'EmailCampaign',
        targetId: id,
        summary: `Cancelled email campaign ${existing.name}`,
        metadata: { priorStatus: existing.status }
      });
      res.json({ message: 'Campaign cancelled. Already-sent messages remain in history.' });
    })
  );
}
