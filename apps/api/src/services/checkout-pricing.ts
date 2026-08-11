import {
  RewardBeneficiary,
  RewardTrigger,
  RewardValueType,
  type RewardProgramRule
} from '@prisma/client';
import { prisma } from '../db.js';
import { isFirstPaidConsultation } from './referral-codes.js';
import {
  computeDiscountAmount,
  getActiveWalletPolicyRule,
  listActiveCheckoutDiscountRules,
  ruleUsageAllows
} from './reward-rules.js';
import {
  getWalletBalance,
  resolveWalletRedeemCap,
  walletPolicyFromRule
} from './patient-wallet.js';

export type AppliedCheckoutRule = {
  ruleId: string;
  code: string;
  name: string;
  amountInPaise: number;
  valueType: RewardValueType;
};

export type ConsultationCheckoutQuote = {
  grossAmountInPaise: number;
  discountInPaise: number;
  walletRedeemedInPaise: number;
  payableInPaise: number;
  walletBalanceInPaise: number;
  maxWalletRedeemInPaise: number;
  appliedRules: AppliedCheckoutRule[];
};

type CheckoutContext = {
  patientId: string;
  grossInPaise: number;
  promoCode?: string;
  walletRedeemInPaise?: number;
};

async function patientMatchesBeneficiary(
  rule: RewardProgramRule,
  patientId: string,
  opts: { isFirstPayment: boolean; hasReferrer: boolean }
) {
  if (rule.beneficiary === RewardBeneficiary.PAYING_PATIENT) return true;
  if (rule.beneficiary === RewardBeneficiary.REFERRED_PATIENT) return opts.hasReferrer;
  if (rule.beneficiary === RewardBeneficiary.REFERRER) return false;
  return true;
}

async function triggerMatchesCheckout(rule: RewardProgramRule, isFirstPayment: boolean) {
  if (rule.trigger === RewardTrigger.FIRST_CONSULTATION_PAID) return isFirstPayment;
  if (rule.trigger === RewardTrigger.CONSULTATION_PAID) return true;
  if (rule.trigger === RewardTrigger.PATIENT_SIGNUP_WITH_REFERRAL) return false;
  return false;
}

/** Preview checkout for a brand-new walk-in (no patient record yet). */
export async function resolveGuestConsultationCheckout(input: {
  grossInPaise: number;
  promoCode?: string;
}): Promise<ConsultationCheckoutQuote> {
  const { grossInPaise } = input;
  if (grossInPaise <= 0) {
    return {
      grossAmountInPaise: 0,
      discountInPaise: 0,
      walletRedeemedInPaise: 0,
      payableInPaise: 0,
      walletBalanceInPaise: 0,
      maxWalletRedeemInPaise: 0,
      appliedRules: []
    };
  }

  const rules = await listActiveCheckoutDiscountRules();
  const appliedRules: AppliedCheckoutRule[] = [];
  let discountInPaise = 0;
  let remainingGross = grossInPaise;
  const promo = input.promoCode?.trim().toUpperCase();
  const isFirstPayment = true;
  const hasReferrer = false;

  for (const rule of rules) {
    if (
      rule.valueType !== RewardValueType.CHECKOUT_DISCOUNT_FLAT &&
      rule.valueType !== RewardValueType.CHECKOUT_DISCOUNT_PERCENT
    ) {
      continue;
    }
    if (rule.promoCode) {
      if (!promo || rule.promoCode.toUpperCase() !== promo) continue;
    }
    if (rule.minOrderInPaise != null && grossInPaise < rule.minOrderInPaise) continue;
    if (!(await triggerMatchesCheckout(rule, isFirstPayment))) continue;
    if (rule.beneficiary !== RewardBeneficiary.PAYING_PATIENT) continue;

    const amount = computeDiscountAmount(rule, remainingGross);
    if (amount <= 0) continue;

    discountInPaise += amount;
    remainingGross = Math.max(0, remainingGross - amount);
    appliedRules.push({
      ruleId: rule.id,
      code: rule.code,
      name: rule.name,
      amountInPaise: amount,
      valueType: rule.valueType
    });
  }

  const afterDiscount = Math.max(0, grossInPaise - discountInPaise);
  const policyRule = await getActiveWalletPolicyRule();
  const policy = walletPolicyFromRule(policyRule);
  const payableInPaise = afterDiscount <= 0 ? 0 : Math.max(policy.minPayableInPaise, afterDiscount);

  return {
    grossAmountInPaise: grossInPaise,
    discountInPaise,
    walletRedeemedInPaise: 0,
    payableInPaise,
    walletBalanceInPaise: 0,
    maxWalletRedeemInPaise: 0,
    appliedRules
  };
}

export async function resolveConsultationCheckout(
  input: CheckoutContext
): Promise<ConsultationCheckoutQuote> {
  const { patientId, grossInPaise } = input;
  if (grossInPaise <= 0) {
    return {
      grossAmountInPaise: 0,
      discountInPaise: 0,
      walletRedeemedInPaise: 0,
      payableInPaise: 0,
      walletBalanceInPaise: 0,
      maxWalletRedeemInPaise: 0,
      appliedRules: []
    };
  }

  const [walletBalance, isFirstPayment, patient] = await Promise.all([
    getWalletBalance(patientId),
    isFirstPaidConsultation(patientId),
    prisma.user.findUnique({ where: { id: patientId }, select: { referredByUserId: true } })
  ]);
  const hasReferrer = Boolean(patient?.referredByUserId);

  const rules = await listActiveCheckoutDiscountRules();
  const appliedRules: AppliedCheckoutRule[] = [];
  let discountInPaise = 0;
  let remainingGross = grossInPaise;

  const promo = input.promoCode?.trim().toUpperCase();
  for (const rule of rules) {
    if (
      rule.valueType !== RewardValueType.CHECKOUT_DISCOUNT_FLAT &&
      rule.valueType !== RewardValueType.CHECKOUT_DISCOUNT_PERCENT
    ) {
      continue;
    }
    if (rule.promoCode) {
      if (!promo || rule.promoCode.toUpperCase() !== promo) continue;
    }
    if (rule.minOrderInPaise != null && grossInPaise < rule.minOrderInPaise) continue;
    if (!(await triggerMatchesCheckout(rule, isFirstPayment))) continue;
    if (!(await patientMatchesBeneficiary(rule, patientId, { isFirstPayment, hasReferrer })))
      continue;
    if (!(await ruleUsageAllows(rule, patientId))) continue;

    const amount = computeDiscountAmount(rule, remainingGross);
    if (amount <= 0) continue;

    discountInPaise += amount;
    remainingGross = Math.max(0, remainingGross - amount);
    appliedRules.push({
      ruleId: rule.id,
      code: rule.code,
      name: rule.name,
      amountInPaise: amount,
      valueType: rule.valueType
    });
  }

  const afterDiscount = Math.max(0, grossInPaise - discountInPaise);
  const policyRule = await getActiveWalletPolicyRule();
  const policy = walletPolicyFromRule(policyRule);
  const maxWalletRedeemInPaise = resolveWalletRedeemCap(afterDiscount, walletBalance, policy);
  const requestedWallet = Math.max(0, input.walletRedeemInPaise ?? 0);
  const walletRedeemedInPaise =
    afterDiscount <= 0 ? 0 : Math.min(requestedWallet, maxWalletRedeemInPaise);
  const payableInPaise =
    afterDiscount <= 0
      ? 0
      : Math.max(policy.minPayableInPaise, afterDiscount - walletRedeemedInPaise);

  return {
    grossAmountInPaise: grossInPaise,
    discountInPaise,
    walletRedeemedInPaise,
    payableInPaise,
    walletBalanceInPaise: walletBalance,
    maxWalletRedeemInPaise,
    appliedRules
  };
}

export async function recordCheckoutRedemptions(
  patientId: string,
  paymentId: string,
  appliedRules: AppliedCheckoutRule[]
) {
  if (!appliedRules.length) return;
  await prisma.rewardRedemption.createMany({
    data: appliedRules.map((rule) => ({
      ruleId: rule.ruleId,
      patientId,
      paymentId,
      amountInPaise: rule.amountInPaise,
      context: { phase: 'checkout', code: rule.code }
    }))
  });
}
