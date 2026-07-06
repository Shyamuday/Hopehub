import { ConsultationStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { ensureBillingPlans } from '../routes/catalog.js';
import { createPatientRecord, normalizeMobile } from './patient-identity.js';
import { PRODUCT_EVENTS, trackProductEvent } from './product-analytics.js';

export async function bookConsultationFromLead(input: {
  leadId: string;
  diseaseId: string;
  storeId: string;
  actor: { id: string; role: Role };
  collectCash?: boolean;
  notes?: string;
}) {
  const lead = await prisma.websiteLead.findUnique({ where: { id: input.leadId } });
  if (!lead) {
    throw new Error('LEAD_NOT_FOUND');
  }
  if (lead.consultationId) {
    throw new Error('LEAD_ALREADY_BOOKED');
  }
  if (!lead.visitorPhone) {
    throw new Error('LEAD_NO_PHONE');
  }

  await ensureBillingPlans();
  const disease = await prisma.disease.findUniqueOrThrow({ where: { id: input.diseaseId } });
  const billingPlan = await prisma.billingPlan.findFirst({ where: { code: 'ONE_TIME', isActive: true } });
  if (!billingPlan) {
    throw new Error('BILLING_PLAN_MISSING');
  }

  let patientId = lead.userId;
  if (!patientId) {
    const mobile = normalizeMobile(lead.visitorPhone);
    if (!mobile) throw new Error('LEAD_INVALID_PHONE');
    const existing = await prisma.user.findFirst({
      where: { mobile, role: Role.PATIENT },
      select: { id: true }
    });
    if (existing) {
      patientId = existing.id;
    } else {
      const patient = await createPatientRecord({
        name: lead.visitorName?.trim() || mobile,
        mobile,
        homeClinicStoreId: input.storeId
      });
      patientId = patient.id;
    }
  }

  const consultation = await prisma.consultation.create({
    data: {
      patientId,
      diseaseId: disease.id,
      clinicStoreId: input.storeId,
      intakeAnswers: { source: 'visitor_lead', leadId: lead.id, concern: lead.concern ?? null },
      billingPlanCode: billingPlan.code,
      pricingSnapshot: {
        source: 'visitor_lead',
        leadId: lead.id,
        diseaseFeeInPaise: disease.feeInPaise,
        notes: input.notes ?? lead.operatorNote ?? null
      },
      payment: {
        create: {
          amountInPaise: disease.feeInPaise,
          billingPlanCode: billingPlan.code,
          lineItems: {
            source: 'visitor_lead',
            diseaseName: disease.name,
            leadId: lead.id
          },
          status: input.collectCash ? PaymentStatus.PAID : PaymentStatus.CREATED
        }
      },
      status: input.collectCash ? ConsultationStatus.PAID : ConsultationStatus.PAYMENT_PENDING
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true, patientCode: true } },
      disease: { select: { id: true, name: true, feeInPaise: true } },
      payment: { select: { id: true, status: true, amountInPaise: true } }
    }
  });

  const updatedLead = await prisma.websiteLead.update({
    where: { id: lead.id },
    data: {
      userId: patientId,
      consultationId: consultation.id,
      followUpStatus: 'BOOKED',
      bookedAt: new Date(),
      registeredAt: lead.registeredAt ?? new Date()
    }
  });

  void trackProductEvent({
    name: PRODUCT_EVENTS.CONSULTATION_BOOKED,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    properties: {
      consultationId: consultation.id,
      patientId,
      source: 'visitor_lead',
      leadId: lead.id,
      leadSource: lead.source
    }
  });

  void trackProductEvent({
    name: 'visitor_lead.booked',
    category: 'FUNNEL',
    actorId: input.actor.id,
    actorRole: input.actor.role,
    properties: { leadId: lead.id, consultationId: consultation.id, source: lead.source }
  });

  return { lead: updatedLead, consultation };
}
