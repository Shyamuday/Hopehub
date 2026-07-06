import { Router } from 'express';
import { z } from 'zod';
import { Role, WebsiteLeadFollowUp } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  queryText,
  queryPositiveInt,
  writeAuditLog
} from '../../utils/helpers.js';
import {
  FOLLOW_UP_STATUSES,
  leadInclude,
  updateLeadFollowUp
} from '../../services/website-leads.service.js';
import { bookConsultationFromLead } from '../../services/visitor-lead-booking.js';
import { buildLeadFunnelReport } from '../../services/visitor-lead-analytics.js';
import {
  requireStoreId,
  resolveReceptionContext,
  ReceptionScopeError
} from '../reception/shared.js';

const VIEW_ROLES = [Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT_COORDINATOR] as const;
const FOLLOW_UP_ROLES = [Role.RECEPTIONIST, Role.PATIENT_COORDINATOR] as const;
const BOOK_ROLES = [Role.RECEPTIONIST, Role.PATIENT_COORDINATOR, Role.ADMIN] as const;

export function registerAdminVisitorLeadRoutes(router: Router) {
  router.get(
    '/admin/visitor-leads/stats',
    authRequired,
    allowRoles(...VIEW_ROLES),
    asyncRoute(async (_req, res) => {
      const [total, newLeads, needsCallback, called, registered, booked, bySource] = await Promise.all([
        prisma.websiteLead.count(),
        prisma.websiteLead.count({ where: { followUpStatus: 'NEW' } }),
        prisma.websiteLead.count({ where: { followUpStatus: 'NEEDS_CALLBACK' } }),
        prisma.websiteLead.count({ where: { followUpStatus: 'CALLED' } }),
        prisma.websiteLead.count({ where: { followUpStatus: 'REGISTERED' } }),
        prisma.websiteLead.count({ where: { followUpStatus: 'BOOKED' } }),
        prisma.websiteLead.groupBy({ by: ['source'], _count: { _all: true } })
      ]);

      res.json({
        stats: {
          total,
          newLeads,
          needsCallback,
          called,
          registered,
          booked,
          bySource: Object.fromEntries(bySource.map((r) => [r.source, r._count._all]))
        }
      });
    })
  );

  router.get(
    '/admin/visitor-leads',
    authRequired,
    allowRoles(...VIEW_ROLES),
    asyncRoute(async (req, res) => {
      const status = queryText(req, 'followUpStatus').toUpperCase();
      const source = queryText(req, 'source').toUpperCase();
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 30);

      const where: {
        followUpStatus?: WebsiteLeadFollowUp;
        source?: 'CHAT_BOT' | 'HOME_BOOKING' | 'PROMO_POPUP';
      } = {};

      if (status && status !== 'ALL' && FOLLOW_UP_STATUSES.includes(status as WebsiteLeadFollowUp)) {
        where.followUpStatus = status as WebsiteLeadFollowUp;
      }
      if (source && source !== 'ALL' && ['CHAT_BOT', 'HOME_BOOKING', 'PROMO_POPUP'].includes(source)) {
        where.source = source as 'CHAT_BOT' | 'HOME_BOOKING' | 'PROMO_POPUP';
      }

      const total = await prisma.websiteLead.count({ where });
      const leads = await prisma.websiteLead.findMany({
        where,
        include: leadInclude,
        orderBy: [{ followUpStatus: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        leads,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.get(
    '/admin/visitor-leads/:id',
    authRequired,
    allowRoles(...VIEW_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const lead = await prisma.websiteLead.findUnique({
        where: { id },
        include: {
          ...leadInclude,
          chatSession: {
            include: {
              messages: { orderBy: { createdAt: 'asc' } },
              user: { select: { id: true, name: true, mobile: true, email: true } }
            }
          }
        }
      });
      if (!lead) return res.status(404).json({ message: 'Lead not found.' });
      res.json({ lead });
    })
  );

  router.get(
    '/admin/visitor-leads/meta',
    authRequired,
    allowRoles(...VIEW_ROLES),
    asyncRoute(async (_req, res) => {
      const { NOT_INTERESTED_REASONS } = await import('../../constants/visitor-lead-follow-up.constants.js');
      res.json({ notInterestedReasons: NOT_INTERESTED_REASONS });
    })
  );

  router.patch(
    '/admin/visitor-leads/:id/follow-up',
    authRequired,
    allowRoles(...FOLLOW_UP_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = z
        .object({
          followUpStatus: z.nativeEnum(WebsiteLeadFollowUp),
          operatorNote: z.string().max(1000).optional(),
          visitorIssue: z.string().max(2000).optional(),
          notInterestedReasonPreset: z.string().max(200).optional(),
          notInterestedReasonDetail: z.string().max(500).optional(),
          markCalled: z.boolean().optional()
        })
        .parse(req.body);

      try {
        const lead = await updateLeadFollowUp({
          leadId: id,
          followUpStatus: body.followUpStatus,
          operatorId: req.user!.id,
          operatorNote: body.operatorNote,
          visitorIssue: body.visitorIssue,
          notInterestedReasonPreset: body.notInterestedReasonPreset,
          notInterestedReasonDetail: body.notInterestedReasonDetail,
          markCalled: body.markCalled
        });

        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'visitor_lead.follow_up',
          targetType: 'website_lead',
          targetId: id,
          summary: `Follow-up status set to ${body.followUpStatus}.`
        });

        res.json({ lead, message: 'Follow-up updated.' });
      } catch (error) {
        if (error instanceof Error && error.message === 'NOT_INTERESTED_REASON_REQUIRED') {
          return res.status(400).json({ message: 'Please select a reason for not interested.' });
        }
        throw error;
      }
    })
  );

  router.get(
    '/admin/analytics/lead-funnel',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const days = queryPositiveInt(req, 'days', 30, 7, 90);
      const report = await buildLeadFunnelReport(days);
      res.json(report);
    })
  );

  router.post(
    '/admin/visitor-leads/:id/book-consultation',
    authRequired,
    allowRoles(...BOOK_ROLES),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = z
        .object({
          diseaseId: z.string().min(1),
          storeId: z.string().optional(),
          collectCash: z.boolean().optional().default(false),
          notes: z.string().max(500).optional()
        })
        .parse(req.body);

      try {
        const ctx = await resolveReceptionContext(req.user!.id, req.user!.role);
        const storeId = requireStoreId(ctx, body.storeId);

        const result = await bookConsultationFromLead({
          leadId: id,
          diseaseId: body.diseaseId,
          storeId,
          actor: { id: req.user!.id, role: req.user!.role },
          collectCash: body.collectCash,
          notes: body.notes
        });

        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'visitor_lead.book_consultation',
          targetType: 'website_lead',
          targetId: id,
          summary: 'Consultation booked from visitor lead.',
          metadata: { consultationId: result.consultation.id }
        });

        const lead = await prisma.websiteLead.findUnique({
          where: { id },
          include: leadInclude
        });

        res.status(201).json({
          lead,
          consultation: result.consultation,
          message: 'Consultation booked from lead.'
        });
      } catch (error) {
        if (error instanceof ReceptionScopeError) {
          return res.status(400).json({ message: error.message });
        }
        if (error instanceof Error) {
          if (error.message === 'LEAD_NOT_FOUND') return res.status(404).json({ message: 'Lead not found.' });
          if (error.message === 'LEAD_ALREADY_BOOKED') {
            return res.status(409).json({ message: 'Lead already has a consultation.' });
          }
          if (error.message === 'LEAD_NO_PHONE') {
            return res.status(400).json({ message: 'Lead has no phone number for booking.' });
          }
        }
        throw error;
      }
    })
  );
}
