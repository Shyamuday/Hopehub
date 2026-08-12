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
    code: 'REF_REFERRER_BONUS',
    name: 'Referrer wallet bonus',
    description: 'Wallet credit to referrer when referred friend pays first consultation.',
    kind: RewardProgramKind.REFERRAL,
    trigger: RewardTrigger.FIRST_CONSULTATION_PAID,
    beneficiary: RewardBeneficiary.REFERRER,
    valueType: RewardValueType.WALLET_CREDIT_FLAT,
    valueAmount: 15_000,
    appliesTo: RewardAppliesTo.CONSULTATION,
    priority: 20,
    maxUsesPerPatient: null
  },
  {
    code: 'FIRSTTALK1_LISTENER_TEST',
    name: 'First Talk ₹1 listener test',
    description: 'Test coupon that lets patients book listener support for ₹1 any number of times.',
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
      providerCareTeamTypes: ['PEER_SUPPORT_VOLUNTEER', 'PSYCHOLOGY_STUDENT_VOLUNTEER']
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
        update: {
          name: rule.name,
          description: rule.description,
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
        },
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
