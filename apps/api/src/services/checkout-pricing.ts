import {
  RewardBeneficiary,
  RewardTrigger,
  RewardValueType,
  type RewardProgramRule
} from '@prisma/client';
import { prisma } from '../db.js';
import { findAvailableReferralFreeCall, isFirstPaidConsultation } from './referral-codes.js';
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
  promoCode?: string | null;
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
  referralFreeCallRewardId?: string | null;
  referralFreeCallCouponCode?: string | null;
};

type CheckoutContext = {
  patientId: string;
  grossInPaise: number;
  promoCode?: string;
  walletRedeemInPaise?: number;
  serviceName?: string;
  offeringId?: string | null;
  careTeamServiceId?: string | null;
  providerId?: string | null;
  assessmentId?: string | null;
  careTeamTypes?: string[];
};

type CheckoutScopeContext = Pick<
  CheckoutContext,
  | 'serviceName'
  | 'offeringId'
  | 'careTeamServiceId'
  | 'providerId'
  | 'assessmentId'
  | 'careTeamTypes'
>;

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

function conditionList(conditions: unknown, key: string): string[] {
  if (!conditions || typeof conditions !== 'object') return [];
  const value = (conditions as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function conditionNumber(conditions: unknown, key: string): number | null {
  if (!conditions || typeof conditions !== 'object') return null;
  const value = (conditions as Record<string, unknown>)[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function matchesConditionValue(
  allowed: string[],
  value?: string | null,
  opts: { caseInsensitive?: boolean } = {}
) {
  if (!allowed.length) return true;
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return false;
  if (!opts.caseInsensitive) return allowed.includes(normalizedValue);
  const lower = normalizedValue.toLowerCase();
  return allowed.some((item) => item.toLowerCase() === lower);
}

async function careTeamTypesForCheckout(context: CheckoutScopeContext): Promise<string[]> {
  if (context.careTeamTypes?.length) return context.careTeamTypes;

  if (context.careTeamServiceId) {
    const service = await prisma.careTeamService.findUnique({
      where: { id: context.careTeamServiceId },
      select: {
        mentalHealthProfile: {
          select: {
            careTeamType: true,
            careTeamTypes: true
          }
        }
      }
    });
    const profile = service?.mentalHealthProfile;
    return [
      ...(profile?.careTeamType ? [profile.careTeamType] : []),
      ...(profile?.careTeamTypes ?? [])
    ].filter(Boolean);
  }

  if (context.providerId) {
    const provider = await prisma.doctor.findUnique({
      where: { id: context.providerId },
      select: {
        mentalHealthProfile: {
          select: {
            careTeamType: true,
            careTeamTypes: true
          }
        }
      }
    });
    const profile = provider?.mentalHealthProfile;
    return [
      ...(profile?.careTeamType ? [profile.careTeamType] : []),
      ...(profile?.careTeamTypes ?? [])
    ].filter(Boolean);
  }

  return [];
}

async function isSingleListenerSessionCheckout(context: CheckoutScopeContext) {
  const [offering, careTeamService] = await Promise.all([
    context.offeringId
      ? prisma.hopeHubOffering.findUnique({
          where: { id: context.offeringId },
          select: { type: true, sessionCount: true }
        })
      : null,
    context.careTeamServiceId
      ? prisma.careTeamService.findUnique({
          where: { id: context.careTeamServiceId },
          select: { pricingMode: true, packageSessionCount: true }
        })
      : null
  ]);

  if (
    offering &&
    (offering.type !== 'INDIVIDUAL_SESSION' || Number(offering.sessionCount || 1) > 1)
  ) {
    return false;
  }
  if (
    careTeamService &&
    (careTeamService.pricingMode === 'PACKAGE' ||
      Number(careTeamService.packageSessionCount || 1) > 1)
  ) {
    return false;
  }
  return true;
}

async function ruleScopeMatchesCheckout(rule: RewardProgramRule, context: CheckoutScopeContext) {
  const conditions = rule.conditions;
  if (!conditions || typeof conditions !== 'object') return true;
  const allowedCareTeamTypes = conditionList(conditions, 'providerCareTeamTypes');
  const careTeamTypeMatches =
    !allowedCareTeamTypes.length ||
    (await careTeamTypesForCheckout(context)).some((type) =>
      matchesConditionValue(allowedCareTeamTypes, type, { caseInsensitive: true })
    );

  return (
    careTeamTypeMatches &&
    matchesConditionValue(conditionList(conditions, 'serviceNames'), context.serviceName, {
      caseInsensitive: true
    }) &&
    matchesConditionValue(conditionList(conditions, 'offeringIds'), context.offeringId) &&
    matchesConditionValue(
      conditionList(conditions, 'careTeamServiceIds'),
      context.careTeamServiceId
    ) &&
    matchesConditionValue(conditionList(conditions, 'providerIds'), context.providerId) &&
    matchesConditionValue(conditionList(conditions, 'assessmentIds'), context.assessmentId)
  );
}

function checkoutDiscountAmount(rule: RewardProgramRule, remainingGrossInPaise: number) {
  const targetPayableInPaise = conditionNumber(rule.conditions, 'targetPayableInPaise');
  if (targetPayableInPaise !== null) {
    return Math.max(0, remainingGrossInPaise - targetPayableInPaise);
  }
  return computeDiscountAmount(rule, remainingGrossInPaise);
}

/** Preview checkout for a brand-new walk-in (no patient record yet). */
export async function resolveGuestConsultationCheckout(input: {
  grossInPaise: number;
  promoCode?: string;
  serviceName?: string;
  offeringId?: string | null;
  careTeamServiceId?: string | null;
  providerId?: string | null;
  assessmentId?: string | null;
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
    if (!(await ruleScopeMatchesCheckout(rule, input))) continue;
    if (rule.minOrderInPaise != null && grossInPaise < rule.minOrderInPaise) continue;
    if (!(await triggerMatchesCheckout(rule, isFirstPayment))) continue;
    if (rule.beneficiary !== RewardBeneficiary.PAYING_PATIENT) continue;

    const amount = checkoutDiscountAmount(rule, remainingGross);
    if (amount <= 0) continue;

    discountInPaise += amount;
    remainingGross = Math.max(0, remainingGross - amount);
    appliedRules.push({
      ruleId: rule.id,
      code: rule.code,
      promoCode: rule.promoCode,
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

  const referralFreeCall = await findAvailableReferralFreeCall(patientId, input.promoCode);
  if (referralFreeCall) {
    const careTeamTypes = await careTeamTypesForCheckout(input);
    const isListenerSession = careTeamTypes.some((type) =>
      ['PEER_SUPPORT_VOLUNTEER', 'PSYCHOLOGY_STUDENT_VOLUNTEER'].includes(type)
    );
    if (isListenerSession && (await isSingleListenerSessionCheckout(input))) {
      return {
        grossAmountInPaise: grossInPaise,
        discountInPaise: grossInPaise,
        walletRedeemedInPaise: 0,
        payableInPaise: 0,
        walletBalanceInPaise: await getWalletBalance(patientId),
        maxWalletRedeemInPaise: 0,
        appliedRules: [],
        referralFreeCallRewardId: referralFreeCall.id,
        referralFreeCallCouponCode: referralFreeCall.couponCode
      };
    }
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
    if (!(await ruleScopeMatchesCheckout(rule, input))) continue;
    if (rule.minOrderInPaise != null && grossInPaise < rule.minOrderInPaise) continue;
    if (!(await triggerMatchesCheckout(rule, isFirstPayment))) continue;
    if (!(await patientMatchesBeneficiary(rule, patientId, { isFirstPayment, hasReferrer })))
      continue;
    if (!(await ruleUsageAllows(rule, patientId))) continue;

    const amount = checkoutDiscountAmount(rule, remainingGross);
    if (amount <= 0) continue;

    discountInPaise += amount;
    remainingGross = Math.max(0, remainingGross - amount);
    appliedRules.push({
      ruleId: rule.id,
      code: rule.code,
      promoCode: rule.promoCode,
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

/**
 * A submitted promo must never silently become a full-price checkout. The quote
 * endpoint and the final booking endpoint both calculate pricing independently,
 * so this guard makes the final calculation authoritative and fail-safe.
 */
export function assertRequestedPromoApplied(
  promoCode: string | null | undefined,
  quote: ConsultationCheckoutQuote
) {
  const requestedPromo = String(promoCode || '')
    .trim()
    .toUpperCase();
  if (!requestedPromo) return;

  const applied =
    quote.referralFreeCallCouponCode?.trim().toUpperCase() === requestedPromo ||
    quote.appliedRules.some(
      (rule) =>
        String(rule.promoCode || '')
          .trim()
          .toUpperCase() === requestedPromo
    );

  if (!applied) {
    const error = new Error(
      'This coupon could not be applied to the selected session. No payment was started.'
    ) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  if (requestedPromo === 'FIRSTCHAT' && quote.payableInPaise !== 0) {
    const error = new Error(
      'FIRSTCHAT must make this listener session free. No payment was started.'
    ) as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
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
