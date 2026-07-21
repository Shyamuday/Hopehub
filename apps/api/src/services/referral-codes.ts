import { randomBytes } from 'node:crypto';
import { PatientReferralStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../db.js';

function normalizeReferralCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function uniqueCode(base: string) {
  let code = base.slice(0, 8);
  if (code.length < 4) code = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? code : `${code.slice(0, 4)}${randomBytes(2).toString('hex').toUpperCase()}`;
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
  const code = await uniqueCode(base);

  return prisma.patientReferralCode.create({
    data: { patientId, code }
  });
}

export async function attachReferralOnSignup(referredUserId: string, rawCode: string) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { attached: false as const, reason: 'INVALID_CODE' };

  const referralCode = await prisma.patientReferralCode.findFirst({
    where: { code, isActive: true },
    select: { id: true, patientId: true, code: true }
  });
  if (!referralCode) return { attached: false as const, reason: 'CODE_NOT_FOUND' };
  if (referralCode.patientId === referredUserId) return { attached: false as const, reason: 'SELF_REFERRAL' };

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
  const referrals = await prisma.patientReferral.findMany({
    where: { referrerId: patientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      referredUser: { select: { id: true, name: true, createdAt: true } }
    }
  });

  const stats = {
    total: referrals.length,
    registered: referrals.filter((r) => r.status === PatientReferralStatus.REGISTERED).length,
    qualified: referrals.filter((r) => r.status === PatientReferralStatus.QUALIFIED).length,
    rewarded: referrals.filter((r) => r.status === PatientReferralStatus.REWARDED).length
  };

  return { code: codeRecord.code, sharePath: `/login?ref=${codeRecord.code}`, stats, referrals };
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
