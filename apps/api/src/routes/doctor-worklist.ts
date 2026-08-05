import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, ProductEventCategory, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, includeConsultationRelations } from '../utils/helpers.js';
import {
  compareWorklistItems,
  matchesWorklistSearch,
  publishedFollowUpDate,
  resolveFollowUpUrgency,
  worklistSections,
  type WorklistSection,
  type WorklistView
} from '../services/doctor-worklist.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../services/product-analytics.js';

function readJsonObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function toPricingSummary(
  consultation: Awaited<ReturnType<typeof loadDoctorConsultations>>[number]
) {
  const pricingSnapshot = readJsonObject(consultation.pricingSnapshot);
  const lineItems = readJsonObject(consultation.payment?.lineItems);
  const packageUsage = readJsonObject(pricingSnapshot['packageUsage'] || lineItems['packageUsage']);
  const pricingLabel = String(
    pricingSnapshot['careTeamPricingLabel'] || lineItems['careTeamPricingLabel'] || ''
  );
  const pricingRule = String(
    pricingSnapshot['careTeamPricingRule'] || lineItems['careTeamPricingRule'] || ''
  );
  const pricingMode = String(
    pricingSnapshot['careTeamPricingMode'] || lineItems['careTeamPricingMode'] || ''
  );
  const serviceTitle = String(
    pricingSnapshot['careTeamServiceTitle'] || lineItems['careTeamServiceTitle'] || ''
  );
  const packageType = String(packageUsage['type'] || '').toUpperCase();
  const isPackagePurchase = pricingRule === 'PACKAGE_PRICE' || packageType === 'PURCHASE';
  const isPackageRedemption = pricingRule === 'PACKAGE_REDEMPTION' || packageType === 'REDEMPTION';

  if (!pricingLabel && !pricingRule && !pricingMode && !serviceTitle && !packageType) {
    return null;
  }

  return {
    serviceTitle: serviceTitle || null,
    label: pricingLabel || null,
    rule: pricingRule || null,
    mode: pricingMode || null,
    paymentStatus: consultation.payment?.status || null,
    amountInPaise: consultation.payment?.amountInPaise ?? null,
    refundedAmountInPaise: consultation.payment?.refundedAmountInPaise ?? null,
    netPaidInPaise: consultation.payment
      ? Math.max(0, consultation.payment.amountInPaise - consultation.payment.refundedAmountInPaise)
      : null,
    balanceDueInPaise: Number(
      pricingSnapshot['balanceDueInPaise'] ?? lineItems['balanceDueInPaise'] ?? 0
    ),
    billableMinutes: Number(lineItems['careTeamBillableMinutes'] || 0) || null,
    payoutStatus: consultation.payment?.providerEarning?.payoutStatus || null,
    providerEarningInPaise: consultation.payment?.providerEarning?.providerEarningInPaise ?? null,
    platformFeeInPaise: consultation.payment?.providerEarning?.platformFeeInPaise ?? null,
    isPackagePurchase,
    isPackageRedemption,
    isPaidByPackage: isPackageRedemption,
    packageConsultationId:
      pricingSnapshot['careTeamPackageConsultationId'] ||
      packageUsage['packageConsultationId'] ||
      null,
    totalSessions: Number(packageUsage['totalSessions'] || 0),
    usedSessions: Number(packageUsage['usedSessions'] || 0),
    remainingSessions: Number(packageUsage['remainingSessions'] || 0),
    remainingBefore: Number(pricingSnapshot['careTeamPackageRemainingBefore'] ?? 0) || null
  };
}

function toWorklistItem(consultation: Awaited<ReturnType<typeof loadDoctorConsultations>>[number]) {
  const followUpDate = publishedFollowUpDate(consultation);
  return {
    id: consultation.id,
    status: consultation.status,
    createdAt: consultation.createdAt,
    patient: consultation.patient,
    disease: consultation.disease,
    pricing: toPricingSummary(consultation),
    followUpDate,
    followUpUrgency: resolveFollowUpUrgency(followUpDate),
    sections: worklistSections(consultation)
  };
}

async function loadDoctorConsultations(doctorId: string) {
  return prisma.consultation.findMany({
    where: {
      assignedDoctorId: doctorId,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: includeConsultationRelations(),
    orderBy: { createdAt: 'desc' }
  });
}

function sectionItems(
  items: ReturnType<typeof toWorklistItem>[],
  section: WorklistSection,
  view: WorklistView
) {
  const filtered = items.filter((item) => item.sections.includes(section));
  if (view !== 'ALL' && view !== section) {
    return [];
  }
  return [...filtered].sort(compareWorklistItems);
}

export const doctorWorklistRouter = Router();

doctorWorklistRouter.get(
  '/doctor/worklist',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const query = z
      .object({
        view: z.enum(['ALL', 'ASSIGNED', 'IN_PROGRESS', 'FOLLOW_UP_DUE']).optional().default('ALL'),
        q: z.string().optional().default('')
      })
      .parse(req.query);

    const consultations = await loadDoctorConsultations(req.user!.id);
    const items = consultations
      .filter((consultation) => matchesWorklistSearch(consultation, query.q))
      .map(toWorklistItem);

    const assigned = sectionItems(items, 'ASSIGNED', query.view);
    const inProgress = sectionItems(items, 'IN_PROGRESS', query.view);
    const followUpDue = sectionItems(items, 'FOLLOW_UP_DUE', query.view);

    void trackProductEvent({
      name: PRODUCT_EVENTS.DOCTOR_WORKLIST_VIEWED,
      category: ProductEventCategory.ENGAGEMENT,
      actorId: req.user!.id,
      actorRole: req.user!.role,
      properties: { view: query.view, itemCount: items.length }
    });

    res.json({
      view: query.view,
      counts: {
        assigned: items.filter((item) => item.sections.includes('ASSIGNED')).length,
        inProgress: items.filter((item) => item.sections.includes('IN_PROGRESS')).length,
        followUpDue: items.filter((item) => item.sections.includes('FOLLOW_UP_DUE')).length
      },
      sections: {
        assigned,
        inProgress,
        followUpDue
      }
    });
  })
);
