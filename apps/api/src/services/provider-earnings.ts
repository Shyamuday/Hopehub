import { PaymentStatus, Prisma, ProviderPayoutStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { doctorReceivesConsultationShare } from './doctor-compensation.js';
import {
  compensationConfigFromSnapshot,
  computeProviderCompensation,
  providerCompensationSelect,
  serializeProviderCompensation
} from './provider-compensation.js';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
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
    select: { compensationModel: true, ...providerCompensationSelect }
  });

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
  const existing = await prisma.providerEarning.findUnique({
    where: { paymentId: payment.id },
    select: {
      payoutStatus: true,
      paidAt: true,
      paidByUserId: true,
      payoutReference: true,
      payoutNote: true,
      compensationSnapshot: true
    }
  });
  const compensationConfig = doctor
    ? compensationConfigFromSnapshot(existing?.compensationSnapshot, doctor)
    : null;
  const compensationSnapshot = compensationConfig
    ? serializeProviderCompensation(compensationConfig)
    : null;
  const split =
    doctor && compensationConfig && doctorReceivesConsultationShare(doctor)
      ? computeProviderCompensation(isEarnable ? grossAmountInPaise : 0, compensationConfig)
      : {
          providerEarningInPaise: 0,
          platformFeeInPaise: isEarnable ? grossAmountInPaise : 0,
          effectiveProviderPercent: 0,
          earningModel: 'SALARIED',
          configuredPercent: 0,
          configuredFixedInPaise: 0
        };
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
      providerSharePercent: split.effectiveProviderPercent,
      earningModel: split.earningModel,
      configuredPercent: split.configuredPercent,
      configuredFixedInPaise: split.configuredFixedInPaise,
      compensationSnapshot: compensationSnapshot
        ? (compensationSnapshot as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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
      providerSharePercent: split.effectiveProviderPercent,
      earningModel: split.earningModel,
      configuredPercent: split.configuredPercent,
      configuredFixedInPaise: split.configuredFixedInPaise,
      compensationSnapshot: existing?.compensationSnapshot
        ? undefined
        : compensationSnapshot
          ? (compensationSnapshot as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
