import { PaymentStatus, Prisma, ProviderPayoutStatus } from '@prisma/client';
import { prisma } from '../db.js';
import {
  doctorReceivesConsultationShare,
  resolveDoctorSharePercent
} from './doctor-compensation.js';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function computeShare(grossAmountInPaise: number, sharePercent: number) {
  const providerEarningInPaise = Math.round((grossAmountInPaise * sharePercent) / 100);
  return {
    providerEarningInPaise,
    platformFeeInPaise: Math.max(0, grossAmountInPaise - providerEarningInPaise)
  };
}

export async function upsertProviderEarningForPayment(
  paymentId: string,
  options?: { forceHold?: boolean; payoutNote?: string }
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      consultation: {
        select: {
          id: true,
          patientId: true,
          assignedDoctorId: true,
          pricingSnapshot: true
        }
      }
    }
  });
  if (!payment?.consultation.assignedDoctorId) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { userId: payment.consultation.assignedDoctorId },
    select: { compensationModel: true, consultationSharePercent: true }
  });
  const sharePercent =
    doctor && doctorReceivesConsultationShare(doctor) ? resolveDoctorSharePercent(doctor) : 0;

  const snapshot = asRecord(payment.consultation.pricingSnapshot);
  const lineItems = asRecord(payment.lineItems);
  const checkout = asRecord(snapshot['checkout']);
  const packageUsage = snapshot['packageUsage'] || lineItems['packageUsage'] || null;
  const isPlatformFundedReferralCall = Boolean(checkout['referralFreeCallRewardId']);
  const grossAmountInPaise = Math.max(
    0,
    Number(
      isPlatformFundedReferralCall
        ? payment.grossAmountInPaise || payment.amountInPaise || 0
        : payment.amountInPaise || 0
    ) - Number(payment.refundedAmountInPaise || 0)
  );
  const isEarnable =
    payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.PARTIALLY_REFUNDED;
  const split = computeShare(isEarnable ? grossAmountInPaise : 0, sharePercent);

  const existing = await prisma.providerEarning.findUnique({
    where: { paymentId: payment.id },
    select: {
      payoutStatus: true,
      paidAt: true,
      paidByUserId: true,
      payoutReference: true,
      payoutNote: true
    }
  });
  const nextPayoutStatus = options?.forceHold
    ? ProviderPayoutStatus.HOLD
    : existing?.payoutStatus === ProviderPayoutStatus.PAID
      ? ProviderPayoutStatus.PAID
      : isEarnable
        ? ProviderPayoutStatus.PENDING
        : ProviderPayoutStatus.HOLD;

  return prisma.providerEarning.upsert({
    where: { paymentId: payment.id },
    create: {
      consultationId: payment.consultationId,
      paymentId: payment.id,
      doctorUserId: payment.consultation.assignedDoctorId,
      patientId: payment.consultation.patientId,
      grossAmountInPaise,
      providerSharePercent: sharePercent,
      providerEarningInPaise: split.providerEarningInPaise,
      platformFeeInPaise: split.platformFeeInPaise,
      paymentStatus: payment.status,
      payoutStatus: nextPayoutStatus,
      payoutNote: options?.payoutNote || null,
      pricingMode:
        String(snapshot['careTeamPricingMode'] || lineItems['careTeamPricingMode'] || '') || null,
      pricingRule:
        String(snapshot['careTeamPricingRule'] || lineItems['careTeamPricingRule'] || '') || null,
      serviceTitle:
        String(snapshot['careTeamServiceTitle'] || lineItems['careTeamServiceTitle'] || '') || null,
      packageUsage: packageUsage ? (packageUsage as Prisma.InputJsonValue) : Prisma.JsonNull
    },
    update: {
      doctorUserId: payment.consultation.assignedDoctorId,
      patientId: payment.consultation.patientId,
      grossAmountInPaise,
      providerSharePercent: sharePercent,
      providerEarningInPaise: split.providerEarningInPaise,
      platformFeeInPaise: split.platformFeeInPaise,
      paymentStatus: payment.status,
      payoutStatus: nextPayoutStatus,
      ...(options?.payoutNote ? { payoutNote: options.payoutNote } : {}),
      pricingMode:
        String(snapshot['careTeamPricingMode'] || lineItems['careTeamPricingMode'] || '') || null,
      pricingRule:
        String(snapshot['careTeamPricingRule'] || lineItems['careTeamPricingRule'] || '') || null,
      serviceTitle:
        String(snapshot['careTeamServiceTitle'] || lineItems['careTeamServiceTitle'] || '') || null,
      packageUsage: packageUsage ? (packageUsage as Prisma.InputJsonValue) : Prisma.JsonNull
    }
  });
}

export async function backfillProviderEarnings() {
  const payments = await prisma.payment.findMany({
    where: { consultation: { assignedDoctorId: { not: null } } },
    select: { id: true },
    orderBy: { createdAt: 'asc' }
  });
  let createdOrUpdated = 0;
  for (const payment of payments) {
    const earning = await upsertProviderEarningForPayment(payment.id);
    if (earning) createdOrUpdated += 1;
  }
  return { scanned: payments.length, createdOrUpdated };
}
