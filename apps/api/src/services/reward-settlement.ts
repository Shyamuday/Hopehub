import { PaymentStatus, RewardBeneficiary, RewardTrigger, RewardValueType } from '@prisma/client';
import { prisma } from '../db.js';
import { debitWallet, creditWallet } from './patient-wallet.js';
import { isFirstPaidConsultation } from './referral-codes.js';
import {
  computeDiscountAmount,
  listActiveSettlementRules,
  ruleUsageAllows
} from './reward-rules.js';
import { recordCheckoutRedemptions, type AppliedCheckoutRule } from './checkout-pricing.js';

async function resolveBeneficiaryPatientId(
  beneficiary: RewardBeneficiary,
  payingPatientId: string,
  hasReferrer: boolean
): Promise<string | null> {
  if (beneficiary === RewardBeneficiary.PAYING_PATIENT) return payingPatientId;
  if (beneficiary === RewardBeneficiary.REFERRED_PATIENT)
    return hasReferrer ? payingPatientId : null;
  if (beneficiary === RewardBeneficiary.REFERRER) {
    const patient = await prisma.user.findUnique({
      where: { id: payingPatientId },
      select: { referredByUserId: true }
    });
    return patient?.referredByUserId ?? null;
  }
  return null;
}

async function applyWalletCreditRule(input: {
  ruleId: string;
  patientId: string;
  amountInPaise: number;
  paymentId: string;
  note: string;
}) {
  await creditWallet({
    patientId: input.patientId,
    amountInPaise: input.amountInPaise,
    sourceType: 'REWARD_RULE',
    sourceId: input.paymentId,
    ruleId: input.ruleId,
    note: input.note
  });
  await prisma.rewardRedemption.create({
    data: {
      ruleId: input.ruleId,
      patientId: input.patientId,
      paymentId: input.paymentId,
      amountInPaise: input.amountInPaise,
      context: { phase: 'settlement' }
    }
  });
}

export async function settleConsultationPaymentRewards(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      consultation: { select: { id: true, patientId: true } }
    }
  });
  if (!payment || payment.status !== PaymentStatus.PAID) return;
  const patientId = payment.consultation.patientId;

  const appliedRules = (payment.appliedRules as AppliedCheckoutRule[] | null) ?? [];
  if (appliedRules.length) {
    const existingCheckout = await prisma.rewardRedemption.count({ where: { paymentId } });
    if (!existingCheckout) {
      await recordCheckoutRedemptions(patientId, paymentId, appliedRules);
    }
  }

  if (payment.walletRedeemedInPaise > 0) {
    const walletDebited = await prisma.walletLedgerEntry.findFirst({
      where: { sourceType: 'CONSULTATION_PAYMENT', sourceId: paymentId }
    });
    if (!walletDebited) {
      try {
        await debitWallet({
          patientId,
          amountInPaise: payment.walletRedeemedInPaise,
          sourceType: 'CONSULTATION_PAYMENT',
          sourceId: paymentId,
          note: 'Wallet redeemed on consultation payment'
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'INSUFFICIENT_WALLET_BALANCE') {
          console.warn(
            `[rewards] Wallet debit skipped for payment ${paymentId} — insufficient balance`
          );
        } else {
          throw err;
        }
      }
    }
  }

  const paidCount = await prisma.payment.count({
    where: { status: PaymentStatus.PAID, consultation: { patientId } }
  });
  const isFirstPayment = paidCount === 1;
  const trigger = isFirstPayment
    ? RewardTrigger.FIRST_CONSULTATION_PAID
    : RewardTrigger.CONSULTATION_PAID;
  const rules = await listActiveSettlementRules(trigger);
  const gross = payment.grossAmountInPaise ?? payment.amountInPaise;
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { referredByUserId: true }
  });
  const hasReferrer = Boolean(patient?.referredByUserId);

  for (const rule of rules) {
    if (rule.valueType !== RewardValueType.WALLET_CREDIT_FLAT) continue;

    const beneficiaryId = await resolveBeneficiaryPatientId(
      rule.beneficiary,
      patientId,
      hasReferrer
    );
    if (!beneficiaryId) continue;
    if (!(await ruleUsageAllows(rule, beneficiaryId))) continue;

    const amount =
      rule.valueType === RewardValueType.WALLET_CREDIT_FLAT
        ? rule.valueAmount
        : computeDiscountAmount(rule, gross);
    if (amount <= 0) continue;

    const already = await prisma.rewardRedemption.findFirst({
      where: { ruleId: rule.id, paymentId, patientId: beneficiaryId }
    });
    if (already) continue;

    await applyWalletCreditRule({
      ruleId: rule.id,
      patientId: beneficiaryId,
      amountInPaise: amount,
      paymentId,
      note: rule.name
    });
  }
}

export async function quoteConsultationCheckoutForPatient(input: {
  patientId: string;
  diseaseId: string;
  purchaseType: 'ONE_TIME' | 'PLAN';
  planCode?: string;
  promoCode?: string;
  walletRedeemInPaise?: number;
  clinicStoreId?: string | null;
}) {
  const disease = await prisma.disease.findUniqueOrThrow({ where: { id: input.diseaseId } });
  const patient = await prisma.user.findUniqueOrThrow({
    where: { id: input.patientId },
    select: { homeClinicStoreId: true }
  });

  const { resolveDiseaseConsultationFee } = await import('./consultation-pricing.js');
  const clinicStoreId =
    input.clinicStoreId === undefined ? patient.homeClinicStoreId : input.clinicStoreId;
  const consultFeePaise = await resolveDiseaseConsultationFee(disease.id, clinicStoreId);

  let grossInPaise = consultFeePaise;
  if (input.purchaseType === 'PLAN') {
    const plan = await prisma.billingPlan.findFirst({
      where: { code: input.planCode || '', isActive: true }
    });
    if (plan) grossInPaise = plan.priceInPaise;
  }

  const { resolveConsultationCheckout } = await import('./checkout-pricing.js');
  return resolveConsultationCheckout({
    patientId: input.patientId,
    grossInPaise,
    promoCode: input.promoCode,
    walletRedeemInPaise: input.walletRedeemInPaise
  });
}
