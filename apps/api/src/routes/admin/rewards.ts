import { Router } from 'express';
import { z } from 'zod';
import {
  Prisma,
  RewardAppliesTo,
  RewardBeneficiary,
  RewardProgramKind,
  RewardTrigger,
  RewardValueType,
  Role
} from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import { ensureDefaultRewardRules } from '../../services/reward-rules.js';
import { creditWallet, debitWallet, listWalletLedger } from '../../services/patient-wallet.js';

const ruleSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  kind: z.nativeEnum(RewardProgramKind),
  trigger: z.nativeEnum(RewardTrigger),
  beneficiary: z.nativeEnum(RewardBeneficiary),
  valueType: z.nativeEnum(RewardValueType),
  valueAmount: z.number().int().min(0),
  appliesTo: z.nativeEnum(RewardAppliesTo).default(RewardAppliesTo.CONSULTATION),
  promoCode: z.string().min(2).max(32).optional().nullable(),
  maxUsesPerPatient: z.number().int().positive().optional().nullable(),
  maxUsesGlobal: z.number().int().positive().optional().nullable(),
  maxDiscountInPaise: z.number().int().positive().optional().nullable(),
  minOrderInPaise: z.number().int().min(0).optional().nullable(),
  minPayableInPaise: z.number().int().min(1).default(100),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
  conditions: z.record(z.string(), z.unknown()).optional().nullable()
});

function buildRuleUpdateData(
  parsed: Partial<z.infer<typeof ruleSchema>>
): Prisma.RewardProgramRuleUpdateInput {
  const data: Prisma.RewardProgramRuleUpdateInput = {};
  if (parsed.code !== undefined)
    data.code = parsed.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.kind !== undefined) data.kind = parsed.kind;
  if (parsed.trigger !== undefined) data.trigger = parsed.trigger;
  if (parsed.beneficiary !== undefined) data.beneficiary = parsed.beneficiary;
  if (parsed.valueType !== undefined) data.valueType = parsed.valueType;
  if (parsed.valueAmount !== undefined) data.valueAmount = parsed.valueAmount;
  if (parsed.appliesTo !== undefined) data.appliesTo = parsed.appliesTo;
  if (parsed.promoCode !== undefined)
    data.promoCode = parsed.promoCode?.trim().toUpperCase() || null;
  if (parsed.maxUsesPerPatient !== undefined) data.maxUsesPerPatient = parsed.maxUsesPerPatient;
  if (parsed.maxUsesGlobal !== undefined) data.maxUsesGlobal = parsed.maxUsesGlobal;
  if (parsed.maxDiscountInPaise !== undefined) data.maxDiscountInPaise = parsed.maxDiscountInPaise;
  if (parsed.minOrderInPaise !== undefined) data.minOrderInPaise = parsed.minOrderInPaise;
  if (parsed.minPayableInPaise !== undefined) data.minPayableInPaise = parsed.minPayableInPaise;
  if (parsed.validFrom !== undefined)
    data.validFrom = parsed.validFrom ? new Date(parsed.validFrom) : null;
  if (parsed.validUntil !== undefined)
    data.validUntil = parsed.validUntil ? new Date(parsed.validUntil) : null;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
  if (parsed.priority !== undefined) data.priority = parsed.priority;
  if (parsed.conditions !== undefined)
    data.conditions = (parsed.conditions ?? null) as Prisma.InputJsonValue;
  return data;
}

function normalizeRuleBody(body: z.infer<typeof ruleSchema>) {
  return {
    ...body,
    code: body.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_'),
    promoCode: body.promoCode?.trim().toUpperCase() || null,
    description: body.description ?? null,
    validFrom: body.validFrom ? new Date(body.validFrom) : null,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    conditions: (body.conditions ?? undefined) as Prisma.InputJsonValue | undefined
  };
}

export function registerAdminRewardsRoutes(router: Router) {
  router.get(
    '/admin/rewards/rules',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      await ensureDefaultRewardRules();
      const rules = await prisma.rewardProgramRule.findMany({
        orderBy: [{ priority: 'desc' }, { code: 'asc' }]
      });
      res.json({ rules });
    })
  );

  router.post(
    '/admin/rewards/rules',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = normalizeRuleBody(ruleSchema.parse(req.body));
      const rule = await prisma.rewardProgramRule.create({
        data: body as Prisma.RewardProgramRuleCreateInput
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'rewards.rule.create',
        targetType: 'reward_rule',
        targetId: rule.id,
        summary: `Reward rule ${rule.code} created.`
      });
      res.status(201).json({ rule });
    })
  );

  router.patch(
    '/admin/rewards/rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const parsed = ruleSchema.partial().parse(req.body);
      const rule = await prisma.rewardProgramRule.update({
        where: { id },
        data: buildRuleUpdateData(parsed)
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'rewards.rule.update',
        targetType: 'reward_rule',
        targetId: id,
        summary: `Reward rule ${rule.code} updated.`
      });
      res.json({ rule });
    })
  );

  router.delete(
    '/admin/rewards/rules/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.rewardProgramRule.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'rewards.rule.delete',
        targetType: 'reward_rule',
        targetId: id,
        summary: 'Reward rule deleted.'
      });
      res.json({ message: 'Rule deleted.' });
    })
  );

  router.get(
    '/admin/rewards/referrals',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const take = Math.min(Number(req.query['limit'] || 50), 200);
      const [referrals, freeCallRewards] = await Promise.all([
        prisma.patientReferral.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          include: {
            referrer: { select: { id: true, name: true, mobile: true } },
            referredUser: { select: { id: true, name: true, mobile: true, createdAt: true } },
            referralCode: { select: { code: true } }
          }
        }),
        prisma.referralFreeCallReward.findMany({
          orderBy: { earnedAt: 'desc' },
          take,
          include: {
            patient: { select: { id: true, name: true, mobile: true } }
          }
        })
      ]);
      res.json({ referrals, freeCallRewards });
    })
  );

  router.post(
    '/admin/rewards/wallet/:patientId/adjust',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      const body = z
        .object({
          direction: z.enum(['CREDIT', 'DEBIT']),
          amountInPaise: z.number().int().positive(),
          note: z.string().min(3).max(200)
        })
        .parse(req.body);

      const patient = await prisma.user.findFirst({
        where: { id: patientId, role: Role.PATIENT },
        select: { id: true }
      });
      if (!patient) return res.status(404).json({ message: 'Patient not found.' });

      const result =
        body.direction === 'CREDIT'
          ? await creditWallet({
              patientId,
              amountInPaise: body.amountInPaise,
              sourceType: 'ADMIN_ADJUST',
              note: body.note
            })
          : await debitWallet({
              patientId,
              amountInPaise: body.amountInPaise,
              sourceType: 'ADMIN_ADJUST',
              note: body.note
            });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'rewards.wallet.adjust',
        targetType: 'patient_wallet',
        targetId: patientId,
        summary: `${body.direction} ₹${(body.amountInPaise / 100).toFixed(2)} — ${body.note}`
      });

      res.json({ balanceInPaise: result.balanceAfter, entry: result.entry });
    })
  );

  router.get(
    '/admin/rewards/wallet/:patientId',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      const ledger = await listWalletLedger(patientId, 100);
      const wallet = await prisma.patientWallet.findUnique({ where: { patientId } });
      res.json({ balanceInPaise: wallet?.balanceInPaise ?? 0, ledger });
    })
  );
}
