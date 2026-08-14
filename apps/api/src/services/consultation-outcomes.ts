import {
  ConsultationStatus,
  Prisma,
  ProviderPayoutStatus,
  SupportNoteCategory
} from '@prisma/client';
import { prisma } from '../db.js';
import {
  qualifyReferralAfterCompletedPaidCall,
  restoreReferralFreeCallAfterCancellation
} from './referral-codes.js';

export type SessionOutcomeStatus =
  'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

async function restorePackageSessionForOutcome(input: {
  consultationId: string;
  snapshot: Record<string, any>;
  reason: string;
}) {
  const usage = asRecord(input.snapshot['packageUsage']);
  const isPackageRedemption =
    String(input.snapshot['careTeamPricingRule'] || '').toUpperCase() === 'PACKAGE_REDEMPTION' ||
    String(usage['type'] || '').toUpperCase() === 'REDEMPTION';
  const packageConsultationId =
    String(
      input.snapshot['careTeamPackageConsultationId'] || usage['packageConsultationId'] || ''
    ) || null;
  if (!isPackageRedemption || !packageConsultationId) return false;

  const packageConsultation = await prisma.consultation.findUnique({
    where: { id: packageConsultationId },
    select: { id: true, pricingSnapshot: true }
  });
  const packageSnapshot = asRecord(packageConsultation?.pricingSnapshot);
  const packageUsage = asRecord(packageSnapshot['packageUsage']);
  if (!packageConsultation || !Object.keys(packageUsage).length) return false;

  const totalSessions = Math.max(1, Number(packageUsage['totalSessions'] || 1));
  const usedSessions = Math.max(0, Number(packageUsage['usedSessions'] || 0) - 1);
  const remainingSessions = Math.min(
    totalSessions,
    Math.max(0, Number(packageUsage['remainingSessions'] || 0) + 1)
  );
  const restoredAt = new Date().toISOString();
  const restorations = Array.isArray(packageSnapshot['outcomeRestorations'])
    ? packageSnapshot['outcomeRestorations']
    : [];
  await prisma.consultation.update({
    where: { id: packageConsultation.id },
    data: {
      pricingSnapshot: {
        ...packageSnapshot,
        packageUsage: {
          ...packageUsage,
          usedSessions,
          remainingSessions,
          lastRestoredAt: restoredAt,
          lastRestoredConsultationId: input.consultationId
        },
        outcomeRestorations: [
          ...restorations,
          {
            consultationId: input.consultationId,
            restoredAt,
            reason: input.reason
          }
        ]
      } as Prisma.InputJsonObject
    }
  });
  return true;
}

export async function applySessionOutcome(input: {
  consultationId: string;
  actorId: string;
  actorRole: string;
  outcome: SessionOutcomeStatus;
  privateNote?: string | null;
  userSummary?: string | null;
  recommendedNextStep?: string | null;
  restorePackageSession?: boolean;
  holdProviderPayout?: boolean;
}) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    include: {
      payment: { select: { id: true } },
      providerEarning: { select: { id: true, payoutStatus: true } }
    }
  });
  if (!consultation) return null;

  const snapshot = asRecord(consultation.pricingSnapshot);
  const restorePackage =
    input.restorePackageSession === true ||
    input.outcome === 'PROVIDER_NO_SHOW' ||
    input.outcome === 'RESCHEDULE_NEEDED';
  const packageRestored = restorePackage
    ? await restorePackageSessionForOutcome({
        consultationId: consultation.id,
        snapshot,
        reason: input.outcome
      })
    : false;

  const sessionOutcome = {
    outcome: input.outcome,
    closedAt: new Date().toISOString(),
    closedByUserId: input.actorId,
    closedByRole: input.actorRole,
    privateNote: input.privateNote || null,
    userSummary: input.userSummary || null,
    recommendedNextStep: input.recommendedNextStep || null,
    packageRestored,
    payoutAction:
      input.outcome === 'COMPLETED'
        ? 'KEEP_PENDING'
        : input.outcome === 'USER_MISSED' && !input.holdProviderPayout
          ? 'KEEP_PENDING'
          : 'HOLD'
  };

  const nextStatus =
    input.outcome === 'COMPLETED' || input.outcome === 'USER_MISSED'
      ? ConsultationStatus.COMPLETED
      : ConsultationStatus.CANCELLED;

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status: nextStatus,
      pricingSnapshot: {
        ...snapshot,
        sessionOutcome,
        packageUsage:
          packageRestored && asRecord(snapshot['packageUsage'])
            ? {
                ...asRecord(snapshot['packageUsage']),
                restoredToPackage: true,
                restoredByOutcome: input.outcome
              }
            : snapshot['packageUsage']
      } as Prisma.InputJsonObject
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true } },
      assignedDoctor: { select: { id: true, name: true } },
      disease: { select: { id: true, name: true } },
      payment: { select: { status: true, amountInPaise: true, lineItems: true } }
    }
  });

  if (consultation.payment?.id && sessionOutcome.payoutAction === 'HOLD') {
    await prisma.providerEarning.updateMany({
      where: {
        paymentId: consultation.payment.id,
        payoutStatus: { not: ProviderPayoutStatus.PAID }
      },
      data: {
        payoutStatus: ProviderPayoutStatus.HOLD,
        payoutNote: `Session outcome: ${input.outcome}`
      }
    });
  }

  const noteLines = [
    `Outcome: ${input.outcome}`,
    input.userSummary ? `User summary: ${input.userSummary}` : '',
    input.recommendedNextStep ? `Next step: ${input.recommendedNextStep}` : '',
    input.privateNote ? `Private note: ${input.privateNote}` : '',
    packageRestored ? 'Package session restored.' : ''
  ].filter(Boolean);
  await prisma.supportCaseNote.create({
    data: {
      patientId: consultation.patientId,
      consultationId: consultation.id,
      authorId: input.actorId,
      category: SupportNoteCategory.GENERAL,
      body: noteLines.join('\n')
    }
  });

  if (input.outcome === 'COMPLETED') {
    await qualifyReferralAfterCompletedPaidCall(consultation.id).catch((error) => {
      console.error('[referral] Could not qualify completed paid referral', error);
    });
  } else if (nextStatus === ConsultationStatus.CANCELLED) {
    await restoreReferralFreeCallAfterCancellation(consultation.id).catch((error) => {
      console.error('[referral] Could not restore cancelled free call', error);
    });
  }

  return { consultation: updated, sessionOutcome };
}
