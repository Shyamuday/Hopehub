import { randomBytes } from 'node:crypto';
import {
  ConsultationStatus,
  PatientReferralStatus,
  PaymentStatus,
  Prisma,
  ReferralFreeCallRewardStatus
} from '@prisma/client';
import { prisma } from '../db.js';
import { notificationService } from './notification-service.js';

function normalizeReferralCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function uniqueCode(base: string) {
  let code = base.slice(0, 8);
  if (code.length < 4) code = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate =
      attempt === 0 ? code : `${code.slice(0, 4)}${randomBytes(2).toString('hex').toUpperCase()}`;
    const exists = await prisma.patientReferralCode.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;
  }
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function ensurePatientReferralCode(patientId: string) {
  const existing = await prisma.patientReferralCode.findUnique({ where: { patientId } });
  if (existing) return existing;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { patientCode: true, name: true }
  });
  const fromCode = patient?.patientCode ? normalizeReferralCode(patient.patientCode) : '';
  const fromName = patient?.name ? normalizeReferralCode(patient.name.replace(/\s+/g, '')) : '';
  const base = fromCode || fromName || 'HOPEHUB';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await uniqueCode(base);
    try {
      return await prisma.patientReferralCode.create({ data: { patientId, code } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const createdForPatient = await prisma.patientReferralCode.findUnique({
        where: { patientId }
      });
      if (createdForPatient) return createdForPatient;
    }
  }
  throw new Error('Could not create a unique referral code.');
}

export async function attachReferralOnSignup(referredUserId: string, rawCode: string) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { attached: false as const, reason: 'INVALID_CODE' };

  const referralCode = await prisma.patientReferralCode.findFirst({
    where: { code, isActive: true },
    select: { id: true, patientId: true, code: true }
  });
  if (!referralCode) return { attached: false as const, reason: 'CODE_NOT_FOUND' };
  if (referralCode.patientId === referredUserId)
    return { attached: false as const, reason: 'SELF_REFERRAL' };

  const referred = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { id: true, mobile: true, referredByUserId: true }
  });
  if (!referred) return { attached: false as const, reason: 'USER_NOT_FOUND' };
  if (referred.referredByUserId) return { attached: false as const, reason: 'ALREADY_REFERRED' };

  const referrer = await prisma.user.findUnique({
    where: { id: referralCode.patientId },
    select: { id: true, mobile: true }
  });
  if (referrer?.mobile && referred.mobile && referrer.mobile === referred.mobile) {
    return { attached: false as const, reason: 'SAME_MOBILE' };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: referredUserId },
      data: { referredByUserId: referralCode.patientId }
    }),
    prisma.patientReferral.create({
      data: {
        referrerId: referralCode.patientId,
        referredUserId,
        referralCodeId: referralCode.id,
        status: PatientReferralStatus.REGISTERED
      }
    })
  ]);

  return { attached: true as const, referrerId: referralCode.patientId, code: referralCode.code };
}

export async function getReferralSummary(patientId: string) {
  const codeRecord = await ensurePatientReferralCode(patientId);
  const [referrals, rewards, referralCounts] = await Promise.all([
    prisma.patientReferral.findMany({
      where: { referrerId: patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        createdAt: true,
        qualifiedAt: true,
        rewardedAt: true
      }
    }),
    prisma.referralFreeCallReward.findMany({
      where: { patientId },
      orderBy: { earnedAt: 'desc' }
    }),
    prisma.patientReferral.groupBy({
      by: ['status'],
      where: { referrerId: patientId },
      _count: { _all: true }
    })
  ]);

  const countFor = (status: PatientReferralStatus) =>
    referralCounts.find((item) => item.status === status)?._count._all ?? 0;
  const stats = {
    total: referralCounts.reduce((sum, item) => sum + item._count._all, 0),
    registered: countFor(PatientReferralStatus.REGISTERED),
    qualified: countFor(PatientReferralStatus.QUALIFIED),
    rewarded: countFor(PatientReferralStatus.REWARDED),
    rejected: countFor(PatientReferralStatus.REJECTED)
  };

  const qualifyingCount = stats.qualified + stats.rewarded;
  const progressInCurrentCycle = stats.qualified;
  return {
    code: codeRecord.code,
    sharePath: `/?ref=${codeRecord.code}`,
    requiredCompletedPaidCalls: 5,
    progressInCurrentCycle,
    qualifyingCount,
    availableFreeCalls: rewards.filter(
      (reward) => reward.status === ReferralFreeCallRewardStatus.AVAILABLE
    ).length,
    stats,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      cycle: reward.cycle,
      couponCode: reward.couponCode,
      status: reward.status,
      earnedAt: reward.earnedAt,
      redeemedAt: reward.redeemedAt
    })),
    referrals: referrals.map((referral) => ({
      id: referral.id,
      status: referral.status,
      createdAt: referral.createdAt,
      qualifiedAt: referral.qualifiedAt,
      rewardedAt: referral.rewardedAt,
      friendLabel: 'Referred friend'
    })),
    terms: REFERRAL_FREE_CALL_TERMS
  };
}

export async function isActivePatientReferralCode(rawCode: string) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;
  return Boolean(
    await prisma.patientReferralCode.findFirst({
      where: { code, isActive: true },
      select: { id: true }
    })
  );
}

export const REFERRAL_FREE_CALL_TERMS = [
  'Share your personal referral code with a new Hope Hub user. The code must be added when the new account is created.',
  'A referral qualifies only after that person completes their first paid 1:1 call with an amount greater than ₹0.',
  'Cancelled, missed, refunded, fully free, test, or promotional-zero-payment sessions do not qualify.',
  'Each referred person can qualify only once, and five different qualified people are required.',
  'Every five qualified referrals unlock one single-use free-call coupon for one eligible standard listener session; packages, group sessions, and professional-care sessions are excluded.',
  'The free listener session may use chat, voice, or video only when the selected listener supports that mode.',
  'If a free-call booking is cancelled before completion, its unused coupon is restored automatically.',
  'A completed or missed free-call booking is treated as used and cannot be exchanged for another reward.',
  'Referral and free-call coupons are personal, non-transferable, have no cash value, and remain subject to listener availability.',
  'Self-referrals, duplicate accounts, shared contact details, automated signups, or suspected misuse may be rejected or rewards revoked.',
  'Hope Hub may pause or amend the referral program for future referrals; already valid rewards remain subject to these terms and the general booking, cancellation, privacy, and safety policies.'
] as const;

function freeCallCouponCode(referralCode: string, cycle: number) {
  return `FREE-${referralCode}-${cycle}`.slice(0, 32);
}

async function awardQualifiedReferralGroups(
  tx: Prisma.TransactionClient,
  referrerId: string,
  referralCode: string
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${referrerId}))`;
  const qualified = await tx.patientReferral.findMany({
    where: { referrerId, status: PatientReferralStatus.QUALIFIED },
    orderBy: [{ qualifiedAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true }
  });
  if (qualified.length < 5) return [];

  const latestReward = await tx.referralFreeCallReward.aggregate({
    where: { patientId: referrerId },
    _max: { cycle: true }
  });
  const latestCycle = latestReward._max.cycle ?? 0;
  const groups = Math.floor(qualified.length / 5);
  const awarded: Array<{ id: string; couponCode: string }> = [];
  for (let index = 0; index < groups; index += 1) {
    const cycle = latestCycle + index + 1;
    const referralIds = qualified.slice(index * 5, index * 5 + 5).map((item) => item.id);
    const reward = await tx.referralFreeCallReward.create({
      data: {
        patientId: referrerId,
        cycle,
        couponCode: freeCallCouponCode(referralCode, cycle),
        qualifyingReferralCount: referralIds.length,
        qualifyingReferralIds: referralIds
      }
    });
    awarded.push({ id: reward.id, couponCode: reward.couponCode });
    await tx.patientReferral.updateMany({
      where: { id: { in: referralIds }, status: PatientReferralStatus.QUALIFIED },
      data: {
        status: PatientReferralStatus.REWARDED,
        rewardedAt: reward.earnedAt
      }
    });
  }
  return awarded;
}

function referralIdsFromReward(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export async function reconcileReferralAfterConsultationRefund(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { patientId: true, payment: { select: { status: true, refundedAmountInPaise: true } } }
  });
  if (!consultation?.payment || consultation.payment.refundedAmountInPaise <= 0) {
    return { changed: false as const };
  }

  return prisma.$transaction(async (tx) => {
    const referral = await tx.patientReferral.findUnique({
      where: { referredUserId: consultation.patientId },
      include: { referralCode: { select: { code: true } } }
    });
    if (
      !referral ||
      referral.status === PatientReferralStatus.REGISTERED ||
      referral.status === PatientReferralStatus.REJECTED
    ) {
      return { changed: false as const };
    }

    if (referral.status === PatientReferralStatus.QUALIFIED) {
      await tx.patientReferral.update({
        where: { id: referral.id },
        data: { status: PatientReferralStatus.REGISTERED, qualifiedAt: null, rewardedAt: null }
      });
      return { changed: true as const, rewardRevoked: false as const };
    }

    const rewards = await tx.referralFreeCallReward.findMany({
      where: { patientId: referral.referrerId },
      orderBy: { earnedAt: 'desc' }
    });
    const reward = rewards.find((item) =>
      referralIdsFromReward(item.qualifyingReferralIds).includes(referral.id)
    );

    if (!reward || reward.status === ReferralFreeCallRewardStatus.REDEEMED) {
      // A completed free call cannot be reversed. Keep its audit record and reject
      // this referral so it can never qualify toward another reward.
      await tx.patientReferral.update({
        where: { id: referral.id },
        data: { status: PatientReferralStatus.REJECTED, qualifiedAt: null }
      });
      return { changed: true as const, rewardRevoked: false as const };
    }

    const groupedReferralIds = referralIdsFromReward(reward.qualifyingReferralIds);
    await tx.referralFreeCallReward.update({
      where: { id: reward.id },
      data: { status: ReferralFreeCallRewardStatus.REVOKED }
    });
    await tx.patientReferral.updateMany({
      where: {
        id: { in: groupedReferralIds.filter((id) => id !== referral.id) },
        status: PatientReferralStatus.REWARDED
      },
      data: { status: PatientReferralStatus.QUALIFIED, rewardedAt: null }
    });
    await tx.patientReferral.update({
      where: { id: referral.id },
      data: { status: PatientReferralStatus.REGISTERED, qualifiedAt: null, rewardedAt: null }
    });
    await awardQualifiedReferralGroups(tx, referral.referrerId, referral.referralCode.code);
    return { changed: true as const, rewardRevoked: true as const };
  });
}

export async function qualifyReferralAfterCompletedPaidCall(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      status: true,
      patientId: true,
      payment: { select: { status: true, amountInPaise: true } }
    }
  });
  if (
    !consultation ||
    consultation.status !== ConsultationStatus.COMPLETED ||
    consultation.payment?.status !== PaymentStatus.PAID ||
    consultation.payment.amountInPaise <= 0
  ) {
    return { qualified: false as const };
  }

  const result = await prisma.$transaction(async (tx) => {
    const referral = await tx.patientReferral.findUnique({
      where: { referredUserId: consultation.patientId },
      include: { referralCode: { select: { code: true } } }
    });
    if (!referral || referral.status !== PatientReferralStatus.REGISTERED) {
      return { qualified: false as const };
    }
    const updated = await tx.patientReferral.updateMany({
      where: { id: referral.id, status: PatientReferralStatus.REGISTERED },
      data: { status: PatientReferralStatus.QUALIFIED, qualifiedAt: new Date() }
    });
    if (!updated.count) return { qualified: false as const };
    const rewards = await awardQualifiedReferralGroups(
      tx,
      referral.referrerId,
      referral.referralCode.code
    );
    return { qualified: true as const, referrerId: referral.referrerId, rewards };
  });
  if (result.qualified && result.rewards.length) {
    await notificationService
      .sendBatch(
        result.rewards.map((reward) => ({
          eventType: 'REFERRAL_REWARD_EARNED' as const,
          channel: 'IN_APP' as const,
          recipientId: result.referrerId,
          title: 'Your free listener call is ready',
          body: `Five friends completed a paid call. Use ${reward.couponCode} at listener checkout.`,
          metadata: { rewardId: reward.id, couponCode: reward.couponCode, route: '/profile' }
        }))
      )
      .catch((error) => console.error('[referral] Could not send reward notification', error));
  }
  return result;
}

export async function findAvailableReferralFreeCall(patientId: string, rawCode?: string | null) {
  const couponCode = rawCode?.trim().toUpperCase();
  if (!couponCode) return null;
  return prisma.referralFreeCallReward.findFirst({
    where: {
      patientId,
      couponCode,
      status: ReferralFreeCallRewardStatus.AVAILABLE
    }
  });
}

export async function redeemReferralFreeCall(
  tx: Prisma.TransactionClient,
  input: { rewardId: string; patientId: string; consultationId: string }
) {
  const claimed = await tx.referralFreeCallReward.updateMany({
    where: {
      id: input.rewardId,
      patientId: input.patientId,
      status: ReferralFreeCallRewardStatus.AVAILABLE
    },
    data: {
      status: ReferralFreeCallRewardStatus.REDEEMED,
      redeemedAt: new Date(),
      redeemedConsultationId: input.consultationId
    }
  });
  if (!claimed.count) throw new Error('REFERRAL_FREE_CALL_ALREADY_USED');
}

export async function restoreReferralFreeCallAfterCancellation(consultationId: string) {
  const restored = await prisma.referralFreeCallReward.updateMany({
    where: {
      redeemedConsultationId: consultationId,
      status: ReferralFreeCallRewardStatus.REDEEMED
    },
    data: {
      status: ReferralFreeCallRewardStatus.AVAILABLE,
      redeemedAt: null,
      redeemedConsultationId: null
    }
  });
  return { restored: restored.count > 0 };
}

export async function countPaidConsultations(patientId: string) {
  return prisma.payment.count({
    where: {
      status: PaymentStatus.PAID,
      consultation: { patientId }
    }
  });
}

export async function isFirstPaidConsultation(patientId: string) {
  const count = await countPaidConsultations(patientId);
  return count === 0;
}
