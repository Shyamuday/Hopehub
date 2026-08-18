import {
  RewardAppliesTo,
  RewardBeneficiary,
  RewardProgramKind,
  RewardTrigger,
  RewardValueType,
  type RewardProgramRule
} from '@prisma/client';
import { prisma } from '../db.js';

export const DEFAULT_REWARD_RULES = [
  {
    code: 'WELCOME100_ALL_LIVE_SERVICES',
    name: 'Welcome 100% live-service access',
    description: 'Reusable 100% coupon for all Hope Hub live chat, voice, and video services.',
    kind: RewardProgramKind.PROMO,
    trigger: RewardTrigger.CONSULTATION_PAID,
    beneficiary: RewardBeneficiary.PAYING_PATIENT,
    valueType: RewardValueType.CHECKOUT_DISCOUNT_PERCENT,
    valueAmount: 10_000,
    appliesTo: RewardAppliesTo.CONSULTATION,
    promoCode: 'WELCOME100',
    priority: 1_000,
    maxUsesPerPatient: null,
    minPayableInPaise: 0,
    conditions: {
      targetPayableInPaise: 0,
      showToConsumers: true,
      featured: true,
      publicLabel: 'Welcome100 — your first connection is free',
      publicDescription:
        'Use this welcome coupon for a free Hope Hub chat, voice, or video session.'
    }
  },
  {
    code: 'REF_WELCOME_DISCOUNT',
    name: 'Referral welcome discount',
    description: 'Flat discount for a referred patient on their first paid consultation.',
    kind: RewardProgramKind.REFERRAL,
    trigger: RewardTrigger.FIRST_CONSULTATION_PAID,
    beneficiary: RewardBeneficiary.REFERRED_PATIENT,
    valueType: RewardValueType.CHECKOUT_DISCOUNT_FLAT,
    valueAmount: 10_000,
    appliesTo: RewardAppliesTo.CONSULTATION,
    priority: 10,
    maxUsesPerPatient: 1
  },
  {
    code: 'FIRSTCHAT_LISTENER_FREE',
    name: 'First Chat free listener session',
    description: 'Reusable test coupon for a fully free listener support session.',
    kind: RewardProgramKind.PROMO,
    trigger: RewardTrigger.CONSULTATION_PAID,
    beneficiary: RewardBeneficiary.PAYING_PATIENT,
    valueType: RewardValueType.CHECKOUT_DISCOUNT_PERCENT,
    valueAmount: 10_000,
    appliesTo: RewardAppliesTo.CONSULTATION,
    promoCode: 'FIRSTCHAT',
    priority: 110,
    maxUsesPerPatient: null,
    minPayableInPaise: 0,
    conditions: {
      targetPayableInPaise: 0,
      providerCareTeamTypes: ['PEER_SUPPORT_VOLUNTEER', 'PSYCHOLOGY_STUDENT_VOLUNTEER'],
      showToConsumers: false,
      featured: false
    }
  },
  {
    code: 'FIRSTTALK1_LISTENER_OFFER',
    name: 'First Talk ₹1 listener offer',
    description: 'Promotional coupon for eligible listener support sessions at ₹1.',
    kind: RewardProgramKind.PROMO,
    trigger: RewardTrigger.CONSULTATION_PAID,
    beneficiary: RewardBeneficiary.PAYING_PATIENT,
    valueType: RewardValueType.CHECKOUT_DISCOUNT_PERCENT,
    valueAmount: 10_000,
    appliesTo: RewardAppliesTo.CONSULTATION,
    promoCode: 'FIRSTTALK1',
    priority: 100,
    maxUsesPerPatient: null,
    minPayableInPaise: 100,
    conditions: {
      targetPayableInPaise: 100,
      providerCareTeamTypes: ['PEER_SUPPORT_VOLUNTEER', 'PSYCHOLOGY_STUDENT_VOLUNTEER'],
      showToConsumers: false,
      featured: false
    }
  },
  {
    code: 'WALLET_REDEEM_POLICY',
    name: 'Wallet redeem policy',
    description: 'Controls max wallet redemption per consultation order.',
    kind: RewardProgramKind.LOYALTY,
    trigger: RewardTrigger.MANUAL,
    beneficiary: RewardBeneficiary.PAYING_PATIENT,
    valueType: RewardValueType.CHECKOUT_DISCOUNT_FLAT,
    valueAmount: 0,
    appliesTo: RewardAppliesTo.CONSULTATION,
    priority: 0,
    minPayableInPaise: 100,
    conditions: { maxRedeemPercentOfOrder: 50, minPayableInPaise: 100 }
  }
] as const;

function optionalRuleString(rule: unknown, key: string) {
  const value = (rule as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function optionalRuleInt(rule: unknown, key: string) {
  const value = (rule as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

export async function ensureDefaultRewardRules() {
  await Promise.all(
    DEFAULT_REWARD_RULES.map((rule) =>
      prisma.rewardProgramRule.upsert({
        where: { code: rule.code },
        // Defaults are seeds, not forced configuration. Once an admin changes or
        // disables a rule, normal API reads must not silently overwrite that choice.
        update: {},
        create: {
          code: rule.code,
          name: rule.name,
          description: rule.description ?? null,
          kind: rule.kind,
          trigger: rule.trigger,
          beneficiary: rule.beneficiary,
          valueType: rule.valueType,
          valueAmount: rule.valueAmount,
          appliesTo: rule.appliesTo,
          promoCode: optionalRuleString(rule, 'promoCode'),
          priority: rule.priority,
          maxUsesPerPatient: optionalRuleInt(rule, 'maxUsesPerPatient'),
          maxUsesGlobal: optionalRuleInt(rule, 'maxUsesGlobal'),
          maxDiscountInPaise: optionalRuleInt(rule, 'maxDiscountInPaise'),
          minOrderInPaise: optionalRuleInt(rule, 'minOrderInPaise'),
          minPayableInPaise: 'minPayableInPaise' in rule ? rule.minPayableInPaise : 100,
          conditions: 'conditions' in rule ? rule.conditions : undefined,
          isActive: true
        }
      })
    )
  );
}

export function isRuleCurrentlyValid(rule: RewardProgramRule, now = new Date()) {
  if (!rule.isActive) return false;
  if (rule.validFrom && rule.validFrom > now) return false;
  if (rule.validUntil && rule.validUntil < now) return false;
  return true;
}

function ruleConditions(rule: RewardProgramRule): Record<string, unknown> {
  const conditions = rule.conditions;
  return conditions && typeof conditions === 'object' && !Array.isArray(conditions)
    ? (conditions as Record<string, unknown>)
    : {};
}

export async function listPublicRewardCoupons() {
  await ensureDefaultRewardRules();
  const rules = await prisma.rewardProgramRule.findMany({
    where: {
      isActive: true,
      kind: RewardProgramKind.PROMO,
      promoCode: { not: null }
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  });

  return rules
    .filter((rule) => isRuleCurrentlyValid(rule))
    .map((rule) => ({ rule, conditions: ruleConditions(rule) }))
    .filter(({ conditions }) => conditions['showToConsumers'] === true)
    .map(({ rule, conditions }) => ({
      code: rule.promoCode as string,
      name: rule.name,
      description:
        typeof conditions['publicDescription'] === 'string'
          ? conditions['publicDescription']
          : rule.description,
      label: typeof conditions['publicLabel'] === 'string' ? conditions['publicLabel'] : rule.name,
      featured: conditions['featured'] === true,
      appliesTo: rule.appliesTo,
      targetPayableInPaise:
        typeof conditions['targetPayableInPaise'] === 'number'
          ? Math.max(0, Math.round(conditions['targetPayableInPaise']))
          : null
    }));
}

export async function countRuleRedemptions(ruleId: string, patientId?: string) {
  return prisma.rewardRedemption.count({
    where: {
      ruleId,
      ...(patientId ? { patientId } : {})
    }
  });
}

export async function ruleUsageAllows(rule: RewardProgramRule, patientId: string) {
  if (rule.maxUsesPerPatient != null) {
    const used = await countRuleRedemptions(rule.id, patientId);
    if (used >= rule.maxUsesPerPatient) return false;
  }
  if (rule.maxUsesGlobal != null) {
    const used = await countRuleRedemptions(rule.id);
    if (used >= rule.maxUsesGlobal) return false;
  }
  return true;
}

export function computeDiscountAmount(rule: RewardProgramRule, grossInPaise: number) {
  if (rule.valueType === RewardValueType.CHECKOUT_DISCOUNT_FLAT) {
    return Math.min(rule.valueAmount, grossInPaise);
  }
  if (rule.valueType === RewardValueType.CHECKOUT_DISCOUNT_PERCENT) {
    let amount = Math.floor((grossInPaise * rule.valueAmount) / 10_000);
    if (rule.maxDiscountInPaise != null) amount = Math.min(amount, rule.maxDiscountInPaise);
    return Math.min(amount, grossInPaise);
  }
  return 0;
}

export async function getActiveWalletPolicyRule() {
  await ensureDefaultRewardRules();
  const rules = await prisma.rewardProgramRule.findMany({
    where: { code: 'WALLET_REDEEM_POLICY', isActive: true },
    take: 1
  });
  return rules[0] ?? null;
}

export async function listActiveCheckoutDiscountRules() {
  await ensureDefaultRewardRules();
  const rules = await prisma.rewardProgramRule.findMany({
    where: {
      isActive: true,
      appliesTo: { in: [RewardAppliesTo.CONSULTATION, RewardAppliesTo.ANY] },
      valueType: {
        in: [RewardValueType.CHECKOUT_DISCOUNT_FLAT, RewardValueType.CHECKOUT_DISCOUNT_PERCENT]
      }
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  });
  return rules.filter((r) => isRuleCurrentlyValid(r));
}

export async function listActiveSettlementRules(trigger: RewardTrigger) {
  await ensureDefaultRewardRules();
  const rules = await prisma.rewardProgramRule.findMany({
    where: {
      isActive: true,
      trigger,
      valueType: {
        in: [
          RewardValueType.WALLET_CREDIT_FLAT,
          RewardValueType.CHECKOUT_DISCOUNT_PERCENT,
          RewardValueType.CHECKOUT_DISCOUNT_FLAT
        ]
      }
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  });
  return rules.filter((r) => isRuleCurrentlyValid(r));
}

export const rewardRuleInputSchema = {
  code: (v: string) =>
    v
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_'),
  kinds: Object.values(RewardProgramKind),
  triggers: Object.values(RewardTrigger),
  beneficiaries: Object.values(RewardBeneficiary),
  valueTypes: Object.values(RewardValueType),
  appliesTo: Object.values(RewardAppliesTo)
};
